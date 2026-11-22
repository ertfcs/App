import type { Festival } from "./festivals";
import { festText } from "./festivals_text";

// Festival texts in the guest's language (the data in festivals.ts is Italian).
const GEN = /^Festa patronale di (.+?) in onore di (.+?), con celebrazioni religiose, processione per le vie del paese e festeggiamenti in piazza\.$/;
const GEN_TR: Record<string, string> = {
  en: "Patron-saint feast of {p} in honour of {s}, with religious services, a procession through the streets and celebrations in the square.",
  es: "Fiesta patronal de {p} en honor de {s}, con celebraciones religiosas, procesión por las calles del pueblo y fiesta en la plaza.",
  fr: "Fête patronale de {p} en l'honneur de {s}, avec célébrations religieuses, procession dans les rues du village et festivités sur la place.",
  de: "Patronatsfest von {p} zu Ehren von {s}, mit Gottesdiensten, Prozession durch die Straßen und Feier auf dem Platz.",
};
const NAME = /^Festa (di|del|della|dei|delle|dell') ?(.+)$/;
const NAME_TR: Record<string, Record<string, string>> = {
  en: { di: "Feast of ", del: "Feast of the ", della: "Feast of the ", dei: "Feast of the ", delle: "Feast of the ", "dell'": "Feast of the " },
  es: { di: "Fiesta de ", del: "Fiesta del ", della: "Fiesta de la ", dei: "Fiesta de los ", delle: "Fiesta de las ", "dell'": "Fiesta de la " },
  fr: { di: "Fête de ", del: "Fête du ", della: "Fête de la ", dei: "Fête des ", delle: "Fête des ", "dell'": "Fête de l'" },
  de: { di: "Fest von ", del: "Fest des ", della: "Fest der ", dei: "Fest der ", delle: "Fest der ", "dell'": "Fest der " },
};
const IT_MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const MONTHS: Record<string, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
};
const APPROX: Record<string, string> = { en: "(approx.)", es: "(aprox.)", fr: "(indicatif)", de: "(ungefähr)" };
const MONTH_RE = new RegExp(`\\b(${IT_MONTHS.join("|")})\\b`, "g");

function text(s: string | undefined, lang: string): string | undefined {
  if (!s) return s;
  const hit = festText[s]?.[lang];
  if (hit) return hit;
  const g = s.match(GEN);
  if (g) return GEN_TR[lang].replace("{p}", g[1]).replace("{s}", g[2]);
  return s;
}

function name(s: string, lang: string): string {
  const hit = festText[s]?.[lang];
  if (hit) return hit;
  const m = s.match(NAME);
  return m ? NAME_TR[lang][m[1]] + m[2] : s;
}

function dateLabel(s: string, lang: string): string {
  const parts = s.split(" · ");
  const range = parts.pop() ?? "";
  const when = parts.map((w) => festText[w]?.[lang] ?? w);
  let r = range.replace(MONTH_RE, (mo) => MONTHS[lang][IT_MONTHS.indexOf(mo)]).replace("(indicativo)", APPROX[lang]);
  if (lang === "de") r = r.replace(/\b(\d{1,2})(?= |–)/g, "$1."); // 25. März, 2.–5. Juli
  return [...when, r].join(" · ");
}

export function localizeFestival(f: Festival, lang?: string): Festival {
  const l = (lang ?? "it").slice(0, 2);
  if (!GEN_TR[l]) return f;
  return {
    ...f,
    name: name(f.name, l),
    place: festText[f.place]?.[l] ?? f.place,
    description: text(f.description, l) ?? f.description,
    curiosity: text(f.curiosity, l),
    note: text(f.note, l),
    dateLabel: dateLabel(f.dateLabel, l),
  };
}
