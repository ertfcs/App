"""Clone smoke regression: POIs, auth, admin modules, unlock code, booking, itinerary PDF."""
import os
import uuid
from datetime import date, timedelta
import pytest
import requests

API = os.environ.get("EXPO_PUBLIC_BACKEND_URL").rstrip("/") + "/api"


@pytest.fixture(scope="module")
def hdr():
    r = requests.post(f"{API}/auth/login", json={"username": "Matteo", "password": "D5230"}, timeout=20)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def created_bookings():
    return []


# POIs
def test_pois_count():
    r = requests.get(f"{API}/pois", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) == 114
    assert all("_id" not in p for p in data)
    assert all(p.get("id") and p.get("name") for p in data)


def test_property_public():
    r = requests.get(f"{API}/property", timeout=20)
    assert r.status_code == 200
    assert isinstance(r.json(), dict)


# Auth
def test_login_bad():
    r = requests.post(f"{API}/auth/login", json={"username": "Matteo", "password": "x"}, timeout=20)
    assert r.status_code in (400, 401, 403)


def test_me(hdr):
    r = requests.get(f"{API}/auth/me", headers=hdr, timeout=20)
    assert r.status_code == 200


# Admin modules
@pytest.mark.parametrize("path", ["/bookings", "/prices", "/admin/stats", "/admin/faqs", "/discount-codes",
                                  "/admin/accounting", "/admin/guest-questions", "/admin/commission-rates",
                                  "/fees", "/custom-fees", "/private-photos", "/admin/itineraries"])
def test_admin_get(hdr, path):
    r = requests.get(f"{API}{path}", headers=hdr, timeout=30)
    assert r.status_code == 200, f"{path}: {r.status_code} {r.text[:200]}"


def test_admin_requires_auth():
    r = requests.get(f"{API}/bookings", timeout=20)
    assert r.status_code in (401, 403)


# Unlock code
def test_verify_code_ok():
    r = requests.post(f"{API}/verify-code", json={"code": "MATTEO26"}, timeout=20)
    assert r.status_code == 200, r.text
    assert r.json().get("valid") is True


def test_verify_code_bad():
    r = requests.post(f"{API}/verify-code", json={"code": "NOPE999"}, timeout=20)
    assert r.status_code in (400, 403, 404)


# Booking
def test_quote_and_booking(hdr, created_bookings):
    ci = date.today() + timedelta(days=400 + uuid.uuid4().int % 200)
    co = ci + timedelta(days=3)
    payload = {"guest_name": "TEST_Clone", "guest_email": "test@example.com", "guest_phone": "+39000000",
               "check_in": ci.isoformat(), "check_out": co.isoformat(), "guests": 2, "extras": {}}
    q = requests.post(f"{API}/quote", json=payload, timeout=20)
    assert q.status_code == 200, q.text
    r = requests.post(f"{API}/bookings", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["status"] == "pending" and b["guest_name"] == "TEST_Clone"
    created_bookings.append(b["id"])
    lst = requests.get(f"{API}/bookings", headers=hdr, timeout=20).json()
    assert any(x["id"] == b["id"] for x in lst)
    d = requests.delete(f"{API}/bookings/{b['id']}", headers=hdr, timeout=20)
    assert d.status_code in (200, 204)


def test_booking_requires_phone():
    payload = {"guest_name": "TEST_x", "guest_email": "t@e.com", "check_in": "2030-01-01",
               "check_out": "2030-01-03", "guests": 2}
    r = requests.post(f"{API}/bookings", json=payload, timeout=20)
    assert r.status_code == 400


# Itinerary PDF
def test_itinerary_pdf():
    pois = requests.get(f"{API}/pois", timeout=30).json()
    ids = [p["id"] for p in pois[:3]]
    r = requests.post(f"{API}/itinerary/pdf", json={"poi_ids": ids, "code": "MATTEO26", "traveler_name": "TEST"}, timeout=90)
    assert r.status_code == 200, r.text[:200]
    assert r.content[:4] == b"%PDF"


def test_itinerary_pdf_no_code():
    r = requests.post(f"{API}/itinerary/pdf", json={"poi_ids": ["x"]}, timeout=20)
    assert r.status_code == 403
