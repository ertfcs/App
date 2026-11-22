import React from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";

import { makeStyles } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import type { Poi } from "@/src/lib/queries";
import { PlaceCard, type PlaceOverride } from "@/src/components/PlaceCard";
import type { Beach } from "@/src/lib/beaches";
import type { MergedDish } from "@/src/lib/dishes";
import { DishCard, BeachCard } from "@/src/components/GuideCards";

// Free example cards shown to guests without a booking code (same look as the approved preview).
// Texts and photos of the examples live here; the rest of each section stays behind the code.


// Texts are i18n keys under "ui.ex.<key>_desc|_duration|_tip".
export const EXAMPLE_PLACES: Record<string, { image: number; credit: string; key: string }> = {
  "Cattedrale di Palermo": {
    image: require("../../assets/images/examples/cattedrale-di-palermo.jpg"),
    credit: "Pava, pubblico dominio (Wikimedia Commons)",
    key: "cathedral",
  },
  "Tempio di Segesta": {
    image: require("../../assets/images/examples/tempio-di-segesta.jpg"),
    credit: "Ludvig14, CC BY-SA 4.0 (Wikimedia Commons)",
    key: "segesta",
  },
};

export const EXAMPLE_DISHES: Record<string, { image: number; credit: string }> = {
  arancina: { image: require("../../assets/images/examples/arancina.jpg"), credit: "Gmelfi, pubblico dominio (Wikimedia Commons)" },
  "pane-ca-meusa": {
    image: require("../../assets/images/examples/pane-ca-meusa.jpg"),
    credit: "Stephen Woolverton, CC BY-SA 3.0 (Wikimedia Commons)",
  },
};

export const EXAMPLE_BEACH = {
  id: "cala-rossa-favignana",
  image: require("../../assets/images/examples/cala-rossa-favignana.jpg"),
  credit: "Arcona B&B, CC BY 3.0 (Wikimedia Commons)",
};




export function FreeLabel({ text }: { text?: string }) {
  const s = useStyles();
  const { t } = useTranslation();
  text = text ?? t("ui.ex.free");
  return (
    <View style={s.freeRow}>
      <Text style={s.freeTxt}>{text.toUpperCase()}</Text>
      <View style={s.freeLine} />
    </View>
  );
}

/** Photo and translated texts of the free example places; the same in the locked and unlocked views.
 * A photo uploaded from the admin always wins over the bundled one. */
export function placeOverride(poi: Poi, t: (k: string) => string): PlaceOverride | undefined {
  const ex = EXAMPLE_PLACES[poi.name];
  if (!ex) return undefined;
  return {
    image: poi.image_url ? undefined : ex.image,
    credit: poi.image_url ? undefined : ex.credit,
    description: t(`ui.ex.${ex.key}_desc`),
    duration: t(`ui.ex.${ex.key}_duration`),
    tip: t(`ui.ex.${ex.key}_tip`),
  };
}

/** Image source for a dish: the admin photo, otherwise the bundled example photo (if any). */
export function dishImageSource(id: string, image?: string): { uri: string } | number | undefined {
  return image ? { uri: image } : EXAMPLE_DISHES[id]?.image;
}

export function ExamplePlaceCard({ poi, style }: { poi: Poi; style?: object }) {
  const { t } = useTranslation();
  return (
    <View style={[{ marginHorizontal: spacing.md }, style]}>
      <PlaceCard poi={poi} override={placeOverride(poi, t)} />
    </View>
  );
}

/** Photo and credit for a dish card: the admin photo, otherwise the bundled example. */
export function dishPhoto(dish: { id: string; image?: string }) {
  return { image: dishImageSource(dish.id, dish.image), credit: dish.image ? undefined : EXAMPLE_DISHES[dish.id]?.credit };
}

/** Extra photo/texts for the example beach (same with and without the code). */
export function beachExtras(beach: { id: string; image?: string }, t: (k: string) => string) {
  const own = beach.image ? { image: { uri: beach.image } } : {};
  if (beach.id !== EXAMPLE_BEACH.id) return own;
  return {
    image: beach.image ? { uri: beach.image } : (EXAMPLE_BEACH.image as number),
    credit: beach.image ? undefined : EXAMPLE_BEACH.credit,
    extra: { desc: t("ui.ex.beach_extra"), howTo: t("ui.ex.beach_howto"), tip: t("ui.ex.beach_tip"), mustSee: true },
  };
}

export function ExampleDishCard({ dish, style }: { dish: MergedDish; style?: object }) {
  return (
    <View style={[{ marginHorizontal: spacing.md }, style]}>
      <DishCard dish={dish} {...dishPhoto(dish)} />
    </View>
  );
}

export function ExampleBeachCard({ beach, windName, style }: { beach: Beach; windName: string; style?: object }) {
  const { t } = useTranslation();
  return (
    <View style={[{ marginHorizontal: spacing.md }, style]}>
      <BeachCard beach={beach} windName={windName} {...beachExtras(beach as { id: string; image?: string }, t)} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, overflow: "hidden", marginHorizontal: spacing.md },
  photo: { width: "100%", aspectRatio: 16 / 10, backgroundColor: c.surfaceTertiary },
  photoImg: { width: "100%", height: "100%" },
  badges: { position: "absolute", top: 10, left: 10, right: 10, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: { overflow: "hidden", fontSize: 12, fontWeight: "700", fontFamily: fonts.body, color: "#FFFFFF", backgroundColor: "rgba(28,26,24,0.82)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeLight: { backgroundColor: "rgba(255,255,255,0.93)", color: "#2C2A28" },
  badgeStar: { backgroundColor: "#B4613F", marginLeft: "auto" },
  credit: { position: "absolute", right: 6, bottom: 6, maxWidth: "92%", fontSize: 10, color: "#FFFFFF", backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  body: { padding: spacing.md, gap: 10 },
  title: { color: c.onSurface, fontSize: 22, lineHeight: 26, fontFamily: fonts.heading },
  sub: { color: c.muted, fontSize: 13, fontFamily: fonts.body, marginTop: -6 },
  desc: { color: c.onSurfaceSecondary, fontSize: 15, lineHeight: 22, fontFamily: fonts.body },
  box: { gap: 8, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceTertiary },
  boxLabel: { color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", fontFamily: fonts.body },
  boxValue: { color: c.onSurface, fontSize: 14, lineHeight: 20, fontFamily: fonts.body },
  link: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  linkTxt: { color: c.brandPrimary, fontSize: 14, fontWeight: "700", fontFamily: fonts.body },
  tip: { color: c.onSurface, fontSize: 14, lineHeight: 20, fontFamily: fonts.body, backgroundColor: c.terracottaSoft, padding: spacing.sm, borderRadius: radius.md, overflow: "hidden" },
  tipTitle: { color: c.brandPrimary, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { overflow: "hidden", color: c.olive, backgroundColor: c.olive + "1F", fontSize: 13, fontWeight: "600", fontFamily: fonts.body, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  status: { alignSelf: "flex-start", overflow: "hidden", fontSize: 13, fontWeight: "700", fontFamily: fonts.body, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  addBig: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: c.brandPrimary },
  addBigTxt: { color: c.brandPrimary, fontSize: 15, fontWeight: "700", fontFamily: fonts.body },
  freeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  freeTxt: { color: c.olive, fontSize: 12, fontWeight: "700", letterSpacing: 1, fontFamily: fonts.body },
  freeLine: { flex: 1, height: 1, backgroundColor: c.border },
}));
