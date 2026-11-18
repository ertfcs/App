"""File storage on the server's own disk (replaces Emergent Object Storage).

Files live under STORAGE_DIR (default: backend/storage). Same interface as before:
put_object(path, data, content_type) / get_object(path) -> (bytes, content_type).
"""
import json
import mimetypes
import os

APP_NAME = "appartamento-matteo"
STORAGE_DIR = os.path.abspath(
    os.environ.get("STORAGE_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "storage")
)


def _full(path: str) -> str:
    full = os.path.abspath(os.path.join(STORAGE_DIR, path.lstrip("/")))
    if not full.startswith(STORAGE_DIR + os.sep):
        raise ValueError("percorso non valido")
    return full


def put_object(path: str, data: bytes, content_type: str) -> dict:
    full = _full(path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "wb") as f:
        f.write(data)
    with open(full + ".meta", "w") as f:
        json.dump({"content_type": content_type}, f)
    return {"path": path, "size": len(data), "content_type": content_type}


def get_object(path: str) -> tuple:
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
