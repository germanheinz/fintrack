from functools import lru_cache

from fastapi import Depends, FastAPI, HTTPException

from fintrack_ai.categorizer import build_response
from fintrack_ai.config import Settings, get_settings
from fintrack_ai.providers.anthropic_provider import AnthropicProvider
from fintrack_ai.providers.base import LlmProvider, ProviderError
from fintrack_ai.schemas import CategorizationRequest, CategorizationResponse
from fintrack_ai.security import verify_token

app = FastAPI(title="fintrack-ai")


@lru_cache
def get_provider() -> LlmProvider:
    settings: Settings = get_settings()
    return AnthropicProvider(api_key=settings.anthropic_api_key, model=settings.model)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "UP"}


@app.post(
    "/categorize",
    response_model=CategorizationResponse,
    response_model_by_alias=True,
    dependencies=[Depends(verify_token)],
)
async def categorize(
    request: CategorizationRequest, provider: LlmProvider = Depends(get_provider)
) -> CategorizationResponse:
    try:
        answers = await provider.classify(request.merchant, request.items, request.item_categories)
    except ProviderError as error:
        # The backend retries on 5xx. The error text can hold receipt data, so it is not returned.
        raise HTTPException(status_code=502, detail="Model provider failed") from error
    return build_response(request, answers, provider.model)
