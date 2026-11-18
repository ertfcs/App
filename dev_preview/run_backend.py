"""Run the FastAPI backend + exported web app on one port (default 8001).

MongoDB is replaced by an in-memory mongomock database that is saved to
dev_preview/data/db.json every few seconds and on shutdown, and reloaded at
startup, so data survives restarts.
"""
import asyncio, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "backend"))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "matteo")
os.environ.setdefault("JWT_SECRET", "local-preview-secret")
os.environ.setdefault("ADMIN_USERNAME", "Matteo")
os.environ.setdefault("ADMIN_PASSWORD", "D5230")

import motor.motor_asyncio, mongomock_motor
from bson import json_util

_clients = []


class _Client(mongomock_motor.AsyncMongoMockClient):
    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        _clients.append(self)


motor.motor_asyncio.AsyncIOMotorClient = _Client

import uvicorn
from fastapi.responses import FileResponse
import server
from server import app

DATA = os.path.join(HERE, "data", "db.json")
DB_NAME = os.environ["DB_NAME"]


def _raw_db():
    # underlying synchronous mongomock database
    return _clients[0][DB_NAME]._AsyncMongoMockDatabase__database


def _load():
    if not os.path.isfile(DATA):
        return
    with open(DATA) as f:
        dump = json_util.loads(f.read())
    db = _raw_db()
    for name, docs in dump.items():
        if docs:
            db[name].insert_many(docs)
    print(f"[preview] loaded {sum(map(len, dump.values()))} docs from {DATA}")


_last = None


def _save():
    global _last
    db = _raw_db()
    dump = {n: list(db[n].find({})) for n in db.list_collection_names()}
    text = json_util.dumps(dump)
    if text == _last:
        return
    os.makedirs(os.path.dirname(DATA), exist_ok=True)
    tmp = DATA + ".tmp"
    with open(tmp, "w") as f:
        f.write(text)
    os.replace(tmp, DATA)
    _last = text


_load()  # before the app's own startup seeding (which is idempotent)


async def _autosave():
    while True:
        await asyncio.sleep(5)
        try:
            _save()
        except Exception as e:  # never kill the server for a save error
            print("[preview] save failed:", e)


@app.on_event("startup")
async def _start_autosave():
    asyncio.create_task(_autosave())


@app.on_event("shutdown")
async def _final_save():
    _save()


DIST = os.path.join(HERE, "web-dist")
if os.path.isdir(DIST):
    # Serve the exported Expo web app on the same port (SPA fallback to index.html).
    @app.get("/{path:path}", include_in_schema=False)
    async def _spa(path: str):
        f = os.path.normpath(os.path.join(DIST, path))
        if f.startswith(DIST) and os.path.isfile(f):
            return FileResponse(f)
        return FileResponse(os.path.join(DIST, "index.html"))

uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8001")))
