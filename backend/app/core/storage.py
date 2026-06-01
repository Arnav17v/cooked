"""S3-compatible object storage (Cloudflare R2, Backblaze B2, MinIO, …).

PDF blob storage only. Frontend never uploads here directly — FastAPI proxies
everything (D-011). When ``RAW_TEXT_RETENTION_ENABLED`` is true, objects older than
the retention window are deleted by the APScheduler sweep (D-015 / D-017).

Settings use env prefix `R2_*` for historical reasons; any S3-compat endpoint works.

`file_url` on `resumes` stores the **object key** (e.g. `uploads/<uuid>.pdf`),
not a public HTTPS URL.
"""

from __future__ import annotations

import hashlib
import logging
import uuid
from io import BytesIO
from contextlib import suppress
from functools import lru_cache
from typing import Any
from urllib.parse import urlparse

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import get_settings

log = logging.getLogger(__name__)

# Backblaze-only `before-send.s3.PutObject` hooks (normalize request + wiretap); per client.
_b2_put_hooks_registered: set[int] = set()


def _hdr(hdrs: Any, key: str) -> str | None:
    want = key.lower()
    for k in hdrs:
        ks = k.decode() if isinstance(k, bytes) else str(k)
        if ks.lower() != want:
            continue
        v = hdrs[k]
        if isinstance(v, bytes):
            return v.decode()
        return str(v)
    return None


def _header_names(hdrs: Any) -> list[str]:
    names: list[str] = []
    for k in hdrs:
        if isinstance(k, bytes):
            names.append(k.decode())
        else:
            names.append(str(k))
    return sorted(names)


def _body_smoke_info(body: Any) -> str:
    if body is None:
        return "none"
    if isinstance(body, (bytes, bytearray)):
        return f"bytes len={len(body)}"
    if hasattr(body, "seek") and hasattr(body, "tell"):
        try:
            pos = body.tell()
            body.seek(0, 2)
            ln = body.tell()
            body.seek(pos)
            return f"{type(body).__name__} len={ln} tell_before_log={pos}"
        except OSError:
            pass
    return type(body).__name__


def _put_object_wiretap(request: Any, **_kw: Any) -> None:
    """Log wire-level PutObject facts (no secrets; Authorization omitted)."""
    try:
        hdrs = request.headers
        names = _header_names(hdrs)
        checksum_headers = [n for n in names if n.lower().startswith("x-amz-checksum")]

        log.info(
            "storage.http_wiretap PutObject method=%s url=%s body=%s "
            "Content-Length=%r Transfer-Encoding=%r Content-Encoding=%r Expect=%r "
            "X-Amz-Content-Sha256=%r X-Amz-Decoded-Content-Length=%r X-Amz-Trailer=%r "
            "SSE=%r checksum_hdrs=%r all_header_names=%s",
            getattr(request, "method", "?"),
            getattr(request, "url", "?"),
            _body_smoke_info(request.body),
            _hdr(hdrs, "Content-Length"),
            _hdr(hdrs, "Transfer-Encoding"),
            _hdr(hdrs, "Content-Encoding"),
            _hdr(hdrs, "Expect"),
            _hdr(hdrs, "X-Amz-Content-Sha256"),
            _hdr(hdrs, "X-Amz-Decoded-Content-Length"),
            _hdr(hdrs, "X-Amz-Trailer"),
            _hdr(hdrs, "X-Amz-Server-Side-Encryption"),
            checksum_headers,
            names,
        )
    except Exception:
        log.exception("storage.http_wiretap failed")


def _hdr_del(hdrs: Any, lower_name: str) -> None:
    to_drop = [
        k
        for k in hdrs
        if (k.decode() if isinstance(k, bytes) else str(k)).lower() == lower_name
    ]
    for k in to_drop:
        with suppress(KeyError):
            del hdrs[k]


