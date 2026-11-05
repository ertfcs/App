import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Header } from "@/src/components/Header";
import { Card, Button, Loading, EmptyState, ChipRow, useToast } from "@/src/components/ui";
import { Icon, IconName } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { useAuth } from "@/src/lib/auth";
import { api } from "@/src/lib/api";
import { pickImageDataUrl } from "@/src/lib/upload";
import { confirmAction } from "@/src/lib/confirm";

type Photo = { id: string; data_url: string; filename?: string };
const BASE: Record<string, string> = { public: "/photos", private: "/private-photos" };

export default function AdminPhotos() {
  const s = useStyles();
  const { colors } = useTheme();
  const { token, loading } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("public");
  const [uploading, setUploading] = useState(false);
  const base = BASE[tab];

  useEffect(() => {
    if (!loading && !token) router.replace("/admin/login");
  }, [loading, token]);

  const photos = useQuery({
    queryKey: ["admin-photos", tab],
    enabled: !!token,
    queryFn: async () => (await api.get<Photo[]>(base)).data,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-photos"] });
    qc.invalidateQueries({ queryKey: ["photos"] });
  };

  const run = async (fn: () => Promise<any>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.show(ok, "success");
      refresh();
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || e?.message || "Errore", "error");
    }
  };

  const pick = async () => {
    setUploading(true);
    await run(async () => {
      const p = await pickImageDataUrl();
      if (p) await api.post(base, { data_url: p.dataUrl, filename: p.filename });
    }, "Foto caricata");
    setUploading(false);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const list = [...(photos.data ?? [])];
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    [list[idx], list[j]] = [list[j], list[idx]];
    qc.setQueryData(["admin-photos", tab], list);
    run(() => api.put(`${base}/reorder`, { ids: list.map((p) => p.id) }));
  };

  if (loading || !token) return <Loading />;
  const list = photos.data ?? [];

  return (
    <View style={s.screen}>
      <Header title="Foto" kicker="Admin" showBack showLang={false} />
      <ChipRow
        items={[{ key: "public", label: "Galleria pubblica", icon: "earth" }, { key: "private", label: "Galleria privata", icon: "lock-outline" }]}
        selected={tab}
        onSelect={setTab}
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.brandPrimary} />}
      >
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={s.hint}>
            {tab === "public"
              ? "Foto mostrate agli ospiti in Home. Usa le frecce per l'ordine, il lucchetto per spostarle nella galleria privata."
              : "Archivio privato (non visibile agli ospiti), utile per il marketing. Tocca il globo per pubblicare una foto."}
          </Text>
          <Button testID="photo-add" label="Carica foto" icon="image-plus" onPress={pick} loading={uploading} />
        </Card>

        {photos.isLoading ? (
          <Loading />
        ) : list.length === 0 ? (
          <EmptyState icon="image-multiple-outline" title="Nessuna foto" subtitle="Carica la prima foto." />
        ) : (
          <View style={s.grid}>
            {list.map((p, i) => (
              <View key={p.id} style={s.cell} testID={`photo-${p.id}`}>
                <Image source={{ uri: p.data_url }} style={s.img} contentFit="cover" />
                <Pressable testID={`photo-del-${p.id}`} style={[s.btn, s.del]} onPress={async () => (await confirmAction("Eliminare questa foto?")) && run(() => api.delete(`${base}/${p.id}`), "Foto eliminata")} hitSlop={6}>
                  <Icon name="close" size={16} color={colors.onError} />
                </Pressable>
                <View style={s.bar}>
                  <Tool icon="chevron-left" testID={`photo-left-${p.id}`} onPress={() => move(i, -1)} s={s} />
                  <Tool
                    icon={tab === "public" ? "lock-outline" : "earth"}
                    testID={`photo-move-${p.id}`}
                    onPress={() =>
                      run(
                        () => api.post(tab === "public" ? `/photos/${p.id}/demote` : `/private-photos/${p.id}/promote`),
                        tab === "public" ? "Spostata nella privata" : "Pubblicata",
                      )
                    }
                    s={s}
                  />
                  <Tool icon="chevron-right" testID={`photo-right-${p.id}`} onPress={() => move(i, 1)} s={s} />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Tool({ icon, onPress, s, testID }: { icon: IconName; onPress: () => void; s: any; testID: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} hitSlop={4} style={s.tool}>
      <Icon name={icon} size={16} color="#fff" />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  hint: { color: c.muted, fontSize: 13, fontFamily: fonts.body, marginBottom: spacing.sm, lineHeight: 19 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  cell: { width: "31.5%", aspectRatio: 1, borderRadius: radius.md, overflow: "hidden", position: "relative" },
  img: { width: "100%", height: "100%", backgroundColor: c.surfaceTertiary },
  btn: { position: "absolute", top: 4, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  del: { right: 4, backgroundColor: c.error },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", justifyContent: "space-around", backgroundColor: "rgba(44,42,40,0.55)", paddingVertical: 3 },
  tool: { padding: 3 },
}));
