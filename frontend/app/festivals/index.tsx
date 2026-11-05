import React, { useMemo, useState } from "react";
import { View, Text, FlatList } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Header } from "@/src/components/Header";
import { Card, ChipRow } from "@/src/components/ui";
import { Icon, IconName } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { upcomingFestivals, Festival, FESTIVAL_COUNT } from "@/src/lib/festivals";

const CAT_META: Record<Festival["category"], { icon: IconName; label: string }> = {
  religiosa: { icon: "church", label: "Festa religiosa" },
  sagra: { icon: "food-drumstick-outline", label: "Sagra" },
  folklore: { icon: "drama-masks", label: "Folklore" },
  nazionale: { icon: "flag-variant", label: "Festività" },
};

const FILTERS: { key: string; label: string; icon: IconName }[] = [
  { key: "all", label: "Tutte", icon: "calendar-star" },
  { key: "PA", label: "Palermo", icon: "map-marker" },
  { key: "TP", label: "Trapani", icon: "map-marker" },
  { key: "sagra", label: "Sagre", icon: "food-drumstick-outline" },
  { key: "nazionale", label: "Festività nazionali", icon: "flag-variant" },
];

export default function FestivalsScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const [filter, setFilter] = useState("all");
  const all = useMemo(() => upcomingFestivals(), []);
  const sorted = useMemo(() => {
    if (filter === "all") return all;
    if (filter === "PA" || filter === "TP") return all.filter((f) => f.province === filter);
    return all.filter((f) => f.category === filter);
  }, [all, filter]);

  const renderItem = ({ item, index }: { item: Festival; index: number }) => {
    const meta = CAT_META[item.category];
    return (
      <Animated.View entering={FadeInDown.delay((index % 8) * 50)}>
        <Card style={{ gap: spacing.sm }} testID={`festival-${item.id}`}>
          <View style={s.head}>
            <View style={s.glyphWrap}>
              <Text style={s.glyph}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.catRow}>
                <Icon name={meta.icon} size={13} color={colors.brand} />
                <Text style={s.catTxt}>{meta.label.toUpperCase()}</Text>
              </View>
              <Text style={s.name}>{item.name}</Text>
              <View style={s.metaRow}>
                <Icon name="map-marker" size={13} color={colors.olive} />
                <Text style={s.place}>
                  {item.province === "IT" || item.province === "SIC" ? item.place : `${item.place} (${item.province})`}
                </Text>
              </View>
            </View>
          </View>

          <View style={s.dateBox}>
            <Icon name="calendar-star" size={16} color={colors.brandPrimary} />
            <Text style={s.dateTxt}>{item.dateLabel}</Text>
          </View>

          <Text style={s.desc}>{item.description}</Text>

          {item.curiosity ? (
            <View style={s.curiosity}>
              <Icon name="information-outline" size={15} color={colors.brand} />
              <Text style={s.curiosityTxt}>{item.curiosity}</Text>
            </View>
          ) : null}

          {item.note ? <Text style={s.note} testID={`festival-note-${item.id}`}>⚠️ {item.note}</Text> : null}
        </Card>
      </Animated.View>
    );
  };

  return (
    <View style={s.screen}>
      <Header title="Feste & Sagre" kicker="Palermo & Trapani" showBack />
      <FlatList
        testID="festivals-list"
        data={sorted}
        keyExtractor={(f) => f.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.intro}>
            <Text style={s.introTxt}>
              {FESTIVAL_COUNT} ricorrenze: i santi patroni di tutti i comuni delle province di Palermo e Trapani, sagre, riti tradizionali e festività nazionali. Elenco dei prossimi 12 mesi; le date segnate come "indicativo" vanno verificate sui siti ufficiali prima di partire.
            </Text>
            <View style={{ marginHorizontal: -spacing.md }}>
              <ChipRow items={FILTERS} selected={filter} onSelect={setFilter} />
            </View>
            <Text style={s.introTxt} testID="festivals-count">{sorted.length} eventi in elenco</Text>
          </View>
        }
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  intro: { marginBottom: spacing.xs },
  introTxt: { color: c.muted, fontSize: 13, lineHeight: 19, fontFamily: fonts.body },
  head: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  glyphWrap: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  glyph: { fontSize: 26 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  catTxt: { color: c.brand, fontSize: 10, fontWeight: "700", letterSpacing: 1, fontFamily: fonts.body },
  name: { color: c.onSurface, fontSize: 18, fontFamily: fonts.heading, marginTop: 2, lineHeight: 21 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  place: { color: c.muted, fontSize: 12, fontFamily: fonts.body },
  dateBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.terracottaSoft, paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radius.md, alignSelf: "flex-start" },
  dateTxt: { color: c.brandPrimary, fontSize: 13, fontWeight: "700", fontFamily: fonts.body },
  desc: { color: c.onSurfaceSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.body },
  curiosity: { flexDirection: "row", gap: 6, backgroundColor: c.surfaceTertiary, padding: spacing.sm, borderRadius: radius.md },
  curiosityTxt: { color: c.onSurfaceSecondary, fontSize: 13, lineHeight: 18, flex: 1, fontStyle: "italic", fontFamily: fonts.body },
  note: { color: c.warning, fontSize: 12, fontFamily: fonts.body },
}));
