"""Settings come from environment variables, never from files in the repository."""

import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Settings:
    internal_token: str
    anthropic_api_key: str
    model: str


@lru_cache
def get_settings() -> Settings:
    token = os.environ.get("FINTRACK_AI_TOKEN", "")
    if not token:
        raise RuntimeError("FINTRACK_AI_TOKEN is not set")
    return Settings(
        internal_token=token,
        anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
        model=os.environ.get("FINTRACK_AI_MODEL", "claude-haiku-4-5"),
    )
