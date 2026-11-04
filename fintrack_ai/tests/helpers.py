from decimal import Decimal
from uuid import uuid4

from fintrack_ai.providers.base import ProviderError, RawAnswer
from fintrack_ai.schemas import CategorizationRequest, ReceiptItem

CATEGORIES = ["Huevos", "Lácteos", "Bebidas sin alcohol", "Otros"]


class FakeProvider:
    """Returns fixed answers, or fails. No network."""

    model = "fake-model"

    def __init__(self, answers: list[RawAnswer] | None = None, error: Exception | None = None) -> None:
        self.answers = answers or []
        self.error = error
        self.calls = 0

    async def classify(self, merchant, items, categories):
        self.calls += 1
        if self.error:
            raise self.error
        return self.answers


def make_request(*names: str, categories: list[str] | None = None) -> CategorizationRequest:
    return CategorizationRequest(
        user_id=uuid4(),
        receipt_id=uuid4(),
        merchant="Mercadona",
        items=[
            ReceiptItem(position=i, raw_name=name, line_total=Decimal("1.00")) for i, name in enumerate(names)
        ],
        item_categories=categories or CATEGORIES,
    )


__all__ = ["CATEGORIES", "FakeProvider", "ProviderError", "make_request"]
