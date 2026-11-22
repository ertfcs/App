import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { beaches as baseBeaches, type Beach } from "./beaches";

// Beaches = built-in list + changes saved from the admin (overrides). Italian texts are editable;
// the English texts stay as in the built-in list.
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
