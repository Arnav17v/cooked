"""Auth wiring — Clerk JWT verification.

Wired up at Step 6 of the build order. v1's core loop deliberately runs
without auth so the share URL stays public. Until Step 6 ships, this module
exposes a no-op `get_current_user_id` that returns a stable anonymous-ish id
derived from the IP, so rate-limiting still works in pre-auth dev.
"""

from __future__ import annotations

import hashlib

from fastapi import Request


def get_current_user_id(request: Request) -> str:
    """Stub until Clerk lands at Step 6.

    Returns a deterministic hash of the client IP so we can rate-limit
    pre-auth users without exposing the raw address.
    """
    ip = request.client.host if request.client else "unknown"
    return "anon-" + hashlib.sha256(ip.encode()).hexdigest()[:16]
