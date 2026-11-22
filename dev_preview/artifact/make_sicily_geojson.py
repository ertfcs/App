"""Extract Sicily and its islands from Natural Earth (world-atlas countries-10m.json, TopoJSON)
into a small GeoJSON used as the offline base map of the preview link.

Usage: python3 -I make_sicily_geojson.py <countries-10m.json> <out.geojson>
"""
import json
import sys


def main(src, dst):
    topo = json.load(open(src))
    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)

    def ring(idx):
        out = []
        for i in idx:
            pts = arcs[i] if i >= 0 else list(reversed(arcs[~i]))
            out.extend(pts if not out else pts[1:])
        return out

    italy = next(g for g in topo["objects"]["countries"]["geometries"] if g.get("properties", {}).get("name") == "Italy")
    polys = italy["arcs"] if italy["type"] == "MultiPolygon" else [italy["arcs"]]
    keep = []
    for poly in polys:
        rings = [ring(r) for r in poly]
        outer = rings[0]
        lon = sum(p[0] for p in outer) / len(outer)
        lat = sum(p[1] for p in outer) / len(outer)
        if 11.5 < lon < 15.8 and 35.3 < lat < 38.95:
            keep.append([[[round(a, 4), round(b, 4)] for a, b in r] for r in rings])
    feat = {"type": "Feature", "properties": {"name": "Sicilia"},
            "geometry": {"type": "MultiPolygon", "coordinates": keep}}
    json.dump(feat, open(dst, "w"), separators=(",", ":"))
    print("polygons", len(keep), "points", sum(len(p[0]) for p in keep))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
