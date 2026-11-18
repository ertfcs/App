"""Run the FastAPI backend with an in-memory MongoDB (mongomock-motor).
Data resets on restart; the server seeds itself on startup."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "stubs"))
sys.path.insert(0, os.path.join(HERE, "..", "backend"))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "matteo")
os.environ.setdefault("JWT_SECRET", "local-preview-secret")
os.environ.setdefault("ADMIN_USERNAME", "Matteo")
os.environ.setdefault("ADMIN_PASSWORD", "D5230")
os.environ.setdefault("EMERGENT_LLM_KEY", "missing")
import motor.motor_asyncio, mongomock_motor
motor.motor_asyncio.AsyncIOMotorClient = mongomock_motor.AsyncMongoMockClient
import uvicorn
from server import app
from fastapi.responses import FileResponse

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