def _b2_normalize_put_object_before_send(request: Any, **_kw: Any) -> None:
    """Backblaze B2 PutObject compatibility before urllib3 sends the request.

    1. Drop ``Expect: 100-continue`` (botocore adds it for streaming-shaped bodies).
    2. Coalesce a file-like ``request.body`` to ``bytes``. urllib3's ``AWSConnection``
       merges **bytes** bodies into the first TCP chunk; file-like bodies use a second
       ``send()`` that B2 often answers with ``IncompleteBody`` even without Expect.
    """
    url = (getattr(request, "url", None) or "").lower()
    if "backblazeb2.com" not in url:
        return
    hdrs = request.headers
    _hdr_del(hdrs, "expect")

    body = getattr(request, "body", None)
    if body is None or isinstance(body, (bytes, bytearray)):
        return
    if not hasattr(body, "read"):
        return
    try:
        if hasattr(body, "seek"):
            body.seek(0)
        raw = body.read()
    except OSError:
        log.exception("storage.b2_normalize_put_object_read_failed")
        return
    request.body = bytes(raw)
    _hdr_del(hdrs, "content-length")
    hdrs["Content-Length"] = str(len(request.body))
    log.info(
        "storage.b2_normalize_put_object body=file_like_to_bytes len=%s",
        len(request.body),
    )


def _ensure_b2_put_before_send_hooks(client: Any) -> None:
    cid = id(client)
    if cid in _b2_put_hooks_registered:
        return
    _b2_put_hooks_registered.add(cid)
    client.meta.events.register_first(
        "before-send.s3.PutObject",
        _b2_normalize_put_object_before_send,
        unique_id="cooked.b2_put_normalize",
    )
    client.meta.events.register(
        "before-send.s3.PutObject",
        _put_object_wiretap,
    )


def _endpoint_netloc(endpoint: str | None) -> str:
    if not endpoint:
        return ""
    try:
        return urlparse(endpoint).netloc or endpoint
    except ValueError:
        return "<invalid-endpoint-url>"


def _endpoint_is_backblaze(endpoint: str | None) -> bool:
    return bool(endpoint and "backblazeb2.com" in endpoint.lower())


def _boto_config_for_endpoint(endpoint: str | None) -> Config | None:
    """Backblaze B2 quirks vs boto3 1.43+ botocore:

    - **Virtual-hosted** URLs (`bucket.s3.region.backblazeb2.com`) — path-style PUTs
      still returned ``IncompleteBody`` even with normalized bodies in testing.
    - ``inject_host_prefix=False`` avoids stray host-prefix mutation with custom endpoints.
    - ``when_required`` avoids flexible checksum headers/trailers B2 mishandles.
    - PutObject uses streaming-shaped bodies internally → ``before-send`` hook strips
      ``Expect`` and coerces body to ``bytes`` (see ``_b2_normalize_put_object_before_send``).
    - Do **not** use ``payload_signing_enabled=False``: B2 returns
      ``SignatureDoesNotMatch`` for UNSIGNED-PAYLOAD on PutObject.
    """
    if not _endpoint_is_backblaze(endpoint):
        return None
    return Config(
        signature_version="s3v4",
        inject_host_prefix=False,
        s3={"addressing_style": "virtual"},
        request_checksum_calculation="when_required",
    )


@lru_cache
def get_r2_client() -> Any:
    settings = get_settings()
    if not (
        settings.r2_access_key_id
        and settings.r2_secret_access_key
        and settings.r2_endpoint
    ):
        log.warning("R2 not configured — storage operations will fail until env is set")
    kwargs: dict[str, Any] = {
        "endpoint_url": settings.r2_endpoint,
        "aws_access_key_id": settings.r2_access_key_id,
        "aws_secret_access_key": settings.r2_secret_access_key,
        "region_name": settings.r2_region,
    }
    cfg = _boto_config_for_endpoint(settings.r2_endpoint)
    if cfg is not None:
        kwargs["config"] = cfg
    client = boto3.client("s3", **kwargs)
    if _endpoint_is_backblaze(settings.r2_endpoint):
        _ensure_b2_put_before_send_hooks(client)
    return client


