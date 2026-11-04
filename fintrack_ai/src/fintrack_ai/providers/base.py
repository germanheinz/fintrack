"""The categorizer depends on this protocol. A vendor is one implementation of it."""

from dataclasses import dataclass
from typing import Protocol

from fintrack_ai.schemas import ReceiptItem


class ProviderError(Exception):
    """The model provider failed or returned something unusable."""


@dataclass(frozen=True)
class RawAnswer:
    position: int
    category: str
    confidence: float


class LlmProvider(Protocol):
    model: str

    async def classify(
        self, merchant: str, items: list[ReceiptItem], categories: list[str]
    ) -> list[RawAnswer]: ...
