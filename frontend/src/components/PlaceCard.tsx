import React from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";

import { Icon, IconName } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { mediaUri } from "@/src/lib/api";
import { poiText, type Poi } from "@/src/lib/queries";
import { useItinerary } from "@/src/lib/itinerary";

// Attraction card: photo with badges, description, practical info, tip, "add to itinerary" + map button.
// `override` lets the free example cards use translated texts and a bundled photo.

const HOME = { lat: 38.0667, lng: 13.0333 };
export function kmFromHome(lat: number, lng: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(lat - HOME.lat) / 2) ** 2 + Math.cos(r(HOME.lat)) * Math.cos(r(lat)) * Math.sin(r(lng - HOME.lng) / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}

const CAT: Record<string, { emoji: string; icon: IconName }> = {
  art: { emoji: "🏛️", icon: "bank-outline" },
  beach: { emoji: "🏖️", icon: "beach" },
  nature: { emoji: "🌿", icon: "pine-tree" },
};

export function mapsUrl(p: Poi) {
  if (p.maps_url) return p.maps_url;
  const q = p.maps_query?.trim();
  return q
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
    : `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}

export type PlaceOverride = { image?: number; credit?: string; description?: string; duration?: string; tip?: string };

export function PlaceCard({ poi, override }: { poi: Poi; override?: PlaceOverride }) {
  const { t, i18n } = useTranslation();
  const s = useStyles();
  const { colors } = useTheme();
  const { has, toggle } = useItinerary();
  const L = (f: keyof Poi & string) => poiText(poi, f, i18n.language);
  const added = has(poi.id);
  const cat = CAT[poi.category] ?? CAT.art;
  const image = override?.image ?? (poi.image_url ? { uri: mediaUri(poi.image_url) } : null);
  const tip = override?.tip ?? L("notes");

  const duration = override?.duration ?? L("duration");
  const rows: { key: string; parts: { icon: string; label: string; value?: string }[] }[] = [
    { key: "h", parts: [{ icon: "🕒", label: t("ui.ex.hours"), value: L("hours") }] },
    { key: "dp", parts: [{ icon: "⏳", label: t("ui.ex.duration"), value: duration }, { icon: "💶", label: t("ui.ex.price"), value: L("price") }] },
    { key: "d", parts: [{ icon: "🏷️", label: t("ui.ex.discounts"), value: L("discount") }] },
    { key: "m", parts: [{ icon: "🚗", label: t("ui.place.how_to"), value: L("how_to") }] },
  ];
  const shownRows = rows.map((r) => ({ ...r, parts: r.parts.filter((p) => p.value) })).filter((r) => r.parts.length);

  return (
    <View style={s.card} testID={`place-${poi.id}`}>
      <View style={s.photo}>
        {image ? (
          <Image source={image} style={s.photoImg} contentFit="cover" transition={200} />
        ) : (
          <View style={[s.photoImg, s.noPhoto]}>
            <Icon name={cat.icon} size={44} color={colors.muted} />
          </View>
        )}
        <View style={s.badges}>
          {poi.town ? <Text style={s.badge}>{poi.town}</Text> : null}
          <Text style={[s.badge, s.badgeLight]}>
            {cat.emoji} {t(`map_page.categories.${poi.category}`)}
          </Text>
          {poi.must_see ? <Text style={[s.badge, s.badgeStar]}>{t("ui.ex.must")}</Text> : null}
        </View>
        {override?.credit ? (
          <Text style={s.credit} numberOfLines={1}>
            Foto: {override.credit}
          </Text>
        ) : null}
      </View>

      <View style={s.body}>
        <Text style={s.title}>{poi.name}</Text>
        <Text style={s.sub}>{t("ui.ex.km", { km: kmFromHome(poi.lat, poi.lng) })}</Text>
        {override?.description ?? L("description") ? <Text style={s.desc}>{override?.description ?? L("description")}</Text> : null}

        {shownRows.length || poi.ticket_url ? (
          <View style={s.box}>
            {shownRows.map((r) => (
              <Text key={r.key} style={s.row}>
                {r.parts.map((p, i) => (
                  <Text key={p.label}>
                    {i > 0 ? "  •  " : ""}
                    <Text style={s.rowLabel}>
                      {p.icon} {p.label}:{" "}
                    </Text>
                    {p.value}
                  </Text>
                ))}
              </Text>
            ))}
            {poi.ticket_url ? (
              <Pressable onPress={() => Linking.openURL(poi.ticket_url!).catch(() => {})} accessibilityRole="link" style={s.link} testID={`place-tickets-${poi.id}`}>
                <Text style={s.rowLabel}>🎟️ {t("ui.ex.tickets")}: </Text>
                <Text style={s.linkTxt}>{t("ui.ex.official_site")}</Text>
                <Icon name="open-in-new" size={14} color={colors.brandPrimary} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {tip ? (
          <Text style={s.tip}>
            <Text style={s.tipTitle}>💡 {override?.tip ? t("ui.ex.tip") : t("ui.place.note")} </Text>
            {tip}
          </Text>
        ) : null}

        <View style={s.actions}>
          <Pressable
            testID={`place-add-${poi.id}`}
            onPress={() => toggle(poi.id)}
            style={({ pressed }) => [s.addBtn, added && s.addBtnOn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Icon name={added ? "check" : "calendar-plus"} size={18} color={added ? colors.brandPrimary : "#FFFFFF"} />
            <Text style={[s.addTxt, added && { color: colors.brandPrimary }]}>{added ? t("ui.ex.added") : t("ui.place.add")}</Text>
          </Pressable>
          <Pressable
            testID={`place-map-${poi.id}`}
            onPress={() => Linking.openURL(mapsUrl(poi)).catch(() => {})}
            style={({ pressed }) => [s.mapBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="link"
            accessibilityLabel={t("ui.place.open_map")}
          >
            <Text style={{ fontSize: 18 }}>📍</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  photo: { width: "100%", aspectRatio: 16 / 9, backgroundColor: c.surfaceTertiary },
  photoImg: { width: "100%", height: "100%" },
  noPhoto: { alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceTertiary },
  badges: { position: "absolute", top: 10, left: 10, right: 10, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: { overflow: "hidden", fontSize: 11, fontWeight: "700", fontFamily: fonts.body, color: "#FFFFFF", backgroundColor: "rgba(28,26,24,0.82)", paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  badgeLight: { backgroundColor: "rgba(255,255,255,0.93)", color: "#2C2A28" },
  badgeStar: { backgroundColor: "#B4613F", marginLeft: "auto" },
  credit: { position: "absolute", right: 6, bottom: 6, maxWidth: "92%", fontSize: 10, color: "#FFFFFF", backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  body: { padding: 14, gap: 8, flexGrow: 1 },
  title: { color: c.onSurface, fontSize: 18, lineHeight: 22, fontFamily: fonts.heading },
  sub: { color: c.muted, fontSize: 11, fontFamily: fonts.body, marginTop: -5 },
  desc: { color: c.onSurfaceSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.body },
  box: { gap: 5, padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceTertiary },
  row: { color: c.onSurfaceSecondary, fontSize: 13, lineHeight: 18, fontFamily: fonts.body },
  rowLabel: { color: c.onSurface, fontWeight: "700" },
  link: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  linkTxt: { color: c.brandPrimary, fontSize: 13, fontWeight: "700", fontFamily: fonts.body },
  tip: { color: c.onSurface, fontSize: 13, lineHeight: 18, fontFamily: fonts.body, backgroundColor: c.terracottaSoft, padding: 10, borderRadius: radius.md, overflow: "hidden" },
  tipTitle: { color: c.brandPrimary, fontWeight: "700" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: "auto", paddingTop: 4 },
  addBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, borderRadius: radius.md, backgroundColor: c.brandPrimary, borderWidth: 1, borderColor: c.brandPrimary },
  addBtnOn: { backgroundColor: c.surfaceSecondary },
  addTxt: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", fontFamily: fonts.body },
  mapBtn: { width: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceTertiary },
}));
