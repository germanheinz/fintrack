import pytest
from fastapi.testclient import TestClient

from fintrack_ai.config import Settings, get_settings
from fintrack_ai.main import app, get_provider
from fintrack_ai.providers.base import ProviderError, RawAnswer

from helpers import CATEGORIES, FakeProvider

TOKEN = "test-token"

BODY = {
    "userId": "6f1f1c9e-5b0a-4f5e-9a35-0b7c1f3e8a11",
    "receiptId": "0a7c2d3e-1b4f-4c6d-8e9f-123456789abc",
    "merchant": "Mercadona",
    "items": [
        {"position": 0, "rawName": "HUEVOS L 12", "quantity": None, "lineTotal": 3.49},
        {"position": 1, "rawName": "COLA 2L", "quantity": 2, "lineTotal": 1.59},
    ],
    "itemCategories": CATEGORIES,
}


@pytest.fixture
def provider():
    return FakeProvider([RawAnswer(0, "Huevos", 0.95), RawAnswer(1, "Bebidas sin alcohol", 0.9)])


@pytest.fixture
def client(provider):
    app.dependency_overrides[get_settings] = lambda: Settings(TOKEN, "key", "model")
    app.dependency_overrides[get_provider] = lambda: provider
    yield TestClient(app)
    app.dependency_overrides.clear()


def post(client, body=BODY, token=TOKEN):
    headers = {"X-Internal-Token": token} if token else {}
    return client.post("/categorize", json=body, headers=headers)


def test_health_needs_no_token(client):
    assert client.get("/health").json() == {"status": "UP"}


def test_categorize_returns_the_contract_in_camel_case(client):
    response = post(client)

    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {"position": 0, "itemCategory": "Huevos", "confidence": 0.95},
            {"position": 1, "itemCategory": "Bebidas sin alcohol", "confidence": 0.9},
        ],
        "model": "fake-model",
        "modelVersion": "1",
    }


def test_a_missing_token_is_rejected_before_the_model_is_called(client, provider):
    assert post(client, token=None).status_code == 401
    assert provider.calls == 0


def test_a_wrong_token_is_rejected(client, provider):
    assert post(client, token="wrong").status_code == 401
    assert provider.calls == 0


def test_a_request_without_items_is_rejected(client):
    assert post(client, body={**BODY, "items": []}).status_code == 422


def test_a_provider_failure_returns_502_without_details(client, provider):
    provider.error = ProviderError("secret receipt text")

    response = post(client)

    assert response.status_code == 502
    assert "secret" not in response.text
