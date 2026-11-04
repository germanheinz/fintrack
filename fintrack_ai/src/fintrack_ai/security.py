"""Only the backend may call this service. It sends a shared secret in a header."""

import hmac

from fastapi import Depends, Header, HTTPException

from fintrack_ai.config import Settings, get_settings


def verify_token(
    x_internal_token: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    if not x_internal_token or not hmac.compare_digest(
        x_internal_token.encode(), settings.internal_token.encode()
    ):
        raise HTTPException(status_code=401, detail="Invalid internal token")
