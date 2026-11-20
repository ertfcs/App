"""Find up to 2 free-licensed photos per place (Wikipedia lead image + Wikimedia Commons search).

Runs on GitHub Actions (see .github/workflows/foto-luoghi.yml).
usage: python fetch.py <pois.json> <out_dir>
Output: <out_dir>/<slug>-1.jpg, <slug>-2.jpg (max 1000 px) and <out_dir>/results.json with author/licence.
"""
import io
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

from PIL import Image

UA = {"User-Agent": "AppartamentoMatteoPlaces/1.0 (GitHub Actions; one-off lookup of free-licence photos with credits)"}
EXCLUDE = re.compile(r"(stemma|coat[_ ]of|locator|mappa|map[_ .]|carta|flag|bandiera|logo|\.svg|\.tif|\.pdf|diagram|pianta|francobollo|stamp)", re.I)
FREE = re.compile(r"(cc[- ]by|cc0|public domain|pubblico dominio|^pd)", re.I)


def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def call(url, pause=1.5, tries=6):
    for i in range(tries):
        time.sleep(pause)
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 503):
                ra = e.headers.get("Retry-After")
                wait = int(ra) if ra and ra.isdigit() else 20 * (i + 1)
                print(f"  {e.code}, waiting {wait}s", flush=True)
                time.sleep(wait)
                continue
            raise
    raise RuntimeError("rate limited")


def api(host, params):
    q = {**params, "format": "json", "formatversion": "2"}
    return json.loads(call(f"https://{host}/w/api.php?" + urllib.parse.urlencode(q)))


def meta(ii):
    m = ii.get("extmetadata", {})
    lic = m.get("LicenseShortName", {}).get("value", "")
    artist = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.get("Artist", {}).get("value", ""))).strip()[:60]
    return lic, artist or "autore sconosciuto"


def good(title, ii):
    lic, _ = meta(ii)
    return (not EXCLUDE.search(title) and FREE.search(lic or "")
            and ii.get("width", 0) >= ii.get("height", 1) and ii.get("width", 0) >= 800)


def file_infos(titles):
    out = {}
    for i in range(0, len(titles), 50):
        d = api("commons.wikimedia.org", {"action": "query", "titles": "|".join(titles[i:i + 50]), "prop": "imageinfo",
                                          "iiprop": "url|extmetadata|size", "iiurlwidth": "1000"})
        for pg in d.get("query", {}).get("pages", []):
            if "imageinfo" in pg:
                out[pg["title"]] = pg["imageinfo"][0]
    return out


def wiki_leads(pois):
    """it.wikipedia lead image for each place, via full-text search (1 call per place)."""
    leads = {}
    for p in pois:
        q = re.sub(r"[()]", " ", p["name"].replace(" - ", " "))
        try:
            d = api("it.wikipedia.org", {"action": "query", "generator": "search", "gsrsearch": q, "gsrlimit": "3",
                                         "prop": "pageimages", "piprop": "name", "pilicense": "free"})
        except Exception as e:
            print(f"wiki {p['name']}: {e}", flush=True)
            continue
        key = {w for w in re.findall(r"[a-zà-ù]{4,}", p["name"].lower())} - {"della", "delle", "dello", "degli", "spiaggia", "riserva", "chiesa", "museo", "palazzo", "centro", "storico"}
        for pg in sorted(d.get("query", {}).get("pages", []), key=lambda x: x.get("index", 99)):
            img = pg.get("pageimage")
            if not img or EXCLUDE.search(img):
                continue
            words = set(re.findall(r"[a-zà-ù]{4,}", pg["title"].lower()))
            if key and not key & words:
                continue
            leads[p["name"]] = ("File:" + img.replace("_", " "), pg["title"])
            break
    return leads


def commons_search(p, n=4):
    q = re.sub(r"[()]", " ", p["name"].replace(" - ", " ")) + " " + (p.get("town") or "")
    d = api("commons.wikimedia.org", {"action": "query", "generator": "search", "gsrsearch": q + " filetype:bitmap",
                                      "gsrnamespace": "6", "gsrlimit": str(n), "prop": "imageinfo",
                                      "iiprop": "url|extmetadata|size", "iiurlwidth": "1000"})
    pages = sorted(d.get("query", {}).get("pages", []), key=lambda x: x.get("index", 99))
    return [(pg["title"], pg["imageinfo"][0]) for pg in pages if pg.get("imageinfo")]


def main(pois_path, out):
    os.makedirs(out, exist_ok=True)
    pois = json.load(open(pois_path))
    leads = wiki_leads(pois)
    print(f"wikipedia lead images: {len(leads)}/{len(pois)}", flush=True)
    lead_info = file_infos(sorted({f for f, _ in leads.values()}))
    results = {}
    for n, p in enumerate(pois, 1):
        name = p["name"]
        options = []
        if name in leads:
            f, page = leads[name]
            ii = lead_info.get(f)
            if ii and good(f, ii):
                options.append((f, ii, page))
        try:
            for f, ii in commons_search(p):
                if len(options) >= 2:
                    break
                if good(f, ii) and all(f != o[0] for o in options):
                    options.append((f, ii, None))
        except Exception as e:
            print(f"commons {name}: {e}", flush=True)
        saved = []
        for k, (f, ii, page) in enumerate(options, 1):
            try:
                raw = call(ii.get("thumburl") or ii["url"], pause=0.7)
                im = Image.open(io.BytesIO(raw)).convert("RGB")
                im.thumbnail((1000, 1000))
                fn = f"{slug(name)}-{k}.jpg"
                im.save(os.path.join(out, fn), "JPEG", quality=80, optimize=True, progressive=True)
                lic, artist = meta(ii)
                saved.append({"file": fn, "source_file": f, "wiki_page": page, "license": lic, "artist": artist,
                              "credit": f"{artist}, {lic} (Wikimedia Commons)", "page": ii.get("descriptionurl"),
                              "size": [im.width, im.height]})
            except Exception as e:
                print(f"download {name} {f}: {e}", flush=True)
        results[name] = saved
        print(f"{n}/{len(pois)} {name}: {len(saved)} foto", flush=True)
        json.dump(results, open(os.path.join(out, "results.json"), "w"), ensure_ascii=False, indent=1)
    found = sum(1 for v in results.values() if v)
    print(f"DONE: {found}/{len(pois)} luoghi con almeno una foto", flush=True)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
