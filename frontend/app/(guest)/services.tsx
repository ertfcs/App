import React, { useMemo } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { router, type Href } from "expo-router";

import { Header } from "@/src/components/Header";
import { Icon, IconName } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { upcomingFestivals } from "@/src/lib/festivals";
import { useGuestAccess } from "@/src/lib/guestAccess";
import { LockedSection, UnlockedNote } from "@/src/components/LockedSection";

// The guest services, each opening its own section (texts in i18n "services.<key>_*").
type Service = { key: string; icon: IconName; href: Href };
const GUIDE: Service[] = [
  { key: "places", icon: "bank-outline", href: "/places" },
  { key: "beaches", icon: "weather-windy", href: "/beaches" },
  { key: "festivals", icon: "calendar-star", href: "/festivals" },
  { key: "food", icon: "silverware-fork-knife", href: "/food" },
];
const OTHERS: Service[] = [
  { key: "itinerary", icon: "map-marker-path", href: "/(guest)/map" },
  { key: "keyring", icon: "key-variant", href: "/booking" },
];

export default function ServicesScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { colors } = useTheme();
  const { unlocked } = useGuestAccess();
  const nextFestival = useMemo(() => upcomingFestivals()[0], []);

  return (
    <View style={s.screen}>
      <Header title={t("services.title")} kicker={t("services.kicker")} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>{t("services.intro")}</Text>
        {unlocked ? <UnlockedNote /> : <LockedSection compact title={t("lock.services_title")} text={t("lock.services_text")} />}
        <Text style={s.group}>{t("services.guide_title")}</Text>
        {GUIDE.map((sv) => (
          <Pressable
            key={sv.key}
            testID={`service-${sv.key}`}
            accessibilityRole="button"
            style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
            onPress={() => router.push(sv.href)}
          >
            <View style={s.iconWrap}>
              <Icon name={sv.icon} size={26} color={colors.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{t(`services.${sv.key}_title`)}</Text>
              <Text style={s.sub}>
                {sv.key === "festivals" && nextFestival
                  ? t("services.festivals_next", { name: nextFestival.name, date: nextFestival.dateLabel })
                  : t(`services.${sv.key}_sub`)}
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.muted} />
          </Pressable>
        ))}
        <Text style={s.group}>{t("services.others_title")}</Text>
        {OTHERS.map((sv) => (
          <Pressable
            key={sv.key}
            testID={`service-${sv.key}`}
            accessibilityRole="button"
            style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
            onPress={() => router.push(sv.href)}
          >
            <View style={s.iconWrap}>
              <Icon name={sv.icon} size={26} color={colors.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{t(`services.${sv.key}_title`)}</Text>
              <Text style={s.sub}>
                {sv.key === "festivals" && nextFestival
                  ? t("services.festivals_next", { name: nextFestival.name, date: nextFestival.dateLabel })
                  : t(`services.${sv.key}_sub`)}
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  group: { color: c.olive, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", fontFamily: fonts.body, marginTop: spacing.md },
  intro: { color: c.onSurfaceSecondary, fontSize: 15, lineHeight: 22, fontFamily: fonts.body, marginBottom: spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
  },
  iconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.terracottaSoft, alignItems: "center", justifyContent: "center" },
  title: { color: c.onSurface, fontSize: 17, fontFamily: fonts.heading },
  sub: { color: c.onSurfaceSecondary, fontSize: 13, lineHeight: 18, fontFamily: fonts.body, marginTop: 2 },
}));
