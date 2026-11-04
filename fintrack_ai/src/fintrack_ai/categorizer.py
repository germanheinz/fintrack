"""Turns the raw model answers into a safe response. The model output is never trusted."""

from fintrack_ai.providers.base import RawAnswer
from fintrack_ai.schemas import CategorizationRequest, CategorizationResponse, CategorizedItem

FALLBACK = "Otros"
MODEL_VERSION = "1"


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def build_response(
    request: CategorizationRequest, answers: list[RawAnswer], model: str
) -> CategorizationResponse:
    allowed = {name.casefold(): name for name in request.item_categories}
    fallback = allowed.get(FALLBACK.casefold(), FALLBACK)
    by_position = {answer.position: answer for answer in answers}

    items = []
    for item in request.items:
        answer = by_position.get(item.position)
        category = allowed.get(answer.category.casefold()) if answer else None
        if answer is None or category is None:
            # Missing or invented answer: confidence 0 sends the receipt to human review.
            items.append(CategorizedItem(position=item.position, item_category=fallback, confidence=0.0))
        else:
            items.append(
                CategorizedItem(
                    position=item.position, item_category=category, confidence=_clamp(answer.confidence)
                )
            )

    return CategorizationResponse(items=items, model=model, model_version=MODEL_VERSION)
