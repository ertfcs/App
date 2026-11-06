# Booking reviews translation endpoint: POST /api/booking-reviews/{id}/translate
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


@pytest.fixture(scope="module")
def reviews():
    d = requests.get(f"{BASE_URL}/api/booking-reviews").json()
    if not d["reviews"]:
        pytest.skip("no reviews")
    return d["reviews"]


def _tr(rid, lang):
    return requests.post(f"{BASE_URL}/api/booking-reviews/{rid}/translate", json={"lang": lang}, timeout=90)


def test_translate_en(reviews):
    r = _tr(reviews[0]["id"], "en")
    assert r.status_code == 200, r.text
    t = r.json()["text"]
    assert isinstance(t, str) and len(t) > 5
    assert t != reviews[0]["text"]
    print("EN:", t)


def test_translate_it(reviews):
    rid = reviews[-1]["id"]
    r = _tr(rid, "it")
    assert r.status_code == 200, r.text
    t = r.json()["text"]
    assert t and t != reviews[-1]["text"]
    print("IT:", t)


def test_translate_cached_fast(reviews):
    rid = reviews[0]["id"]
    first = _tr(rid, "en").json()["text"]
    t0 = time.time()
    r = _tr(rid, "en")
    dt = time.time() - t0
    assert r.status_code == 200
    assert r.json()["text"] == first
    assert dt < 2.5, f"cached call took {dt:.2f}s"


def test_translate_invalid_lang(reviews):
    r = _tr(reviews[0]["id"], "zz")
    assert r.status_code == 400


def test_translate_unknown_id():
    r = _tr("does-not-exist-123", "en")
    assert r.status_code == 404


def test_translate_missing_body(reviews):
    r = requests.post(f"{BASE_URL}/api/booking-reviews/{reviews[0]['id']}/translate", json={})
    assert r.status_code == 422


def test_public_does_not_leak_translations_breaking_shape(reviews):
    d = requests.get(f"{BASE_URL}/api/booking-reviews").json()
    for rv in d["reviews"]:
        assert "text" in rv and "id" in rv
