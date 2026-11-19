"""Build the shareable preview (claude.ai Artifact) of the app.

Inputs : dev_preview/web-dist (Expo web export) + a data.json snapshot of the API.
Output : dev_preview/artifact/out/{index.html, app.js, mock-api.js, data.json}

Usage: python3 dev_preview/artifact/build.py <snapshot.json>
"""
import base64
import mimetypes
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(HERE, "..", "web-dist")
OUT = os.path.join(HERE, "out")

INDEX = """<title>Appartamento Matteo</title>
<meta name="description" content="Guida di Appartamento Matteo, Trappeto">
<style>
  :root { --bg: #FAF8F5; --fg: #2C2A28; --pill-bg: #2C2A28; --pill-fg: #FAF8F5; }
  html, body { height: 100%; }
  body { overflow: hidden; background: var(--bg); color: var(--fg); }
  #root { display: flex; height: 100%; flex: 1; }
  #pv-pill { position: fixed; z-index: 99999; left: 50%; transform: translateX(-50%);
    bottom: calc(76px + env(safe-area-inset-bottom, 0px)); background: var(--pill-bg); color: var(--pill-fg);
    font: 600 11px/1.2 system-ui, sans-serif; letter-spacing: .04em; padding: 6px 10px; border-radius: 999px;
    opacity: .82; border: 0; cursor: pointer; }
  #pv-pill:focus-visible { outline: 2px solid #C9772F; outline-offset: 2px; }
</style>
<div id="root"></div>
<button id="pv-pill" type="button" title="Tocca per nascondere">ANTEPRIMA · dati di esempio</button>
<script>
  (function () {
    var pill = document.getElementById("pv-pill");
    pill.addEventListener("click", function () { pill.hidden = true; });
    setTimeout(function () { pill.hidden = true; }, 7000);
  })();
  (function () {
    var base = location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");
    window.__PREVIEW_BASE__ = base;
    function load(src, done) {
      var s = document.createElement("script");
      s.src = base + src;
      s.onload = done;
      document.body.appendChild(s);
    }
    load("mock-api.js", function () {
      try { if (location.pathname !== "/") history.replaceState(null, "", "/"); } catch (e) {}
      load("app.js?v=__HASH__");
    });
  })();
</script>
"""


def main(snapshot):
    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(OUT)
    js_dir = os.path.join(DIST, "_expo", "static", "js", "web")
    entry = [f for f in os.listdir(js_dir) if f.startswith("entry-") and f.endswith(".js")][0]
    js = open(os.path.join(js_dir, entry), encoding="utf-8").read()

    def inline(m):
        rel = m.group(1)
        p = os.path.join(DIST, rel.lstrip("/"))
        if not os.path.isfile(p):
            return m.group(0)
        mime = mimetypes.guess_type(p)[0] or ("font/ttf" if p.endswith(".ttf") else "application/octet-stream")
        data = base64.b64encode(open(p, "rb").read()).decode()
        return '"data:%s;base64,%s"' % (mime, data)

    js = re.sub(r'"(/assets/[^"]+)"', inline, js)
    open(os.path.join(OUT, "app.js"), "w", encoding="utf-8").write(js)
    shutil.copy(os.path.join(HERE, "mock-api.js"), OUT)
    shutil.copy(snapshot, os.path.join(OUT, "data.json"))
    h = entry.split("-")[-1].split(".")[0][:10]
    open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(INDEX.replace("__HASH__", h))
    for f in sorted(os.listdir(OUT)):
        print(f, os.path.getsize(os.path.join(OUT, f)))


if __name__ == "__main__":
    main(sys.argv[1])
