import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { beaches as baseBeaches, type Beach, type BeachLang } from "./beaches";
import { beachTextI18n } from "./beach_i18n";

// Beaches = built-in list + changes saved from the admin (overrides). Italian texts are editable;
// translations (beachText) are used only while the Italian text is unchanged.
export type MergedBeach = Beach & { image?: string; hidden?: boolean };
export type BeachOverride = Partial<Omit<MergedBeach, "it" | "en">> & {
  id: string;
  type?: string;
  access?: string;
  desc?: string;
  crowd?: string;
  food?: string;
  seabed?: string;
  parking_info?: string;
  tips?: string;
};

const TEXT_FIELDS = ["type", "access", "desc", "crowd", "food", "seabed", "parking_info", "tips"] as const;

async function fetchOverrides(): Promise<BeachOverride[]> {
  try {
    return (await api.get<BeachOverride[]>("/beaches/overrides")).data ?? [];
  } catch {
    return [];
  }
}

export function mergeBeaches(overrides: BeachOverride[], includeHidden = false): MergedBeach[] {
  const byId = new Map(overrides.map((o) => [o.id, o]));
  return baseBeaches
    .map((b): MergedBeach => {
      const o = byId.get(b.id);
      if (!o) return b;
      const it = { ...b.it };
      const top: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(o)) {
        if (v === null || v === undefined || k === "id" || k === "updated_at") continue;
        if ((TEXT_FIELDS as readonly string[]).includes(k)) (it as Record<string, unknown>)[k] = v;
        else top[k] = v;
      }
      return { ...b, ...top, it } as MergedBeach;
    })
    .filter((b) => includeHidden || !b.hidden);
}

export function useBeaches(includeHidden = false) {
  return useQuery({ queryKey: ["beaches"], queryFn: fetchOverrides, select: (o) => mergeBeaches(o, includeHidden) });
}

const baseById = new Map(baseBeaches.map((b) => [b.id, b]));

/** Beach texts in the guest's language. A text changed in the admin (Italian only) is shown as written. */
export function beachText(beach: Beach, lang?: string): BeachLang {
  const code = (lang ?? "it").slice(0, 2);
  if (code === "it") return beach.it;
  const base = baseById.get(beach.id);
  const out = { ...beach.it };
  for (const f of TEXT_FIELDS) {
    const it = beach.it[f];
    if (!base || it !== base.it[f]) continue;
    out[f] = code === "en" ? base.en[f] : beachTextI18n[it]?.[code] ?? base.en[f];
  }
  return out;
}
