"""Decode Clerk JWT `sub` for linking roasts to a stable user row."""

from __future__ import annotations

import logging

import jwt
from jwt import PyJWKClient

from app.core.config import get_settings

log = logging.getLogger(__name__)

_jwk_cache: dict[str, PyJWKClient] = {}


def _jwks_client(issuer: str) -> PyJWKClient:
    base = issuer.rstrip("/")
    if base not in _jwk_cache:
        _jwk_cache[base] = PyJWKClient(f"{base}/.well-known/jwks.json")
    return _jwk_cache[base]


def clerk_subject_from_bearer_token(token: str) -> str | None:
    issuer = (get_settings().clerk_jwt_issuer or "").strip()
    if not issuer or not token.strip():
        return None
    issuer_norm = issuer.rstrip("/")
    try:
        jwk_client = _jwks_client(issuer_norm)
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token.strip(),
            signing_key.key,
            algorithms=["RS256"],
            issuer=issuer_norm,
            options={"verify_aud": False},
            leeway=30,
        )
    except jwt.PyJWTError as e:
        log.warning("clerk JWT invalid: %s", e)
        return None

    sub = payload.get("sub")
    if isinstance(sub, str) and sub:
        return sub
    return None
