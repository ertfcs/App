"""Build the shareable preview (claude.ai Artifact) of the app.

Inputs : dev_preview/web-dist (Expo web export) + a data.json snapshot of the API.
Output : dev_preview/artifact/out/{index.html, app.js, mock-api.js, data.json}

Usage: python3 dev_preview/artifact/build.py <snapshot.json>
"""
import base64
import json
import mimetypes
import urllib.request
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
<style id="leaflet-css">__LEAFLET_CSS__</style>
<script>window.__PREVIEW_MAP__ = __MAP__;</script>
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


FRONTEND = os.path.join(HERE, "..", "..", "frontend")
WEATHER_URL = ("https://api.open-meteo.com/v1/forecast?latitude=38.0667&longitude=13.0333"
               "&current_weather=true&daily=sunset,uv_index_max&timezone=Europe%2FRome")
TOWNS = [
    ("Palermo", 38.1157, 13.3615), ("Trapani", 38.0176, 12.5365), ("Trappeto", 38.0667, 13.0333),
    ("Marsala", 37.7987, 12.4348), ("Mazara del Vallo", 37.6513, 12.5878),
    ("Castellammare del Golfo", 38.0262, 12.8806), ("San Vito Lo Capo", 38.1745, 12.7356),
    ("Erice", 38.0372, 12.5869), ("Cefalù", 38.0381, 14.0225), ("Agrigento", 37.3111, 13.5765),
    ("Catania", 37.5079, 15.0830), ("Messina", 38.1938, 15.5540), ("Siracusa", 37.0755, 15.2866),
    ("Ragusa", 36.9269, 14.7255), ("Enna", 37.5675, 14.2795), ("Sciacca", 37.5092, 13.0889),
    ("Partinico", 38.0476, 13.1166), ("Monreale", 38.0816, 13.2896), ("Favignana", 37.9311, 12.3272),
    ("Ustica", 38.7044, 13.1924), ("Lipari", 38.4675, 14.9554),
]

MAIN_TOWNS = {"Palermo", "Trapani", "Trappeto", "Catania", "Messina", "Siracusa", "Agrigento", "Ragusa", "Enna", "Marsala"}


def write_weather(out_dir):
    """Current beach weather (same request the app makes), served to the page as weather.json."""
    with urllib.request.urlopen(WEATHER_URL, timeout=30) as r:
        data = json.load(r)
    with open(os.path.join(out_dir, "weather.json"), "w") as f:
        json.dump(data, f)
    return data.get("current_weather", {}).get("time")


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
    css = open(os.path.join(FRONTEND, "node_modules", "leaflet", "dist", "leaflet.css")).read()
    css = re.sub(r"url\([^)]*\)", "none", css)  # marker images are not used (circle markers)
    land = json.load(open(os.path.join(HERE, "sicily.geojson")))
    pmap = json.dumps({"land": land, "towns": [{"name": n, "lat": a, "lng": b, "z": 0 if n in MAIN_TOWNS else 9} for n, a, b in TOWNS]},
                      separators=(",", ":"), ensure_ascii=False)
    html = INDEX.replace("__HASH__", h).replace("__LEAFLET_CSS__", css).replace("__MAP__", pmap)
    open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(html)
    print("weather time", write_weather(OUT))
    for f in sorted(os.listdir(OUT)):
        print(f, os.path.getsize(os.path.join(OUT, f)))


if __name__ == "__main__":
    main(sys.argv[1])
