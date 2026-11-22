import React, { useMemo, useState } from "react";
import { View, Text, FlatList, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";

import { Header } from "@/src/components/Header";
import { ChipRow, EmptyState, Loading, Field } from "@/src/components/ui";
import { IconName } from "@/src/components/Icon";
import { makeStyles } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { usePois, Poi } from "@/src/lib/queries";
import { ItineraryFab } from "@/src/components/ItineraryFab";
import { useGuestAccess } from "@/src/lib/guestAccess";
import { LockedSection, UnlockedNote } from "@/src/components/LockedSection";
import { ExamplePlaceCard, FreeLabel } from "@/src/components/GuestExamples";
import { PlaceCard } from "@/src/components/PlaceCard";


const FREE_PLACES = ["Cattedrale di Palermo", "Tempio di Segesta"];

export default function PlacesScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const pois = usePois();
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const { unlocked } = useGuestAccess();

  const chips = [
    { key: "all", label: t("map_page.title"), icon: "map-marker-multiple" as IconName },
    { key: "art", label: t("map_page.categories.art"), icon: "bank" as IconName },
    { key: "beach", label: t("map_page.categories.beach"), icon: "beach" as IconName },
    { key: "nature", label: t("map_page.categories.nature"), icon: "pine-tree" as IconName },
  ];

  const filtered = useMemo(() => {
    let list = pois.data ?? [];
    if (cat !== "all") list = list.filter((p) => p.category === cat);
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(needle) || (p.town ?? "").toLowerCase().includes(needle),
      );
    }
    return list;
  }, [pois.data, cat, q]);
  const { width } = useWindowDimensions();
  const cols = width >= 1100 ? 3 : width >= 600 ? 2 : 1;
  // must-see first, then with a photo, then by name
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => Number(!!b.must_see) - Number(!!a.must_see) || Number(!!b.image_url) - Number(!!a.image_url) || a.name.localeCompare(b.name)),
    [filtered],
  );
  const examples = (pois.data ?? []).filter((p) => FREE_PLACES.includes(p.name));
  const lockedNames = (pois.data ?? []).filter((p) => !FREE_PLACES.includes(p.name)).slice(0, 6).map((p) => p.name);


  const renderItem = ({ item }: { item: Poi }) => (
    <View style={{ flex: 1 }}>
      <PlaceCard poi={item} />
    </View>
  );

  return (
    <View style={s.screen}>
      <Header title={t("services.places_title")} kicker={t("services.kicker")} showBack />
      {unlocked ? (
        <>
          <View style={s.searchWrap}>
            <Field value={q} onChangeText={setQ} placeholder={t("map_page.search_placeholder")} icon="magnify" testID="poi-search" />
          </View>
          <ChipRow items={chips} selected={cat} onSelect={setCat} />
        </>
      ) : null}
      {pois.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          testID="poi-list"
          key={cols}
          data={unlocked ? sorted : []}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          numColumns={cols}
          columnWrapperStyle={cols > 1 ? { gap: spacing.md } : undefined}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }}
          ListHeaderComponent={
            unlocked ? (
              <View>
                <UnlockedNote />
                <Text style={s.count}>{filtered.length} {t("map_page.itinerary_count")}</Text>
              </View>
            ) : (
              <View style={{ gap: spacing.md, marginHorizontal: -spacing.md }}>
                <View style={{ paddingHorizontal: spacing.md }}>
                  <FreeLabel />
                </View>
                <View style={{ flexDirection: cols > 1 ? "row" : "column", gap: spacing.md, paddingHorizontal: cols > 1 ? spacing.md : 0 }}>
                  {examples.map((p) => (
                    <ExamplePlaceCard key={p.id} poi={p} style={cols > 1 ? { flex: 1, marginHorizontal: 0 } : undefined} />
                  ))}
                </View>
              </View>
            )
          }
          ListFooterComponent={
            unlocked ? null : (
              <LockedSection
                compact
                names={lockedNames}
                title={t("lock.places_title", { count: Math.max(0, (pois.data?.length ?? 0) - examples.length) })}
                text={t("lock.places_text")}
              />
            )
          }
          ListEmptyComponent={unlocked ? <EmptyState icon="map-search-outline" title={t("map_page.no_results")} /> : null}
          showsVerticalScrollIndicator={false}
        />
      )}
      <ItineraryFab />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  addBtn: { alignItems: "center", justifyContent: "center", gap: 2, minWidth: 64, paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.md, borderWidth: 1, borderColor: c.brandPrimary },
  addTxt: { color: c.brandPrimary, fontSize: 10, fontWeight: "700", fontFamily: fonts.body },
  screen: { flex: 1, backgroundColor: c.surface },
  searchWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  count: { color: c.muted, fontSize: 12, fontFamily: fonts.body, marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: c.border,
  },
  thumb: { width: 64, height: 64, borderRadius: radius.md, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  thumbImg: { width: "100%", height: "100%" },
  cardTitle: { color: c.onSurface, fontSize: 16, fontFamily: fonts.heading },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  metaTxt: { color: c.muted, fontSize: 12, fontFamily: fonts.body },
  cardDesc: { color: c.onSurfaceSecondary, fontSize: 13, marginTop: 4, fontFamily: fonts.body, lineHeight: 18 },
  dirBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
}));
