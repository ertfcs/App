"""Texts and practical info for the attractions (backend/assets/poi/content.json).

Applied at startup, each field at most once per attraction and only when it is empty
(the short default description counts as empty), so changes made in the admin are never overwritten.
`to_verify` lists the fields Matteo should double-check; the admin shows them as "Da verificare".
"""
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)
CONTENT = Path(__file__).parent / "assets" / "poi" / "content.json"
FIELDS = ("description", "hours", "price", "duration", "how_to", "notes", "must_see", "maps_query", "to_verify")
MARKER = "poi_content_v1"


async def apply_poi_content(db, default_descriptions: dict) -> int:
    if not CONTENT.exists():
        return 0
    content = json.loads(CONTENT.read_text(encoding="utf-8"))
    meta = await db.app_meta.find_one({"_id": MARKER}) or {"_id": MARKER, "applied": {}}
    applied = meta.get("applied", {})
    updated = 0
    for name, info in content.items():
        doc = await db.pois.find_one({"name": name}, {"_id": 0})
        if not doc:
            continue
        done = set(applied.get(name, []))
        patch = {}
        for field in FIELDS:
            if field not in info or field in done:
                continue
            current = doc.get(field)
            empty = current in (None, "", [], False)
            if field == "description" and current == default_descriptions.get(name):
                empty = True
            if empty:
                patch[field] = info[field]
            done.add(field)
        if patch:
            await db.pois.update_one({"name": name}, {"$set": patch})
            updated += 1
        applied[name] = sorted(done)
    await db.app_meta.update_one({"_id": MARKER}, {"$set": {"applied": applied}}, upsert=True)
    return updated