def r2_configured() -> bool:
    s = get_settings()
    return bool(
        s.r2_access_key_id and s.r2_secret_access_key and s.r2_endpoint and s.r2_bucket
    )


def resume_pdf_object_key(resume_id: uuid.UUID) -> str:
    return f"uploads/{resume_id}.pdf"


def upload_resume_pdf(*, resume_id: uuid.UUID, data: bytes, content_type: str) -> str:
    """Upload PDF bytes to R2/B2. Returns the object key stored on `resumes.file_url`.

    Backblaze: on ``IncompleteBody``, retries without the SSE header (common B2 + boto fix).
    """
    if not r2_configured():
        raise RuntimeError("R2 is not configured — set R2_* env vars")
    settings = get_settings()
    key = resume_pdf_object_key(resume_id)
    client = get_r2_client()
    n = len(data)
    pdf_magic = data[:5] == b"%PDF-"
    digest16 = hashlib.sha256(data).hexdigest()[:16]
    is_b2 = _endpoint_is_backblaze(settings.r2_endpoint)
    body: bytes = data
    base_put: dict[str, Any] = {
        "Bucket": settings.r2_bucket,
        "Key": key,
        "Body": body,
        "ContentType": content_type or "application/pdf",
    }

    attempts: list[tuple[str, dict[str, Any] | None]] = []
    if is_b2 and settings.r2_b2_put_sse_aes256:
        d1 = dict(base_put)
        d1["ServerSideEncryption"] = "AES256"
        attempts.append(("b2_put_sse_aes256", d1))
    attempts.append(("put_no_sse_header", dict(base_put)))
    if is_b2:
        attempts.append(("b2_upload_fileobj", None))

    last_exc: ClientError | None = None
    for i, (label, put_kw) in enumerate(attempts):
        log.info(
            "storage.upload_smoke resume_id=%s endpoint_host=%s region=%s bucket=%s key=%s "
            "bytes=%s pdf_magic_ok=%s sha256_16=%s backblaze=%s attempt=%s content_type=%s "
            "body_kind=%s put_extra_keys=%s",
            resume_id,
            _endpoint_netloc(settings.r2_endpoint),
            settings.r2_region,
            settings.r2_bucket,
            key,
            n,
            pdf_magic,
            digest16,
            is_b2,
            label,
            content_type or "application/pdf",
            type(body).__name__,
            sorted(k for k in put_kw if k is not None and k not in ("Bucket", "Key", "Body", "ContentType")),
        )
        try:
            if put_kw is None:
                extra: dict[str, Any] = {"ContentType": content_type or "application/pdf"}
                client.upload_fileobj(
                    BytesIO(body),
                    settings.r2_bucket,
                    key,
                    ExtraArgs=extra,
                )
            else:
                client.put_object(**put_kw)
        except ClientError as e:
            err = e.response.get("Error", {}) if hasattr(e, "response") else {}
            code = err.get("Code")
            last_exc = e
            if (
                code == "IncompleteBody"
                and is_b2
                and i < len(attempts) - 1
            ):
                log.warning(
                    "storage B2 PutObject IncompleteBody (%s) — retrying next strategy",
                    label,
                )
                continue
            raise
        log.info(
            "storage.upload_smoke resume_id=%s put_object returned OK key=%s attempt=%s",
            resume_id,
            key,
            label,
        )
        return key

    if last_exc:
        raise last_exc
    raise RuntimeError("upload_resume_pdf: no attempts configured")


def delete_object_key(key: str | None) -> None:
    """Best-effort delete; logs and swallows NotFound."""
    if not key or not r2_configured():
        return
    settings = get_settings()
    client = get_r2_client()
    try:
        client.delete_object(Bucket=settings.r2_bucket, Key=key)
    except ClientError as e:
        log.warning("R2 delete failed for key=%s: %s", key, e)
