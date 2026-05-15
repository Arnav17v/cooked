"""Optional / required Bearer Clerk JWT."""

from __future__ import annotations

from fastapi import Header, HTTPException, status

from app.core.config import get_settings
from app.services.auth.clerk_jwt import clerk_subject_from_bearer_token

_CLERK_ISSUER_MISSING = (
    "Backend env CLERK_JWT_ISSUER is not set — JWT verification cannot run. "
    "Set it to your Clerk JWT issuer (Dashboard → API Keys → «Frontend API URL» / "
    "JWT `iss` claim, no trailing slash), then restart the API. "
    "Until then, GET /api/v1/me/roasts stays 401 while signed in."
)


def optional_clerk_subject(
    authorization: str | None = Header(default=None),
) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    tok = authorization[7:].strip()
    return clerk_subject_from_bearer_token(tok) if tok else None


def require_clerk_subject(
    authorization: str | None = Header(default=None),
) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in required",
        )
    tok = authorization[7:].strip()
    issuer = (get_settings().clerk_jwt_issuer or "").strip()
    if not issuer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_CLERK_ISSUER_MISSING,
        )
    sub = clerk_subject_from_bearer_token(tok) if tok else None
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or stale session token",
        )
    return sub
