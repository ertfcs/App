"""Hosting helpers for running the whole app from one server (e.g. on Render).

- Password gate: when SITE_PASSWORD is set, every page and API call needs a cookie
  that is given after typing the password on /__accesso. Used to keep the site
  private while testing; remove SITE_PASSWORD to open it to the public.
- Frontend: when the exported Expo web app exists (FRONTEND_DIST, default
  ../frontend/dist), it is served on the same origin as the API.
"""
import hashlib
import hmac
import html
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse

COOKIE = "am_site"
LOGIN_PATH = "/__accesso"

LOGIN_PAGE = """<!doctype html><html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Appartamento Matteo · Accesso</title>
<style>
  :root { --bg:#FAF8F5; --fg:#2C2A28; --muted:#6B6661; --card:#fff; --line:#E7E0D4; --accent:#B4613F; }
  @media (prefers-color-scheme: dark) { :root { --bg:#1E1C1A; --fg:#F3EEE7; --muted:#B5ADA3; --card:#2A2725; --line:#3A3632; --accent:#D98A63; } }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:var(--bg); color:var(--fg);
         font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif; padding:16px; }
  form { width:100%; max-width:360px; background:var(--card); border:1px solid var(--line); border-radius:16px; padding:28px 24px;
         display:grid; gap:14px; }
  h1 { margin:0; font:600 22px/1.2 Georgia,serif; }
  p { margin:0; color:var(--muted); font-size:14px; }
  label { font-size:13px; font-weight:600; letter-spacing:.02em; }
  input { width:100%; padding:12px 14px; border:1px solid var(--line); border-radius:10px; font:inherit; background:var(--bg); color:var(--fg); }
  input:focus-visible, button:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
  button { padding:12px; border:0; border-radius:10px; background:var(--accent); color:#fff; font:600 16px system-ui,sans-serif; cursor:pointer; }
  .err { color:#C0392B; font-size:14px; }
</style></head><body>
<form method="post" action="__ACTION__">
  <h1>Appartamento Matteo</h1>
  <p>Versione privata di prova. Inserisci la password per entrare.</p>
  __ERROR__
  <label for="pw">Password</label>
  <input id="pw" name="password" type="password" autocomplete="current-password" autofocus required>
  <input type="hidden" name="next" value="__NEXT__">
  <button type="submit">Entra</button>
</form></body></html>"""


def _token(password: str) -> str:
    secret = (os.environ.get("JWT_SECRET") or "site").encode()
    return hmac.new(secret, password.encode(), hashlib.sha256).hexdigest()


def _login_page(next_url: str, error: bool, status: int = 401) -> HTMLResponse:
    page = (LOGIN_PAGE.replace("__ACTION__", LOGIN_PATH)
            .replace("__NEXT__", html.escape(next_url or "/", quote=True))
            .replace("__ERROR__", '<div class="err">Password errata, riprova.</div>' if error else ""))
    return HTMLResponse(page, status_code=status, headers={"Cache-Control": "no-store"})


def setup(app: FastAPI) -> None:
    password = (os.environ.get("SITE_PASSWORD") or "").strip()

    @app.get("/healthz", include_in_schema=False)
    async def healthz():
        return {"ok": True}

    if password:
        expected = _token(password)

        @app.middleware("http")
        async def site_gate(request: Request, call_next):
            path = request.url.path
            if path in (LOGIN_PATH, "/healthz"):
                return await call_next(request)
            if hmac.compare_digest(request.cookies.get(COOKIE, ""), expected):
                return await call_next(request)
            if path.startswith("/api/"):
                return JSONResponse({"detail": "Accesso privato: inserisci la password del sito."}, status_code=401)
            nxt = path + (("?" + request.url.query) if request.url.query else "")
            return _login_page(nxt, error=False)

        @app.get(LOGIN_PATH, include_in_schema=False)
        async def login_form(next: str = "/"):
            return _login_page(next, error=False, status=200)

        @app.post(LOGIN_PATH, include_in_schema=False)
        async def login_submit(request: Request):
            form = await request.form()
            nxt = str(form.get("next") or "/")
            if not nxt.startswith("/") or nxt.startswith("//"):
                nxt = "/"
            if not hmac.compare_digest(str(form.get("password") or ""), password):
                return _login_page(nxt, error=True)
            resp = RedirectResponse(nxt, status_code=303)
            resp.set_cookie(COOKIE, expected, max_age=60 * 60 * 24 * 60, httponly=True,
                            secure=request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https",
                            samesite="lax")
            return resp

    dist = Path(os.environ.get("FRONTEND_DIST") or Path(__file__).parent.parent / "frontend" / "dist").resolve()
    if (dist / "index.html").is_file():
        index = dist / "index.html"

        @app.get("/{path:path}", include_in_schema=False)
        async def frontend(path: str):
            if path.startswith("api/"):
                raise HTTPException(status_code=404, detail="Not Found")
            f = (dist / path).resolve()
            if path and f.is_file() and dist in f.parents:
                return FileResponse(f)
            return FileResponse(index, headers={"Cache-Control": "no-cache"})
