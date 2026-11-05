import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Card, Field, Button, SectionTitle, ChipRow, EmptyState, useToast } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { DateField } from "@/src/components/DateField";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, spacing } from "@/src/lib/typography";
import { api } from "@/src/lib/api";
import { prettyDate, toISODate } from "@/src/lib/format";
import { confirmAction } from "@/src/lib/confirm";

const PLATFORMS = [
  { key: "tiktok", label: "TikTok" },
  { key: "instagram_post", label: "Instagram" },
  { key: "facebook_post", label: "Facebook" },
  { key: "google_business", label: "Google" },
];

// Editorial calendar: plan posts by date, mark them done, or let the AI fill 30 days.
export function CalendarTab() {
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [date, setDate] = useState<string>(toISODate(new Date()));
  const [notes, setNotes] = useState("");
  const [focus, setFocus] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const list = useQuery({ queryKey: ["mkt-calendar"], queryFn: async () => (await api.get("/admin/marketing/calendar")).data as any[] });
  const refresh = () => qc.invalidateQueries({ queryKey: ["mkt-calendar"] });
  const safe = (p: Promise<any>) => p.then(refresh).catch((e: any) => toast.show(e?.response?.data?.detail || "Errore", "error"));
  const removeItem = async (id: string) => {
    if (await confirmAction("Eliminare questo contenuto dal calendario?")) safe(api.delete(`/admin/marketing/calendar/${id}`));
  };

  const add = async (item: { title: string; platform: string; date: string; notes?: string }) => {
    await api.post("/admin/marketing/calendar", item);
    refresh();
  };

  const addManual = async () => {
    if (!title.trim() || !date) return toast.show("Titolo e data obbligatori", "error");
    try {
      await add({ title: title.trim(), platform, date, notes });
      setTitle("");
      setNotes("");
      toast.show("Aggiunto al calendario", "success");
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Errore", "error");
    }
  };

  const generate = async () => {
    setGenBusy(true);
    try {
      const start = toISODate(new Date());
      const res = await api.post("/admin/marketing/generate-calendar", { month_focus: focus.trim() || null, start_date: start, model: "claude" }, { timeout: 180000 });
      const cal = res.data.results?.find((r: any) => r.calendar)?.calendar;
      if (!cal?.posts?.length) throw new Error(res.data.results?.[0]?.error || "Nessun piano generato");
      const base = new Date();
      await Promise.all(
        cal.posts.map((p: any) => {
          const d = new Date(base);
          d.setDate(base.getDate() + (Number(p.day) || 1) - 1);
          return add({ title: p.title || p.hook || "Post", platform: "google_business", date: toISODate(d), notes: [p.post_type, p.best_time, p.main_message, p.photo_idea].filter(Boolean).join(" · ") });
        }),
      );
      toast.show(`Aggiunti ${cal.posts.length} post al calendario`, "success");
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || e?.message || "Errore IA", "error");
    } finally {
      setGenBusy(false);
    }
  };

  const items = list.data ?? [];
  return (
    <View style={{ gap: spacing.md }}>
      <Card style={{ gap: spacing.sm }}>
        <SectionTitle title="Nuovo contenuto in calendario" />
        <Field value={title} onChangeText={setTitle} placeholder="Titolo (es. Reel tramonto)" icon="format-title" testID="cal-title" />
        <ChipRow items={PLATFORMS} selected={platform} onSelect={setPlatform} />
        <DateField value={date} onChange={setDate} testID="cal-date" />
        <Field value={notes} onChangeText={setNotes} placeholder="Note" icon="note-text-outline" testID="cal-notes" />
        <Button testID="cal-add" label="Aggiungi" icon="plus" onPress={addManual} />
      </Card>
      <Card style={{ gap: spacing.sm }}>
        <SectionTitle title="Piano 30 giorni con IA" />
        <Field value={focus} onChangeText={setFocus} placeholder="Focus del mese (opzionale)" icon="target" testID="cal-focus" />
        <Button testID="cal-generate" label="Genera e aggiungi al calendario" icon="calendar-star" variant="olive" onPress={generate} loading={genBusy} />
      </Card>
      {items.length === 0 ? (
        <EmptyState icon="calendar-blank-outline" title="Calendario vuoto" />
      ) : (
        items.map((it) => (
          <Card key={it.id} testID={`cal-${it.id}`} style={s.row}>
            <Pressable testID={`cal-toggle-${it.id}`} onPress={() => safe(api.put(`/admin/marketing/calendar/${it.id}`, { status: it.status === "done" ? "planned" : "done" }))} hitSlop={6}>
              <Icon name={it.status === "done" ? "check-circle" : "circle-outline"} size={22} color={it.status === "done" ? colors.success : colors.muted} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, it.status === "done" && { textDecorationLine: "line-through", color: colors.muted }]}>{it.title}</Text>
              <Text style={s.meta}>{prettyDate(it.date)} · {it.platform}</Text>
              {it.notes ? <Text style={s.notes} numberOfLines={3}>{it.notes}</Text> : null}
            </View>
            <Pressable testID={`cal-del-${it.id}`} onPress={() => removeItem(it.id)} hitSlop={6}>
              <Icon name="trash-can-outline" size={18} color={colors.error} />
            </Pressable>
          </Card>
        ))
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  title: { color: c.onSurface, fontSize: 15, fontFamily: fonts.heading },
  meta: { color: c.muted, fontSize: 12, fontFamily: fonts.body, marginTop: 1 },
  notes: { color: c.onSurfaceSecondary, fontSize: 13, fontFamily: fonts.body, marginTop: 3, lineHeight: 18 },
}));
