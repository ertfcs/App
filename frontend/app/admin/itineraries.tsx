import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, Switch, RefreshControl } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Header } from "@/src/components/Header";
import { Card, Field, Button, Loading, EmptyState, ChipRow, useToast } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { useAuth } from "@/src/lib/auth";
import { api } from "@/src/lib/api";
import { downloadAuthedFile, uploadAuthedFile } from "@/src/lib/adminFiles";
import { confirmAction } from "@/src/lib/confirm";

type Itin = {
  id?: string; title: string; subtitle?: string; days: number; theme?: string; preview_text?: string;
  highlights?: string[]; tags?: string[]; visibility: string; published: boolean; pdf_filename?: string | null; hero_image?: string;
};
const VIS = [
  { key: "public", label: "Pubblico" },
  { key: "preview", label: "Anteprima" },
  { key: "code_only", label: "Solo con codice" },
];
const EMPTY: Itin = { title: "", days: 3, visibility: "code_only", published: false };

export default function AdminItineraries() {
  const s = useStyles();
  const { colors } = useTheme();
  const { token, loading } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<(Itin & { hl?: string; tg?: string }) | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !token) router.replace("/admin/login");
  }, [loading, token]);

  const list = useQuery({
    queryKey: ["admin-itineraries"],
    enabled: !!token,
    queryFn: async () => (await api.get("/admin/itineraries")).data.itineraries as Itin[],
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-itineraries"] });
    qc.invalidateQueries({ queryKey: ["itineraries"] });
  };

  const save = async () => {
    if (!edit?.title.trim()) return toast.show("Titolo obbligatorio", "error");
    setBusy(true);
    const body = {
      title: edit.title, subtitle: edit.subtitle || "", days: Number(edit.days) || 1, theme: edit.theme || "",
      preview_text: edit.preview_text || "", hero_image: edit.hero_image || "", visibility: edit.visibility, published: edit.published,
      highlights: (edit.hl ?? (edit.highlights || []).join("\n")).split("\n"),
      tags: (edit.tg ?? (edit.tags || []).join(", ")).split(","),
    };
    try {
      if (edit.id) await api.put(`/admin/itineraries/${edit.id}`, body);
      else await api.post("/admin/itineraries", body);
      toast.show("Itinerario salvato", "success");
      setEdit(null);
      refresh();
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Errore", "error");
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<any>, ok: string) => {
    try {
      const r = await fn();
      if (r !== null) toast.show(ok, "success");
      refresh();
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || e?.message || "Errore", "error");
    }
  };

  if (loading || !token) return <Loading />;
  const items = list.data ?? [];

  return (
    <View style={s.screen}>
      <Header
        title="Itinerari pronti"
        kicker="Admin"
        showBack
        showLang={false}
        right={
          <Pressable testID="itin-add" onPress={() => setEdit({ ...EMPTY })} style={s.addBtn} hitSlop={6}>
            <Icon name="plus" size={22} color={colors.onBrandPrimary} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.brandPrimary} />}
      >
        <Text style={s.hint}>Gli itinerari pubblicati compaiono agli ospiti nella sezione Itinerario. Il PDF si scarica liberamente (Pubblico) o con il codice di prenotazione.</Text>
        {list.isLoading ? <Loading /> : items.length === 0 ? (
          <EmptyState icon="book-open-page-variant-outline" title="Nessun itinerario" subtitle="Tocca + per crearne uno." />
        ) : items.map((it) => (
          <Card key={it.id} testID={`itin-${it.id}`} style={{ gap: 6 }}>
            <View style={s.head}>
              <Text style={s.name}>{it.title}</Text>
              <Text style={[s.pill, { color: it.published ? colors.success : colors.muted }]}>{it.published ? "Pubblicato" : "Bozza"}</Text>
            </View>
            <Text style={s.meta}>{it.days} giorni · {VIS.find((v) => v.key === it.visibility)?.label} · {it.pdf_filename ? "PDF presente" : "nessun PDF"}</Text>
            <View style={s.actions}>
              <Act icon="pencil-outline" label="Modifica" testID={`itin-edit-${it.id}`} onPress={() => setEdit({ ...it })} c={colors.brandPrimary} s={s} />
              <Act icon="upload" label="PDF" testID={`itin-upload-${it.id}`} onPress={() => act(() => uploadAuthedFile(`/admin/itineraries/${it.id}/upload-pdf`, token, ["application/pdf"]), "PDF caricato")} c={colors.olive} s={s} />
              {it.pdf_filename ? (
                <>
                  <Act icon="download" label="Scarica" testID={`itin-dl-${it.id}`} onPress={() => act(() => downloadAuthedFile(`/admin/itineraries/${it.id}/pdf`, "itinerario.pdf", token), "PDF scaricato")} c={colors.olive} s={s} />
                  <Act icon="file-remove-outline" label="Togli PDF" testID={`itin-rmpdf-${it.id}`} onPress={() => act(() => api.delete(`/admin/itineraries/${it.id}/pdf`), "PDF rimosso")} c={colors.warning} s={s} />
                </>
              ) : null}
              <Act icon="trash-can-outline" label="" testID={`itin-del-${it.id}`} onPress={async () => (await confirmAction(`Eliminare "${it.title}"?`)) && act(() => api.delete(`/admin/itineraries/${it.id}`), "Eliminato")} c={colors.error} s={s} />
            </View>
          </Card>
        ))}
      </ScrollView>

      <Modal visible={!!edit} transparent animationType="slide" onRequestClose={() => setEdit(null)}>
        <Pressable style={s.backdrop} onPress={() => setEdit(null)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            {edit ? (
              <KeyboardAwareScrollView bottomOffset={20} contentContainerStyle={{ gap: spacing.sm }}>
                <Text style={s.sheetTitle}>{edit.id ? "Modifica itinerario" : "Nuovo itinerario"}</Text>
                <Field value={edit.title} onChangeText={(v) => setEdit({ ...edit, title: v })} placeholder="Titolo" icon="format-title" testID="itin-f-title" />
                <Field value={edit.subtitle || ""} onChangeText={(v) => setEdit({ ...edit, subtitle: v })} placeholder="Sottotitolo" icon="subtitles-outline" testID="itin-f-subtitle" />
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <View style={{ flex: 1 }}><Field value={String(edit.days)} onChangeText={(v) => setEdit({ ...edit, days: Number(v) || 0 })} placeholder="Giorni" icon="calendar-range" keyboardType="numeric" testID="itin-f-days" /></View>
                  <View style={{ flex: 2 }}><Field value={edit.theme || ""} onChangeText={(v) => setEdit({ ...edit, theme: v })} placeholder="Tema (mare, cultura...)" icon="palette-outline" testID="itin-f-theme" /></View>
                </View>
                <Field value={edit.preview_text || ""} onChangeText={(v) => setEdit({ ...edit, preview_text: v })} placeholder="Testo di anteprima per gli ospiti" icon="text" multiline testID="itin-f-preview" />
                <Field value={edit.hl ?? (edit.highlights || []).join("\n")} onChangeText={(v) => setEdit({ ...edit, hl: v })} placeholder="Punti forti (uno per riga)" icon="star-outline" multiline testID="itin-f-highlights" />
                <Field value={edit.tg ?? (edit.tags || []).join(", ")} onChangeText={(v) => setEdit({ ...edit, tg: v })} placeholder="Tag separati da virgola" icon="tag-outline" testID="itin-f-tags" />
                <Text style={s.label}>VISIBILITÀ PDF</Text>
                <ChipRow items={VIS} selected={edit.visibility} onSelect={(k) => setEdit({ ...edit, visibility: k })} />
                <View style={s.switchRow}>
                  <Text style={s.name}>Pubblicato</Text>
                  <Switch testID="itin-f-published" value={edit.published} onValueChange={(v) => setEdit({ ...edit, published: v })} />
                </View>
                <Button testID="itin-save" label="Salva" icon="content-save" onPress={save} loading={busy} />
              </KeyboardAwareScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Act({ icon, label, onPress, c, s, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={s.act} hitSlop={4}>
      <Icon name={icon} size={16} color={c} />
      {label ? <Text style={[s.actTxt, { color: c }]}>{label}</Text> : null}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  addBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  hint: { color: c.muted, fontSize: 13, lineHeight: 19, fontFamily: fonts.body, marginBottom: spacing.xs },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  name: { color: c.onSurface, fontSize: 15, fontFamily: fonts.heading, flexShrink: 1 },
  pill: { fontSize: 11, fontWeight: "700", fontFamily: fonts.body },
  meta: { color: c.muted, fontSize: 12, fontFamily: fonts.body },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 8, marginTop: 2 },
  act: { flexDirection: "row", alignItems: "center", gap: 4 },
  actTxt: { fontSize: 13, fontWeight: "600", fontFamily: fonts.body },
  backdrop: { flex: 1, backgroundColor: "rgba(44,42,40,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "90%" },
  sheetTitle: { color: c.onSurface, fontSize: 20, fontFamily: fonts.heading },
  label: { color: c.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: "700", fontFamily: fonts.body },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
}));
