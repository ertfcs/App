"""File storage for uploaded photos and PDFs (replaces Emergent Object Storage).

Two backends, same interface:
    put_object(path, data, content_type) -> {"path", "size", "content_type"}
    get_object(path) -> (bytes, content_type)

- STORAGE_BACKEND=mongo : files are kept in MongoDB (GridFS, bucket "files_store").
  Use it on hosts without a persistent disk (e.g. Render free plan).
- default ("disk")      : files under STORAGE_DIR (default backend/storage).
"""
import json
import mimetypes
import os

APP_NAME = "appartamento-matteo"
BACKEND = (os.environ.get("STORAGE_BACKEND") or "disk").strip().lower()
STORAGE_DIR = os.path.abspath(
    os.environ.get("STORAGE_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "storage")
)
_fs = None


def _gridfs():
    global _fs
    if _fs is None:
        import gridfs
        from pymongo import MongoClient

        db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
        _fs = gridfs.GridFS(db, collection="files_store")
    return _fs


def _full(path: str) -> str:
    full = os.path.abspath(os.path.join(STORAGE_DIR, path.lstrip("/")))
    if not full.startswith(STORAGE_DIR + os.sep):
        raise ValueError("percorso non valido")
    return full


def put_object(path: str, data: bytes, content_type: str) -> dict:
    if BACKEND == "mongo":
        fs = _gridfs()
        for old in fs.find({"filename": path}):
            fs.delete(old._id)
        fs.put(data, filename=path, contentType=content_type)
    else:
        full = _full(path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "wb") as f:
            f.write(data)
        with open(full + ".meta", "w") as f:
            json.dump({"content_type": content_type}, f)
    return {"path": path, "size": len(data), "content_type": content_type}


def get_object(path: str) -> tuple:
    if BACKEND == "mongo":
        import gridfs

        try:
            g = _gridfs().get_last_version(filename=path)
        except gridfs.errors.NoFile:
            raise FileNotFoundError(path)
        ct = (getattr(g, "_file", None) or {}).get("contentType")
        return g.read(), ct or mimetypes.guess_type(path)[0] or "application/octet-stream"
    full = _full(path)
    if not os.path.isfile(full):
        raise FileNotFoundError(path)
    ct = None
    try:
        with open(full + ".meta") as f:
            ct = json.load(f).get("content_type")
    except (OSError, ValueError):
        pass
    with open(full, "rb") as f:
        return f.read(), ct or mimetypes.guess_type(full)[0] or "application/octet-stream"
