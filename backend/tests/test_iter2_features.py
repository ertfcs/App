"""Iteration 2 regression: carmelo auth, uploads/files, POI image, guest threads, itineraries+PDF,
custom fees/quote, fees, discount validate/purge, GB guide, marketing calendar, visits, photos."""
import os
import uuid
import base64
from datetime import date, timedelta
import pytest
import requests

API = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") + "/api"
PNG_B64 = ("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
PDF_BYTES = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"


@pytest.fixture(scope="module")
def hdr():
    r = requests.post(f"{API}/auth/login", json={"username": "Matteo", "password": "D5230"}, timeout=20)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


# --- Carmelo security
@pytest.mark.parametrize("method,path", [
    ("get", "/carmelo/models"), ("get", "/carmelo/messages/x"), ("delete", "/carmelo/messages/x"),
    ("post", "/carmelo/chat"), ("post", "/carmelo/itinerary"), ("post", "/carmelo/itinerary/pdf"),
    ("post", "/carmelo/itinerary/structured"), ("post", "/carmelo/itinerary/patch"),
    ("post", "/carmelo/itinerary/structured/pdf"), ("post", "/carmelo/adapt-itinerary"),
    ("post", "/carmelo/extract-file"),
])
def test_carmelo_requires_auth(method, path):
    r = getattr(requests, method)(f"{API}{path}", json={}, timeout=20)
    assert r.status_code == 401, f"{path} -> {r.status_code}"


def test_carmelo_models_with_auth(hdr):
    r = requests.get(f"{API}/carmelo/models", headers=hdr, timeout=20)
    assert r.status_code == 200
    assert r.json()


def test_auth_me(hdr):
    assert requests.get(f"{API}/auth/me", headers=hdr, timeout=15).status_code == 200
    assert requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer bad"}, timeout=15).status_code == 401


# --- Uploads + POI image
def test_upload_and_poi_image(hdr):
    assert requests.post(f"{API}/admin/uploads", json={"data_url": "data:image/png;base64," + PNG_B64}, timeout=20).status_code == 401
    r = requests.post(f"{API}/admin/uploads", headers=hdr,
                      json={"data_url": "data:image/png;base64," + PNG_B64, "filename": "TEST_px.png"}, timeout=60)
    assert r.status_code == 200, r.text
    url = r.json()["url"]
    assert url.startswith("/api/files/")
    f = requests.get(API.rsplit("/api", 1)[0] + url, timeout=30)
    assert f.status_code == 200
    assert f.headers["content-type"].startswith("image/png")
    assert f.content == base64.b64decode(PNG_B64)
    # Set on a POI then revert
    pois = requests.get(f"{API}/pois", timeout=30).json()
    poi = pois[0]
    orig = poi.get("image_url")
    body = {k: v for k, v in poi.items() if k not in ("id", "_id", "created_at", "updated_at")}
    body["image_url"] = url
    try:
        p = requests.put(f"{API}/pois/{poi['id']}", headers=hdr, json=body, timeout=20)
        assert p.status_code == 200, p.text
        again = [x for x in requests.get(f"{API}/pois", timeout=30).json() if x["id"] == poi["id"]][0]
        assert again.get("image_url") == url
    finally:
        body["image_url"] = orig
        requests.put(f"{API}/pois/{poi['id']}", headers=hdr, json=body, timeout=20)
    again = [x for x in requests.get(f"{API}/pois", timeout=30).json() if x["id"] == poi["id"]][0]
    assert again.get("image_url") == orig


def test_upload_rejects_non_image(hdr):
    r = requests.post(f"{API}/admin/uploads", headers=hdr, json={"data_url": "data:text/plain;base64,aGk="}, timeout=20)
    assert r.status_code == 400


def test_upload_bad_base64(hdr):
    r = requests.post(f"{API}/admin/uploads", headers=hdr, json={"data_url": "data:image/png;base64,@@@notb64"}, timeout=20)
    assert r.status_code == 400, f"bad base64 -> {r.status_code}"


def test_files_not_found():
    assert requests.get(f"{API}/files/nope/x.png", timeout=20).status_code == 404


# --- Guest question threads
def test_guest_thread_flow(hdr):
    r = requests.post(f"{API}/guest-questions", json={"name": "TEST_Guest", "contact": "test@example.com",
                                                      "contact_kind": "email", "message": "TEST question?"}, timeout=20)
    assert r.status_code == 200, r.text
    qid = r.json().get("id")
    assert qid
    try:
        t = requests.get(f"{API}/guest-questions/{qid}", timeout=20).json()
        assert t["thread"][0]["from"] == "guest"
        assert requests.post(f"{API}/admin/guest-questions/{qid}/reply", json={"text": "x"}, timeout=20).status_code == 401
        a = requests.post(f"{API}/admin/guest-questions/{qid}/reply", headers=hdr, json={"text": "TEST host answer"}, timeout=20)
        assert a.status_code == 200
        assert a.json()["status"] == "answered"
        g = requests.post(f"{API}/guest-questions/{qid}/reply", json={"text": "TEST follow up"}, timeout=20)
        assert g.status_code == 200
        th = requests.get(f"{API}/guest-questions/{qid}", timeout=20).json()["thread"]
        assert [m["from"] for m in th] == ["guest", "host", "guest"]
        assert th[1]["text"] == "TEST host answer"
        assert requests.post(f"{API}/guest-questions/{qid}/reply", json={"text": "  "}, timeout=20).status_code == 400
    finally:
        requests.delete(f"{API}/admin/guest-questions/{qid}", headers=hdr, timeout=20)
    assert requests.get(f"{API}/guest-questions/{qid}", timeout=20).status_code == 404


# --- Suggested itineraries
def test_itinerary_crud_and_pdf(hdr):
    r = requests.post(f"{API}/admin/itineraries", headers=hdr,
                      json={"title": "TEST_Itin " + uuid.uuid4().hex[:5], "days": 2, "published": True,
                            "visibility": "code_only"}, timeout=20)
    assert r.status_code == 200, r.text
    it = r.json()
    try:
        pub = requests.get(f"{API}/itineraries", timeout=20).json()
        items = pub if isinstance(pub, list) else pub.get("items", pub.get("itineraries", []))
        assert any(x.get("slug") == it["slug"] for x in items)
        assert requests.get(f"{API}/itineraries/{it['slug']}/pdf", timeout=20).status_code == 404
        up = requests.post(f"{API}/admin/itineraries/{it['id']}/upload-pdf", headers=hdr,
                           files={"file": ("TEST.pdf", PDF_BYTES, "application/pdf")}, timeout=60)
        assert up.status_code == 200, up.text
        bad = requests.post(f"{API}/admin/itineraries/{it['id']}/upload-pdf", headers=hdr,
                            files={"file": ("x.txt", b"hello", "text/plain")}, timeout=20)
        assert bad.status_code == 400
        assert requests.get(f"{API}/itineraries/{it['slug']}/pdf", timeout=20).status_code == 403
        ok = requests.get(f"{API}/itineraries/{it['slug']}/pdf", params={"code": "MATTEO26"}, timeout=30)
        assert ok.status_code == 200, ok.text
        assert ok.content.startswith(b"%PDF")
        adm = requests.get(f"{API}/admin/itineraries/{it['id']}/pdf", headers=hdr, timeout=30)
        assert adm.status_code == 200 and adm.content.startswith(b"%PDF")
        # make public
        body = {k: it[k] for k in ("title", "days")}
        body.update({"visibility": "public", "published": True})
        pu = requests.put(f"{API}/admin/itineraries/{it['id']}", headers=hdr, json=body, timeout=20)
        assert pu.status_code == 200, pu.text
        assert requests.get(f"{API}/itineraries/{it['slug']}/pdf", timeout=30).status_code == 200
        rm = requests.delete(f"{API}/admin/itineraries/{it['id']}/pdf", headers=hdr, timeout=20)
        assert rm.status_code == 200
        assert requests.get(f"{API}/itineraries/{it['slug']}/pdf", timeout=20).status_code == 404
    finally:
        d = requests.delete(f"{API}/admin/itineraries/{it['id']}", headers=hdr, timeout=20)
        assert d.status_code in (200, 204)


# --- Fees + custom fees + quote
def test_fees_get_put_roundtrip(hdr):
    f = requests.get(f"{API}/fees", timeout=20)
    assert f.status_code == 200
    orig = f.json()
    assert "cleaning_fee" in orig
    assert requests.put(f"{API}/fees", json=orig, timeout=20).status_code == 401
    r = requests.put(f"{API}/fees", headers=hdr, json=orig, timeout=20)
    assert r.status_code == 200
    assert requests.get(f"{API}/fees", timeout=20).json()["cleaning_fee"] == orig["cleaning_fee"]


def test_custom_fee_in_quote(hdr):
    r = requests.post(f"{API}/custom-fees", headers=hdr, json={"name": "TEST_Fee", "amount": 7, "mode": "per_stay"}, timeout=20)
    assert r.status_code == 200, r.text
    fid = r.json()["id"]
    try:
        assert any(x["id"] == fid for x in requests.get(f"{API}/custom-fees", timeout=20).json())
        ci = (date.today() + timedelta(days=200)).isoformat()
        co = (date.today() + timedelta(days=203)).isoformat()
        q = requests.post(f"{API}/quote", json={"guest_name": "x", "guest_email": "x@x.it", "check_in": ci,
                                                "check_out": co, "guests": 2}, timeout=20)
        assert q.status_code == 200, q.text
        assert any(c["name"] == "TEST_Fee" and c["cost"] == 7 for c in q.json()["custom_fees"])
    finally:
        d = requests.delete(f"{API}/custom-fees/{fid}", headers=hdr, timeout=20)
        assert d.status_code in (200, 204)
    assert not any(x["id"] == fid for x in requests.get(f"{API}/custom-fees", timeout=20).json())


# --- Discount codes
def test_discount_validate_and_purge(hdr):
    code = "TEST" + uuid.uuid4().hex[:5].upper()
    today = date.today()
    r = requests.post(f"{API}/discount-codes", headers=hdr, json={"code": code, "type": "discount", "percent": 10,
                      "valid_from": today.isoformat(), "valid_to": (today + timedelta(days=5)).isoformat()}, timeout=20)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    try:
        v = requests.get(f"{API}/discount-codes/validate/{code.lower()}", timeout=20)
        assert v.status_code == 200 and v.json()["percent"] == 10
        assert requests.get(f"{API}/discount-codes/validate/NOPE_XYZ", timeout=20).status_code == 404
        # ai_access code is not a discount
        assert requests.get(f"{API}/discount-codes/validate/MATTEO26", timeout=20).status_code == 404
    finally:
        requests.delete(f"{API}/discount-codes/{cid}", headers=hdr, timeout=20)
    assert requests.delete(f"{API}/discount-codes/expired", timeout=20).status_code == 401


# --- Google Business guide
def test_gb_guide_roundtrip(hdr):
    g = requests.get(f"{API}/admin/google-business/guide", headers=hdr, timeout=20)
    assert g.status_code == 200
    orig = g.json().get("progress", {})
    new = dict(orig, TEST_step=True)
    try:
        assert requests.put(f"{API}/admin/google-business/guide", headers=hdr, json={"progress": new}, timeout=20).status_code == 200
        assert requests.get(f"{API}/admin/google-business/guide", headers=hdr, timeout=20).json()["progress"].get("TEST_step") is True
    finally:
        requests.put(f"{API}/admin/google-business/guide", headers=hdr, json={"progress": orig}, timeout=20)


def test_sitemap():
    r = requests.get(f"{API}/sitemap.xml", timeout=20)
    assert r.status_code == 200 and "<urlset" in r.text


# --- Marketing calendar
def test_marketing_calendar_crud(hdr):
    r = requests.post(f"{API}/admin/marketing/calendar", headers=hdr,
                      json={"title": "TEST_cal", "platform": "tiktok", "date": "2026-03-01"}, timeout=20)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    try:
        u = requests.put(f"{API}/admin/marketing/calendar/{cid}", headers=hdr, json={"status": "done"}, timeout=20)
        assert u.status_code == 200
        lst = requests.get(f"{API}/admin/marketing/calendar", headers=hdr, timeout=20).json()
        lst = lst if isinstance(lst, list) else lst.get("items", [])
        assert [x for x in lst if x["id"] == cid][0]["status"] == "done"
    finally:
        assert requests.delete(f"{API}/admin/marketing/calendar/{cid}", headers=hdr, timeout=20).status_code in (200, 204)


# --- Visits
def test_track_visit_increments_stats(hdr):
    before = requests.get(f"{API}/admin/stats", headers=hdr, timeout=20).json()["total_visits"]
    sid = "TEST_" + uuid.uuid4().hex
    r = requests.post(f"{API}/track/visit", json={"session_id": sid, "path": "/"}, timeout=20)
    assert r.json() == {"ok": True, "deduped": False}
    assert requests.post(f"{API}/track/visit", json={"session_id": sid, "path": "/"}, timeout=20).json()["deduped"] is True
    after = requests.get(f"{API}/admin/stats", headers=hdr, timeout=20).json()["total_visits"]
    assert after >= before + 1


# --- Quote must not crash when an ai_access code (no percent) is typed in discount field
def test_quote_with_ai_access_code_no_500():
    r = requests.post(f"{API}/quote", json={"guest_name": "x", "guest_email": "x@x.it", "check_in": "2027-05-10",
                                            "check_out": "2027-05-13", "guests": 2, "discount_code": "MATTEO26"}, timeout=20)
    assert r.status_code == 200, f"quote with MATTEO26 -> {r.status_code}"
