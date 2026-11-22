import React, { useMemo } from "react";
import { ScrollView, View, Text, Pressable, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { router, type Href } from "expo-router";

import { Header } from "@/src/components/Header";
import { Icon, IconName } from "@/src/components/Icon";
import { makeStyles } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { upcomingFestivals } from "@/src/lib/festivals";
import { localizeFestival } from "@/src/lib/festivalsI18n";
import { useGuestAccess } from "@/src/lib/guestAccess";
import { LockedSection, UnlockedNote } from "@/src/components/LockedSection";

// The four territory guides as colour tiles (soft bohemian palette, readable in both themes).
type Tile = { key: string; icon: IconName; href: Href; bg: string; ink: string; locked: boolean };
const TILES: Tile[] = [
  { key: "places", icon: "bank-outline", href: "/places", bg: "#F3DCCD", ink: "#8A4A2B", locked: true },
  { key: "beaches", icon: "umbrella-beach-outline", href: "/beaches", bg: "#D3E4E6", ink: "#36616B", locked: true },
  { key: "food", icon: "silverware-fork-knife", href: "/food", bg: "#DFE7D2", ink: "#4E5E40", locked: true },
  { key: "festivals", icon: "party-popper", href: "/festivals", bg: "#F2E5BF", ink: "#7A5E1C", locked: false },
];

export default function ServicesScreen() {
  const { t, i18n } = useTranslation();
  const s = useStyles();
  const { width } = useWindowDimensions();
  const { unlocked } = useGuestAccess();
  const nextFestival = useMemo(() => upcomingFestivals()[0], []);
  const wide = width >= 760;

  return (
    <View style={s.screen}>
      <Header title={t("services.title")} kicker={t("services.kicker")} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>{t("services.intro")}</Text>
        {unlocked ? <UnlockedNote /> : <LockedSection compact title={t("lock.services_title")} text={t("lock.services_text")} />}
        <Text style={s.group}>{t("services.guide_title")}</Text>
        <View style={s.grid}>
          {TILES.map((tl) => (
            <Pressable
              key={tl.key}
              testID={`service-${tl.key}`}
              accessibilityRole="button"
              onPress={() => router.push(tl.href)}
              style={({ pressed }) => [s.tile, { backgroundColor: tl.bg, flexBasis: wide ? "23%" : "47%" }, pressed && { opacity: 0.85 }]}
            >
              <View style={s.tileIcon}>
                <Icon name={tl.icon} size={30} color={tl.ink} />
              </View>
              <Text style={[s.tileTitle, { color: tl.ink }]}>{t(`services.${tl.key}_short`)}</Text>
              <Text style={s.tileSub} numberOfLines={3}>
                {tl.key === "festivals" && nextFestival ? t("services.festivals_next_short", { name: localizeFestival(nextFestival, i18n.language).name }) : t(`services.${tl.key}_tile`)}
              </Text>
              {tl.locked && !unlocked ? (
                <View style={s.pastelPill}>
                  <Text style={s.pastelTxt}>{t("lock.see_preview")}</Text>
                </View>
              ) : (
                <View style={[s.pastelPill, { backgroundColor: "rgba(255,255,255,0.6)" }]}>
                  <Text style={[s.pastelTxt, { color: tl.ink }]}>{t("services.open")}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  intro: { color: c.onSurfaceSecondary, fontSize: 15, lineHeight: 22, fontFamily: fonts.body, marginBottom: spacing.sm },
  group: { color: c.olive, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", fontFamily: fonts.body, marginTop: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: { flexGrow: 1, borderRadius: radius.lg, padding: spacing.md, gap: 6, minHeight: 190 },
  tileIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.65)", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  tileTitle: { fontSize: 20, lineHeight: 24, fontFamily: fonts.heading },
  tileSub: { color: "#3B3631", fontSize: 13, lineHeight: 18, fontFamily: fonts.body, flexGrow: 1 },
  pastelPill: { alignSelf: "flex-start", backgroundColor: "#DCE6D2", paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  pastelTxt: { color: "#4E5E40", fontSize: 11, fontWeight: "700", fontFamily: fonts.body, letterSpacing: 0.2 },
}));
