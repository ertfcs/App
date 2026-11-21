import React, { useState } from "react";
import { ScrollView, View, Text, Pressable, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { router, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Header } from "@/src/components/Header";
import { Button, Card, SectionTitle, Loading } from "@/src/components/ui";
import { Icon, IconName } from "@/src/components/Icon";
import { BookingReviews } from "@/src/components/BookingReviews";
import { PhotoViewer } from "@/src/components/PhotoViewer";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { useProperty, usePhotos, useAvailability } from "@/src/lib/queries";
import { euro } from "@/src/lib/format";
import { useGuestAccess } from "@/src/lib/guestAccess";

const HERO_IMG = require("../../assets/images/hero-trappeto.jpg");
const AMENITIES_PREVIEW = 6;

// What guests receive when booking here (texts in i18n "home_new.perk_<key>"); each row opens its section.
type Perk = { key: string; icon: IconName; href: Href; locked?: boolean };
const PERKS: Perk[] = [
  { key: "keyring", icon: "key-variant", href: "/booking" },
  { key: "itinerary", icon: "file-pdf-box", href: "/(guest)/map", locked: true },
];
const GUIDE: Perk[] = [
  { key: "places", icon: "bank-outline", href: "/places", locked: true },
  { key: "beaches", icon: "weather-windy", href: "/beaches", locked: true },
  { key: "festivals", icon: "calendar-star", href: "/festivals", locked: true },
  { key: "food", icon: "silverware-fork-knife", href: "/food", locked: true },
];

function PerkRow({ perk, label }: { perk: Perk; label: string }) {
  const s = useStyles();
  const { unlocked } = useGuestAccess();
  const { colors } = useTheme();
  return (
    <Pressable
      testID={`perk-${perk.key}`}
      accessibilityRole="link"
      onPress={() => router.push(perk.href)}
      style={({ pressed }) => [s.perk, pressed && { opacity: 0.7 }]}
    >
      <View style={s.perkIcon}>
        <Icon name={perk.icon} size={18} color={colors.brandPrimary} />
      </View>
      <Text style={s.perkTxt}>{label}</Text>
      {perk.locked && !unlocked ? <Icon name="lock-outline" size={16} color={colors.muted} /> : null}
      <Icon name="chevron-right" size={20} color={colors.muted} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { colors } = useTheme();
  const qc = useQueryClient();

  const property = useProperty();
  const photos = usePhotos();
  const availability = useAvailability();

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const { unlocked } = useGuestAccess();

  const av = availability.data;
  const amenities = showAllAmenities
    ? property.data?.amenities ?? []
    : (property.data?.amenities ?? []).slice(0, AMENITIES_PREVIEW);
  const onRefresh = () => {
    qc.invalidateQueries({ queryKey: ["property"] });
    qc.invalidateQueries({ queryKey: ["photos"] });
    qc.invalidateQueries({ queryKey: ["availability"] });
  };

  const features: { icon: IconName; label: string; value: number }[] = property.data
    ? [
        { icon: "bed-king-outline", label: t("property.feature_rooms"), value: property.data.rooms },
        { icon: "shower", label: t("property.feature_bathrooms"), value: property.data.bathrooms },
        { icon: "silverware-fork-knife", label: t("property.feature_kitchen"), value: property.data.kitchen },
        { icon: "sofa-outline", label: t("property.feature_living"), value: property.data.living_room },
        { icon: "account-group-outline", label: t("property.feature_max_guests"), value: property.data.max_guests },
      ]
    : [];

  return (
    <View style={s.screen}>
      <Header title={property.data?.name ?? "Appartamento Matteo"} kicker={t("hero.kicker")} />
      <ScrollView
        testID="home-scroll"
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
      >
        {/* Hero */}
        <View style={s.hero}>
          <Image source={HERO_IMG} style={s.heroImg} contentFit="cover" transition={300} />
          <LinearGradient colors={["rgba(44,42,40,0.1)", "rgba(44,42,40,0.75)"]} style={s.heroOverlay} />
          <View style={s.heroContent}>
            <Text style={s.heroTitle}>
              {t("hero.title_line1")} {t("hero.title_line2")}
            </Text>
            <Text style={s.heroSub}>{t("hero.subtitle")}</Text>
          </View>
        </View>

        <View style={s.body}>
          {/* 1. Prezzo + prenota */}
          <Animated.View entering={FadeInDown.delay(80)}>
            <Card style={{ marginTop: -spacing.xl }}>
              <View style={s.priceRow}>
                <View>
                  <Text style={s.priceKicker}>{t("booking.from")}</Text>
                  <Text style={s.price}>
                    {euro(av?.base_price ?? 80)}
                    <Text style={s.perNight}> {t("booking.per_night")}</Text>
                  </Text>
                </View>
                <View style={s.badge}>
                  <Icon name="tag-outline" size={14} color={colors.onOlive} />
                  <Text style={s.badgeTxt}>{t("home_new.no_fees_badge")}</Text>
                </View>
              </View>
              <Text style={s.perksTitle}>{t("home_new.perks_title")}</Text>
              <View style={s.codeNote}>
                <Icon name={unlocked ? "lock-open-variant" : "key-variant"} size={18} color={unlocked ? colors.success : colors.brandPrimary} />
                <Text style={s.codeNoteTxt}>{unlocked ? t("lock.home_unlocked") : t("lock.home_note")}</Text>
              </View>
              <View style={s.perks}>
                {PERKS.map((p) => (
                  <PerkRow key={p.key} perk={p} label={t(`home_new.perk_${p.key}`)} />
                ))}
                <View style={s.guide}>
                  <View style={s.guideHead}>
                    <Icon name="compass-outline" size={18} color={colors.olive} />
                    <Text style={s.guideTitle}>{t("home_new.guide_title")}</Text>
                  </View>
                  {GUIDE.map((p) => (
                    <PerkRow key={p.key} perk={p} label={t(`home_new.perk_${p.key}`)} />
                  ))}
                </View>
              </View>
              <Button
                testID="home-book-cta"
                label={t("booking.title")}
                icon="calendar-check"
                onPress={() => router.push("/booking")}
              />
            </Card>
          </Animated.View>

          {/* 2. Galleria */}
          {photos.data && photos.data.length > 0 ? (
            <View style={s.section}>
              <SectionTitle title={t("home_new.gallery_title")} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {photos.data.map((p, i) => (
                  <Pressable key={p.id} onPress={() => setViewerIndex(i)} testID={`gallery-photo-${i}`} accessibilityRole="imagebutton">
                    <Image source={{ uri: p.data_url }} style={s.galleryImg} contentFit="cover" transition={200} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* 3. L'appartamento */}
          {property.isLoading ? (
            <Loading />
          ) : (
            <View style={s.section}>
              <SectionTitle kicker={t("home_new.apartment_kicker")} title={property.data?.name ?? ""} />
              <Text style={s.desc} numberOfLines={showAllAmenities ? undefined : 4}>{property.data?.description}</Text>
              <View style={s.features}>
                {features.map((f) => (
                  <View key={f.label} style={s.feature}>
                    <Icon name={f.icon} size={22} color={colors.olive} />
                    <Text style={s.featureVal}>{f.value}</Text>
                    <Text style={s.featureLabel}>{f.label}</Text>
                  </View>
                ))}
              </View>
              <View style={s.amenities}>
                {amenities.map((a) => (
                  <View key={a} style={s.amenityChip}>
                    <Icon name="check-circle-outline" size={14} color={colors.olive} />
                    <Text style={s.amenityTxt}>{a}</Text>
                  </View>
                ))}
              </View>
              {(property.data?.amenities.length ?? 0) > AMENITIES_PREVIEW ? (
                <Pressable testID="home-amenities-toggle" onPress={() => setShowAllAmenities((v) => !v)} style={s.linkBtn}>
                  <Text style={s.linkTxt}>
                    {showAllAmenities
                      ? t("home_new.less")
                      : t("home_new.all_amenities", { count: property.data?.amenities.length ?? 0 })}
                  </Text>
                  <Icon name={showAllAmenities ? "chevron-up" : "chevron-down"} size={18} color={colors.brandPrimary} />
                </Pressable>
              ) : null}
            </View>
          )}

          {/* 4. Recensioni */}
          <BookingReviews />

        </View>
      </ScrollView>

      {/* Festival popup */}
      <PhotoViewer
        photos={(photos.data ?? []).map((p) => ({ id: p.id, uri: p.data_url }))}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  festBackdrop: { flex: 1, backgroundColor: "rgba(44,42,40,0.5)", justifyContent: "center", padding: spacing.lg },
  festSheet: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, maxHeight: "80%" },
  festItem: { marginBottom: spacing.md, gap: spacing.sm },
  festHead: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  fpGlyph: { fontSize: 30 },
  fpName: { color: c.onSurface, fontSize: 18, fontFamily: fonts.heading, lineHeight: 21 },
  festMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  festPlace: { color: c.muted, fontSize: 12, fontFamily: fonts.body },
  festDateBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.terracottaSoft, paddingHorizontal: spacing.sm, paddingVertical: 7, borderRadius: radius.md, alignSelf: "flex-start" },
  festDateTxt: { color: c.brandPrimary, fontSize: 13, fontWeight: "700", fontFamily: fonts.body },
  festDesc: { color: c.onSurfaceSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.body },
  festCuriosity: { flexDirection: "row", gap: 6, backgroundColor: c.surfaceTertiary, padding: spacing.sm, borderRadius: radius.md },
  festNote: { color: c.warning, fontSize: 12, lineHeight: 17, fontFamily: fonts.body },
  festCuriosityTxt: { color: c.onSurfaceSecondary, fontSize: 13, lineHeight: 18, flex: 1, fontStyle: "italic", fontFamily: fonts.body },
  hero: { height: 340, backgroundColor: c.surfaceInverse },
  heroImg: { width: "100%", height: "100%" },
  heroOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, top: 0 },
  heroContent: { position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.xl },
  heroTitle: { color: "#FFFFFF", fontSize: 42, fontFamily: fonts.heading, lineHeight: 44 },
  heroSub: { color: "rgba(255,255,255,0.9)", fontSize: 14, marginTop: spacing.sm, fontFamily: fonts.body },
  body: { paddingHorizontal: spacing.md },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  priceKicker: { color: c.muted, fontSize: 11, letterSpacing: 1, fontFamily: fonts.body, textTransform: "uppercase" },
  price: { color: c.onSurface, fontSize: 30, fontFamily: fonts.heading },
  perNight: { fontSize: 14, color: c.muted, fontFamily: fonts.body },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.olive, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  badgeTxt: { color: c.onOlive, fontSize: 12, fontWeight: "700", fontFamily: fonts.body },
  section: { marginTop: spacing.xl },
  desc: { color: c.onSurfaceSecondary, fontSize: 15, lineHeight: 23, fontFamily: fonts.body },
  features: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  feature: {
    alignItems: "center",
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
    flexGrow: 1,
    minWidth: 90,
    gap: 2,
  },
  featureVal: { color: c.onSurface, fontSize: 20, fontFamily: fonts.heading, marginTop: 4 },
  featureLabel: { color: c.muted, fontSize: 11, fontFamily: fonts.body, textAlign: "center" },
  amenities: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  amenityChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.surfaceTertiary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  amenityTxt: { color: c.onSurfaceTertiary, fontSize: 13, fontFamily: fonts.body },
  galleryImg: { width: 240, height: 170, borderRadius: radius.md, backgroundColor: c.surfaceTertiary },
  help: { color: c.muted, fontSize: 13, marginBottom: spacing.sm, fontFamily: fonts.body },
  legend: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.sm, paddingHorizontal: spacing.sm, paddingBottom: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendTxt: { color: c.muted, fontSize: 12, fontFamily: fonts.body },
  mapCta: { height: 200, borderRadius: radius.lg, overflow: "hidden" },
  mapCtaImg: { width: "100%", height: "100%" },
  foodCta: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.brandPrimary, borderRadius: radius.lg, padding: spacing.md },
  foodGlyphs: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", flexDirection: "row", flexWrap: "wrap" },
  foodGlyph: { fontSize: 18 },
  foodKicker: { color: "rgba(255,255,255,0.85)", fontSize: 10, letterSpacing: 2, fontFamily: fonts.body },
  foodTitle: { color: "#fff", fontSize: 19, fontFamily: fonts.heading, marginTop: 2 },
  foodSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: fonts.body, marginTop: 2 },
  festRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.sm },
  festGlyph: { fontSize: 24, width: 40, height: 40, textAlign: "center", lineHeight: 40, backgroundColor: c.surfaceTertiary, borderRadius: radius.sm, overflow: "hidden" },
  festName: { color: c.onSurface, fontSize: 14, fontFamily: fonts.heading },
  festMeta: { color: c.muted, fontSize: 12, fontFamily: fonts.body, marginTop: 1 },
  miniCta: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.md, gap: 4 },
  miniCtaTitle: { color: c.onSurface, fontSize: 16, fontFamily: fonts.heading, marginTop: 4 },
  miniCtaSub: { color: c.muted, fontSize: 12, fontFamily: fonts.body },
  mapCtaOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  mapCtaContent: { position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md, gap: spacing.sm },
  mapCtaKicker: { color: "rgba(255,255,255,0.85)", fontSize: 10, letterSpacing: 2, fontFamily: fonts.body },
  mapCtaTitle: { color: "#FFFFFF", fontSize: 24, fontFamily: fonts.heading, lineHeight: 27 },
  mapCtaBtn: { alignSelf: "flex-start", backgroundColor: "#FFFFFF", paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.pill },
  mapCtaBtnTxt: { color: c.onSurface, fontWeight: "600", fontFamily: fonts.body },
  codeNote: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", backgroundColor: c.terracottaSoft, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md },
  codeNoteTxt: { flex: 1, color: c.onSurface, fontSize: 13, lineHeight: 19, fontFamily: fonts.body },
  perksTitle: { color: c.onSurface, fontSize: 15, fontWeight: "700", fontFamily: fonts.body, marginBottom: spacing.sm },
  perks: { gap: 10, marginBottom: spacing.md },
  perk: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 2 },
  perkIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.terracottaSoft, alignItems: "center", justifyContent: "center" },
  guide: { gap: 10, padding: spacing.sm, borderRadius: radius.md, backgroundColor: c.surfaceTertiary },
  guideHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  guideTitle: { color: c.onSurface, fontSize: 14, fontWeight: "700", fontFamily: fonts.body },
  perkTxt: { flex: 1, color: c.onSurfaceSecondary, fontSize: 14, lineHeight: 19, fontFamily: fonts.body },
  services: { gap: spacing.sm },
  service: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.md },
  serviceIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.terracottaSoft, alignItems: "center", justifyContent: "center" },
  serviceTitle: { color: c.onSurface, fontSize: 16, fontFamily: fonts.heading },
  serviceSub: { color: c.onSurfaceSecondary, fontSize: 13, lineHeight: 18, fontFamily: fonts.body, marginTop: 2 },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginTop: spacing.sm, paddingVertical: 6 },
  linkTxt: { color: c.brandPrimary, fontSize: 14, fontWeight: "600", fontFamily: fonts.body },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: { flexBasis: "47%", flexGrow: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.md, gap: 4, minHeight: 120 },
  tileGlyph: { fontSize: 28 },
  tileTitle: { color: c.onSurface, fontSize: 17, fontFamily: fonts.heading, marginTop: 2 },
  tileSub: { color: c.muted, fontSize: 12, lineHeight: 16, fontFamily: fonts.body },
  endCard: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.lg, gap: spacing.sm },
  endTitle: { color: c.onSurface, fontSize: 22, fontFamily: fonts.heading, textAlign: "center" },
  endSub: { color: c.onSurfaceSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.body, textAlign: "center", marginBottom: spacing.sm },
  waBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border },
  waTxt: { color: c.onSurface, fontSize: 15, fontWeight: "600", fontFamily: fonts.body },
}));
