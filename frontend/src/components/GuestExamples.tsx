import React from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { Image } from "expo-image";

import { Icon } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import type { Poi } from "@/src/lib/queries";
import { useItinerary } from "@/src/lib/itinerary";
import type { Dish } from "@/src/lib/culinary";
import { analyzeBeach, type Beach } from "@/src/lib/beaches";

// Free example cards shown to guests without a booking code (same look as the approved preview).
// Texts and photos of the examples live here; the rest of each section stays behind the code.

const HOME = { lat: 38.0667, lng: 13.0333 };
function kmFromHome(lat: number, lng: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(lat - HOME.lat) / 2) ** 2 + Math.cos(r(HOME.lat)) * Math.cos(r(lat)) * Math.sin(r(lng - HOME.lng) / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}

export const EXAMPLE_PLACES: Record<string, { image: number; credit: string; description: string; duration: string; tip: string }> = {
  "Cattedrale di Palermo": {
    image: require("../../assets/images/examples/cattedrale-di-palermo.jpg"),
    credit: "Pava, pubblico dominio (Wikimedia Commons)",
    description:
      "Il simbolo di Palermo. Iniziata nel 1185, mescola stili normanno, gotico, catalano e neoclassico. Dentro ci sono le tombe reali di Ruggero II e Federico II; dai tetti si vede tutta la città.",
    duration: "1–2 ore (con tetti e tesoro)",
    tip: "Sali sui tetti verso il tramonto: la luce sulla città è bellissima. In chiesa servono spalle e gambe coperte.",
  },
  "Tempio di Segesta": {
    image: require("../../assets/images/examples/tempio-di-segesta.jpg"),
    credit: "Ludvig14, CC BY-SA 4.0 (Wikimedia Commons)",
    description: "Tempio dorico del V secolo a.C. in mezzo alla campagna, quasi intatto. È uno dei templi greci meglio conservati al mondo.",
    duration: "1–2 ore (con il teatro)",
    tip: "A circa 30 minuti da Trappeto: vai al mattino presto o nel tardo pomeriggio.",
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
  extra: "È la caletta più fotografata delle Egadi.",
  howTo: "Aliscafo Trapani–Favignana, poi bici o scooter (circa 4 km dal porto)",
  tip: "Niente servizi né ombra: porta acqua, cappello e scarpette da scoglio. Arriva presto: a metà mattina è già piena.",
};

function Photo({ source, credit, badges }: { source: number | string; credit: string; badges: { text: string; kind: "dark" | "light" | "star" }[] }) {
  const s = useStyles();
  return (
    <View style={s.photo}>
      <Image source={source} style={s.photoImg} contentFit="cover" transition={200} />
      <View style={s.badges}>
        {badges.map((b) => (
          <Text key={b.text} style={[s.badge, b.kind === "light" && s.badgeLight, b.kind === "star" && s.badgeStar]}>
            {b.text}
          </Text>
        ))}
      </View>
      <Text style={s.credit} numberOfLines={1}>
        Foto: {credit}
      </Text>
    </View>
  );
}

function InfoBox({ rows }: { rows: { label: string; value?: React.ReactNode }[] }) {
  const s = useStyles();
  const shown = rows.filter((r) => r.value);
  if (!shown.length) return null;
  return (
    <View style={s.box}>
      {shown.map((r) => (
        <View key={r.label} style={{ gap: 2 }}>
          <Text style={s.boxLabel}>{r.label}</Text>
          {typeof r.value === "string" ? <Text style={s.boxValue}>{r.value}</Text> : r.value}
        </View>
      ))}
    </View>
  );
}

function Tip({ title, text }: { title: string; text: string }) {
  const s = useStyles();
  return (
    <Text style={s.tip}>
      <Text style={s.tipTitle}>{title} </Text>
      {text}
    </Text>
  );
}

export function FreeLabel({ text = "Esempio gratuito" }: { text?: string }) {
  const s = useStyles();
  return (
    <View style={s.freeRow}>
      <Text style={s.freeTxt}>{text.toUpperCase()}</Text>
      <View style={s.freeLine} />
    </View>
  );
}

export function ExamplePlaceCard({ poi }: { poi: Poi }) {
  const s = useStyles();
  const { colors } = useTheme();
  const ex = EXAMPLE_PLACES[poi.name];
  const ticket = poi.ticket_url;
  const { has, toggle } = useItinerary();
  const added = has(poi.id);
  return (
    <View style={s.card} testID={`example-place-${poi.id}`}>
      <Photo
        source={ex?.image ?? poi.image_url ?? ""}
        credit={ex?.credit ?? ""}
        badges={[
          { text: poi.town ?? "", kind: "dark" },
          { text: "🏛️ Arte e cultura", kind: "light" },
          { text: "★ Imperdibile", kind: "star" },
        ]}
      />
      <View style={s.body}>
        <Text style={s.title}>{poi.name}</Text>
        <Text style={s.sub}>a {kmFromHome(poi.lat, poi.lng)} km da Trappeto in linea d&apos;aria</Text>
        <Text style={s.desc}>{ex?.description ?? poi.description}</Text>
        <InfoBox
          rows={[
            { label: "Orari", value: poi.hours || "Variano con la stagione: controlla sul sito ufficiale prima di partire" },
            { label: "Prezzo", value: poi.price },
            { label: "Sconti", value: poi.discount },
            { label: "Durata della visita", value: poi.duration || ex?.duration },
            {
              label: "Biglietti",
              value: ticket ? (
                <Pressable onPress={() => Linking.openURL(ticket).catch(() => {})} accessibilityRole="link" style={s.link}>
                  <Text style={s.linkTxt}>Sito ufficiale</Text>
                  <Icon name="open-in-new" size={14} color={colors.brandPrimary} />
                </Pressable>
              ) : undefined,
            },
          ]}
        />
        {ex?.tip || poi.notes ? <Tip title="Il consiglio di Matteo:" text={ex?.tip ?? poi.notes ?? ""} /> : null}
        <Pressable
          testID={`example-add-${poi.id}`}
          onPress={() => toggle(poi.id)}
          style={[s.addBig, added && { backgroundColor: colors.brandPrimary }]}
          accessibilityRole="button"
        >
          <Icon name={added ? "check" : "plus"} size={18} color={added ? "#FFFFFF" : colors.brandPrimary} />
          <Text style={[s.addBigTxt, added && { color: "#FFFFFF" }]}>{added ? "Nel tuo itinerario" : "Aggiungi al tuo itinerario"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function ExampleDishCard({ dish }: { dish: Dish }) {
  const s = useStyles();
  const ex = EXAMPLE_DISHES[dish.id];
  return (
    <View style={s.card} testID={`example-dish-${dish.id}`}>
      {ex ? (
        <Photo source={ex.image} credit={ex.credit} badges={[{ text: dish.region, kind: "dark" }, { text: "Cibo di strada", kind: "light" }]} />
      ) : null}
      <View style={s.body}>
        <Text style={s.title}>{dish.name}</Text>
        <Text style={s.desc}>{dish.description}</Text>
        <FreeLabel text="Ingredienti" />
        <View style={s.chips}>
          {dish.ingredients.map((i) => (
            <Text key={i} style={s.chip}>
              {i}
            </Text>
          ))}
        </View>
        {dish.funFact ? <Tip title="Lo sapevi?" text={dish.funFact} /> : null}
      </View>
    </View>
  );
}

export function ExampleBeachCard({ beach, windName }: { beach: Beach; windName: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const bl = beach.it;
  const st = windName ? analyzeBeach(beach, windName) : "neutral";
  const status =
    st === "recommended"
      ? { txt: "✓ Consigliata oggi: riparata da questo vento", color: colors.success }
      : st === "avoid"
        ? { txt: "⚠️ Oggi sconsigliata: è esposta a questo vento", color: colors.error }
        : { txt: "Oggi nella media", color: colors.muted };
  return (
    <View style={s.card} testID={`example-beach-${beach.id}`}>
      <Photo
        source={EXAMPLE_BEACH.image}
        credit={EXAMPLE_BEACH.credit}
        badges={[
          { text: beach.location, kind: "dark" },
          { text: `🏖️ ${bl.type}`, kind: "light" },
          { text: "★ Imperdibile", kind: "star" },
        ]}
      />
      <View style={s.body}>
        {windName ? <Text style={[s.status, { color: status.color, backgroundColor: status.color + "1F" }]}>{status.txt}</Text> : null}
        <Text style={s.title}>{beach.name.replace(/\s*\(.*\)$/, "")}</Text>
        <Text style={s.sub}>{beach.location} · aliscafo da Trapani</Text>
        <Text style={s.desc}>
          {bl.desc} {EXAMPLE_BEACH.extra}
        </Text>
        <InfoBox
          rows={[
            { label: "Accesso", value: bl.access },
            { label: "Fondale", value: bl.seabed },
            { label: "Affollamento", value: bl.crowd },
            { label: "Da mangiare", value: bl.food },
            { label: "Come arrivare", value: EXAMPLE_BEACH.howTo },
            { label: "Parcheggio", value: bl.parking_info },
          ]}
        />
        <Tip title="Il consiglio di Matteo:" text={EXAMPLE_BEACH.tip} />
      </View>
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
