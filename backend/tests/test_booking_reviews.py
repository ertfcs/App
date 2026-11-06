# Booking.com reviews showcase: public + admin endpoints
import os
import copy
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "Matteo", "password": "D5230"})
    if r.status_code != 200:
        pytest.skip("admin login failed")
    return r.json()["token"]


@pytest.fixture(scope="module")
def H(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module", autouse=True)
def restore_state(H):
    orig = requests.get(f"{BASE_URL}/api/admin/booking-reviews", headers=H).json()
    yield
    r = requests.put(f"{BASE_URL}/api/admin/booking-reviews", headers=H, json=orig)
    assert r.status_code == 200


def test_public_shape():
    r = requests.get(f"{BASE_URL}/api/booking-reviews")
    assert r.status_code == 200
    d = r.json()
    for k in ("booking_url", "score", "review_count", "reviews"):
        assert k in d
    assert "_id" not in d
    assert all(rv.get("visible", True) for rv in d["reviews"])


def test_admin_requires_auth():
    assert requests.get(f"{BASE_URL}/api/admin/booking-reviews").status_code == 401
    assert requests.put(f"{BASE_URL}/api/admin/booking-reviews", json={"reviews": []}).status_code == 401


def test_put_assigns_ids_and_filters_hidden(H):
    orig = requests.get(f"{BASE_URL}/api/admin/booking-reviews", headers=H).json()
    body = copy.deepcopy(orig)
    body["reviews"].append({"name": "TEST_Visible", "country": "Italia", "flag": "🇮🇹", "rating": 3, "text": "TEST ok", "visible": True})
    body["reviews"].append({"name": "TEST_Hidden", "country": "", "flag": "", "rating": 2, "text": "TEST hidden", "visible": False})
    r = requests.put(f"{BASE_URL}/api/admin/booking-reviews", headers=H, json=body)
    assert r.status_code == 200
    d = r.json()
    new = [x for x in d["reviews"] if x["name"].startswith("TEST_")]
    assert len(new) == 2 and all(isinstance(x["id"], str) and len(x["id"]) > 10 for x in new)
    # existing ids preserved
    assert [x["id"] for x in d["reviews"][: len(orig["reviews"])]] == [x["id"] for x in orig["reviews"]]
    pub = requests.get(f"{BASE_URL}/api/booking-reviews").json()
    names = [x["name"] for x in pub["reviews"]]
    assert "TEST_Visible" in names and "TEST_Hidden" not in names
    adm = requests.get(f"{BASE_URL}/api/admin/booking-reviews", headers=H).json()
    assert "TEST_Hidden" in [x["name"] for x in adm["reviews"]]


@pytest.mark.parametrize("rating", [0, 6])
def test_rating_validation(H, rating):
    r = requests.put(f"{BASE_URL}/api/admin/booking-reviews", headers=H,
                     json={"reviews": [{"name": "TEST_x", "text": "x", "rating": rating}]})
    assert r.status_code == 422


@pytest.mark.parametrize("score", [-1, 10.5])
def test_score_validation(H, score):
    r = requests.put(f"{BASE_URL}/api/admin/booking-reviews", headers=H, json={"score": score, "reviews": []})
    assert r.status_code == 422


def test_negative_count_rejected(H):
    r = requests.put(f"{BASE_URL}/api/admin/booking-reviews", headers=H, json={"review_count": -3, "reviews": []})
    assert r.status_code == 422


def test_no_visible_reviews_keeps_url(H):
    orig = requests.get(f"{BASE_URL}/api/admin/booking-reviews", headers=H).json()
    body = copy.deepcopy(orig)
    for x in body["reviews"]:
        x["visible"] = False
    r = requests.put(f"{BASE_URL}/api/admin/booking-reviews", headers=H, json=body)
    assert r.status_code == 200
    pub = requests.get(f"{BASE_URL}/api/booking-reviews").json()
    assert pub["reviews"] == []
    assert pub["booking_url"] == orig["booking_url"]
