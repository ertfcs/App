# POI ticket prices applied at startup (poi_tickets.py)
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


def _pois():
    r = requests.get(f"{BASE_URL}/api/pois", timeout=30)
    assert r.status_code == 200
    d = r.json()
    return {p["name"]: p for p in (d if isinstance(d, list) else d.get("pois", []))}


def test_teatro_massimo_price():
    p = _pois()["Teatro Massimo"]
    assert "€14" in p["price"] and p.get("hours") and p.get("ticket_url")


def test_segesta_price():
    assert "€14 (ridotto €7)" in _pois()["Tempio di Segesta"]["price"]


def test_selinunte_price():
    p = _pois()["Parco archeologico di Selinunte"]
    assert "€17" in p["price"] and p.get("ticket_url")


def test_no_mongo_id():
    assert all("_id" not in p for p in _pois().values())
