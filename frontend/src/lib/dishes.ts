import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { culinaryData, Dish, foodCategories } from "./culinary";
import { dishI18n } from "./culinary_i18n";

export type MergedDish = Dish & { image?: string; hidden?: boolean; custom?: boolean };
export type DishOverride = Partial<MergedDish> & { id: string };

async function fetchOverrides(): Promise<DishOverride[]> {
  try {
    const res = await api.get<DishOverride[]>("/dishes/overrides");
    return res.data ?? [];
  } catch {
    return [];
  }
}

export function mergeDishes(overrides: DishOverride[]): MergedDish[] {
  const byId = new Map<string, MergedDish>();
  for (const d of culinaryData) byId.set(d.id, { ...d });
  for (const o of overrides) {
    const base = byId.get(o.id);
    if (base) byId.set(o.id, { ...base, ...clean(o) });
    else byId.set(o.id, { ...emptyDish(o.id), ...clean(o), custom: true });
  }
  return Array.from(byId.values()).filter((d) => !d.hidden);
}

function clean(o: DishOverride): Partial<MergedDish> {
  const out: any = {};
  for (const [k, v] of Object.entries(o)) if (v !== null && v !== undefined) out[k] = v;
  return out;
}

function emptyDish(id: string): MergedDish {
  return { id, category: "Palermo", name: "", region: "", description: "", ingredients: [], funFact: "", icon: "🍽️" };
}

export function useDishes() {
  return useQuery({
    queryKey: ["dishes"],
    queryFn: fetchOverrides,
    select: (overrides) => mergeDishes(overrides),
  });
}

export { foodCategories, culinaryData };
export type { Dish };

const builtIn = new Map(culinaryData.map((d) => [d.id, d]));
const sameList = (a?: string[], b?: string[]) => !!a && !!b && a.length === b.length && a.every((x, i) => x === b[i]);

/** Dish texts in the guest's language. A field edited in the admin (no longer equal to the built-in Italian
 * text that was translated) stays as the admin wrote it. */
export function localizeDish<T extends Dish>(dish: T, lang?: string): T {
  const code = (lang ?? "it").slice(0, 2);
  const tr = code === "it" ? undefined : dishI18n[dish.id]?.[code];
  const base = builtIn.get(dish.id);
  if (!tr || !base) return dish;
  return {
    ...dish,
    description: dish.description === base.description ? tr.description : dish.description,
    ingredients: sameList(dish.ingredients, base.ingredients) ? tr.ingredients : dish.ingredients,
    funFact: dish.funFact === base.funFact ? tr.funFact : dish.funFact,
  };
}
