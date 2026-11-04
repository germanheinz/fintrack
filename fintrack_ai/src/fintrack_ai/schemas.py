"""Request and response models. They match the backend contract (camelCase JSON)."""

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    # protected_namespaces: the contract has a "modelVersion" field.
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, protected_namespaces=())


class ReceiptItem(ApiModel):
    position: int
    raw_name: str = Field(max_length=255)
    quantity: Decimal | None = None
    line_total: Decimal


class CategorizationRequest(ApiModel):
    user_id: UUID
    receipt_id: UUID
    merchant: str = Field(max_length=500)
    items: list[ReceiptItem] = Field(min_length=1, max_length=200)
    # The only names the model may answer with.
    item_categories: list[str] = Field(min_length=1, max_length=100)


class CategorizedItem(ApiModel):
    position: int
    item_category: str
    confidence: float


class CategorizationResponse(ApiModel):
    items: list[CategorizedItem]
    model: str
    model_version: str
