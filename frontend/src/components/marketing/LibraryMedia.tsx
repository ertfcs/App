import React, { useState } from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useQueryClient } from "@tanstack/react-query";

import { Button, useToast } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { api } from "@/src/lib/api";
import { usePhotos } from "@/src/lib/queries";

// Per-post media tools: AI image (based on a real gallery photo if chosen) and real photos to attach.
export function LibraryMedia({ item }: { item: any }) {
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const photos = usePhotos();
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const [sel, setSel] = useState<string[]>(item.attached_photo_ids || []);
  const gallery = photos.data ?? [];
  const attached = gallery.filter((p) => (item.attached_photo_ids || []).includes(p.id));

  const genImage = async () => {
    setBusy(true);
    try {
      await api.post(
        "/admin/marketing/image",
        { content_id: item.id, visual_concept: item.visual_concept, topic: item.topic, platform: item.platform, photo_id: attached[0]?.id },
        { timeout: 180000 },
      );
      qc.invalidateQueries({ queryKey: ["marketing-library"] });
      toast.show("Immagine creata", "success");
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Errore immagine", "error");
    } finally {
      setBusy(false);
    }
  };

  const saveAttach = async () => {
    try {
      await api.post(`/admin/marketing/library/${item.id}/photos`, { photo_ids: sel });
      qc.invalidateQueries({ queryKey: ["marketing-library"] });
      setPicker(false);
      toast.show("Foto allegate", "success");
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Errore", "error");
    }
  };

  return (
    <View style={{ gap: 6 }}>
      {item.image ? <Image source={{ uri: item.image }} style={s.ai} contentFit="cover" testID={`mkt-img-${item.id}`} /> : null}
      {attached.length ? (
        <View style={s.thumbs}>
          {attached.map((p) => <Image key={p.id} source={{ uri: p.data_url }} style={s.thumb} contentFit="cover" />)}
        </View>
      ) : null}
      <View style={s.row}>
        <Pressable testID={`mkt-genimg-${item.id}`} style={s.act} onPress={genImage} disabled={busy}>
          <Icon name="image-auto-adjust" size={16} color={colors.brandPrimary} />
          <Text style={s.actTxt}>{busy ? "Creo immagine…" : item.image ? "Rigenera immagine IA" : "Immagine IA"}</Text>
        </Pressable>
        <Pressable testID={`mkt-attach-${item.id}`} style={s.act} onPress={() => setPicker(true)}>
          <Icon name="paperclip" size={16} color={colors.olive} />
          <Text style={[s.actTxt, { color: colors.olive }]}>Foto reali ({attached.length})</Text>
        </Pressable>
      </View>

      <Modal visible={picker} transparent animationType="slide" onRequestClose={() => setPicker(false)}>
        <Pressable style={s.backdrop} onPress={() => setPicker(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={s.title}>Allega foto della galleria</Text>
            <ScrollView contentContainerStyle={s.grid} style={{ maxHeight: 360 }}>
              {gallery.map((p) => {
                const on = sel.includes(p.id);
                return (
                  <Pressable key={p.id} testID={`attach-photo-${p.id}`} onPress={() => setSel((v) => (on ? v.filter((x) => x !== p.id) : [...v, p.id]))} style={[s.cell, on && { borderColor: colors.brandPrimary }]}>
                    <Image source={{ uri: p.data_url }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  </Pressable>
                );
              })}
            </ScrollView>
            <Button testID="attach-save" label={`Allega ${sel.length} foto`} icon="check" onPress={saveAttach} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  ai: { width: "100%", aspectRatio: 1, borderRadius: radius.md, backgroundColor: c.surfaceTertiary },
  thumbs: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  thumb: { width: 54, height: 54, borderRadius: radius.sm },
  row: { flexDirection: "row", gap: spacing.md, flexWrap: "wrap" },
  act: { flexDirection: "row", alignItems: "center", gap: 4 },
  actTxt: { color: c.brandPrimary, fontSize: 13, fontWeight: "600", fontFamily: fonts.body },
  backdrop: { flex: 1, backgroundColor: "rgba(44,42,40,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  title: { color: c.onSurface, fontSize: 18, fontFamily: fonts.heading },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  cell: { width: "31%", aspectRatio: 1, borderRadius: radius.md, overflow: "hidden", borderWidth: 3, borderColor: "transparent" },
}));
