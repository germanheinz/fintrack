from fintrack_ai.categorizer import build_response
from fintrack_ai.providers.base import RawAnswer

from helpers import make_request


def test_valid_answers_are_kept_in_the_request_order():
    request = make_request("HUEVOS L 12", "COLA 2L")
    answers = [RawAnswer(1, "Bebidas sin alcohol", 0.9), RawAnswer(0, "Huevos", 0.95)]

    response = build_response(request, answers, "m")

    assert [(i.position, i.item_category, i.confidence) for i in response.items] == [
        (0, "Huevos", 0.95),
        (1, "Bebidas sin alcohol", 0.9),
    ]


def test_category_names_are_matched_without_case_and_returned_with_the_user_spelling():
    request = make_request("LECHE")

    response = build_response(request, [RawAnswer(0, "lácteos", 0.8)], "m")

    assert response.items[0].item_category == "Lácteos"


def test_an_invented_category_becomes_other_with_zero_confidence():
    request = make_request("COSA RARA")

    response = build_response(request, [RawAnswer(0, "Electrónica", 0.99)], "m")

    assert response.items[0].item_category == "Otros"
    assert response.items[0].confidence == 0.0


def test_a_missing_answer_becomes_other_with_zero_confidence():
    request = make_request("HUEVOS", "PAN")

    response = build_response(request, [RawAnswer(0, "Huevos", 0.9)], "m")

    assert response.items[1].item_category == "Otros"
    assert response.items[1].confidence == 0.0


def test_confidence_is_limited_to_the_range_zero_to_one():
    request = make_request("A", "B")

    response = build_response(request, [RawAnswer(0, "Huevos", 7.5), RawAnswer(1, "Huevos", -2)], "m")

    assert [i.confidence for i in response.items] == [1.0, 0.0]


def test_the_response_carries_the_model_name():
    response = build_response(make_request("A"), [], "some-model")

    assert response.model == "some-model"
