import React, { useEffect, useRef } from "react";
import L from "leaflet";
import type { Poi } from "@/src/lib/queries";

const CSS_ID = "leaflet-css";
const SICILY: L.LatLngBoundsExpression = [[36.6, 12.3], [38.35, 15.7]];

function ensureCss() {
  if (typeof document === "undefined" || document.getElementById(CSS_ID)) return;
  const link = document.createElement("link");
  link.id = CSS_ID;
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
}

// Web: interactive Leaflet map of Sicily (OpenStreetMap tiles) with all POI pins.
export function PoiMap({
  pois,
  selectedIds,
  onPressPoi,
  tintFor,
}: {
  pois: Poi[];
  selectedIds: string[];
  onPressPoi: (p: Poi) => void;
  tintFor: (cat: string) => string;
}) {
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pressRef = useRef(onPressPoi);
  pressRef.current = onPressPoi;

  useEffect(() => {
    ensureCss();
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true, maxBounds: [[35.5, 11.0], [39.5, 16.5]] });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      minZoom: 6,
      attribution: "&copy; OpenStreetMap",
    }).addTo(m);
    m.fitBounds(SICILY);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    pois.forEach((p) => {
      const active = selectedIds.includes(p.id);
      const color = active ? "#C8563B" : tintFor(p.category);
      const mk = L.circleMarker([p.lat, p.lng], {
        radius: active ? 9 : 6,
        color: "#fff",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.95,
      })
        .bindTooltip(p.name, { direction: "top", offset: [0, -6] })
        .on("click", () => pressRef.current(p));
      mk.addTo(g);
      const node = (mk as any).getElement?.();
      if (node) node.setAttribute("data-testid", `marker-${p.id}`);
    });
  }, [pois, selectedIds, tintFor]);

  return React.createElement("div", {
    ref: el,
    "data-testid": "poi-map",
    style: { position: "absolute", inset: 0, zIndex: 0 },
  });
}
