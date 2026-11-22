import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";

import { Header } from "@/src/components/Header";
import { Field, Loading } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { useAuth } from "@/src/lib/auth";
import { mediaUri } from "@/src/lib/api";
import { useBeaches, MergedBeach } from "@/src/lib/beachData";

export default function AdminBeaches() {
  const s = useStyles();
  const { colors } = useTheme();
  const { token, loading } = useAuth();
  const beaches = useBeaches(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!loading && !token) router.replace("/admin/login");
  }, [loading, token]);

  const list = useMemo(() => {
    const all = beaches.data ?? [];
    const needle = q.trim().toLowerCase();
    return needle ? all.filter((b) => `${b.name} ${b.location}`.toLowerCase().includes(needle)) : all;
  }, [beaches.data, q]);

  if (loading || !token) return <Loading />;

  const renderItem = ({ item }: { item: MergedBeach }) => (
    <Pressable
      testID={`admin-beach-${item.id}`}
      style={s.row}
      onPress={() => router.push({ pathname: "/admin/beaches/[id]", params: { id: item.id } })}
    >
      <View style={s.thumb}>
        {item.image ? <Image source={{ uri: mediaUri(item.image) }} style={s.thumbImg} contentFit="cover" /> : <Icon name="beach" size={24} color={colors.muted} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={s.meta} numberOfLines={1}>
          {item.location} ({item.prov}) · {item.it.type}
          {item.hidden ? " · nascosta" : ""}
        </Text>
      </View>
      <Icon name="pencil" size={20} color={colors.brandPrimary} />
    </Pressable>
  );

  return (
    <View style={s.screen}>
      <Header title="Spiagge" kicker="Admin" showBack showLang={false} />
      {beaches.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          testID="admin-beaches-list"
          data={list}
          keyExtractor={(b) => b.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
              <Text style={s.hint}>Tocca una spiaggia per modificare foto, descrizione, servizi, parcheggio e venti.</Text>
              <Field value={q} onChangeText={setQ} placeholder="Cerca spiaggia o comune" icon="magnify" testID="admin-beach-search" />
            </View>
          }
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  hint: { color: c.muted, fontSize: 13, fontFamily: fonts.body },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.sm },
  thumb: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  thumbImg: { width: "100%", height: "100%" },
  name: { color: c.onSurface, fontSize: 16, fontFamily: fonts.heading },
  meta: { color: c.muted, fontSize: 12, fontFamily: fonts.body, marginTop: 2 },
}));
