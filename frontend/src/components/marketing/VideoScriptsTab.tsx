import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Card, Field, Button, SectionTitle, ChipRow, EmptyState, useToast } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { JsonView } from "@/src/components/JsonView";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { api } from "@/src/lib/api";

const PLATFORMS = [
  { key: "tiktok", label: "TikTok" },
  { key: "instagram_reel", label: "Reel" },
  { key: "youtube_short", label: "Short" },
  { key: "facebook_reel", label: "FB Reel" },
];

// Short vertical video scripts written by Carmelo, saved in a library.
export function VideoScriptsTab() {
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [platform, setPlatform] = useState("tiktok");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("20");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["video-scripts"], queryFn: async () => (await api.get("/admin/marketing/video-scripts")).data as any[] });

  const generate = async () => {
    if (topic.trim().length < 3) return toast.show("Indica un argomento", "error");
    setBusy(true);
    try {
      const res = await api.post("/admin/marketing/video-script", { platform, topic: topic.trim(), duration: parseInt(duration, 10) || 20, languages: ["it", "en"] }, { timeout: 120000 });
      qc.invalidateQueries({ queryKey: ["video-scripts"] });
      setOpen(res.data.id);
      setTopic("");
      toast.show("Script pronto", "success");
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Errore IA", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await api.delete(`/admin/marketing/video-scripts/${id}`).catch(() => {});
    qc.invalidateQueries({ queryKey: ["video-scripts"] });
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Card style={{ gap: spacing.sm }}>
        <SectionTitle title="Script video breve" />
        <ChipRow items={PLATFORMS} selected={platform} onSelect={setPlatform} />
        <Field value={topic} onChangeText={setTopic} placeholder="Tema del video (es. alba a Trappeto)" icon="movie-open-outline" multiline testID="vs-topic" />
        <Field value={duration} onChangeText={setDuration} placeholder="Durata in secondi" icon="timer-outline" keyboardType="numeric" testID="vs-duration" />
        <Button testID="vs-generate" label="Scrivi script con Carmelo" icon="creation" onPress={generate} loading={busy} />
      </Card>
      {(list.data ?? []).length === 0 ? (
        <EmptyState icon="movie-open-outline" title="Nessuno script" subtitle="Genera il primo qui sopra." />
      ) : (
        (list.data ?? []).map((it) => (
          <Card key={it.id} testID={`vs-${it.id}`} style={{ gap: 6 }}>
            <Pressable style={s.head} onPress={() => setOpen(open === it.id ? null : it.id)} testID={`vs-open-${it.id}`}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{it.topic}</Text>
                <Text style={s.meta}>{it.platform_label} · {it.duration}s</Text>
              </View>
              <Pressable testID={`vs-del-${it.id}`} onPress={() => remove(it.id)} hitSlop={6}><Icon name="trash-can-outline" size={18} color={colors.error} /></Pressable>
              <Icon name={open === it.id ? "chevron-up" : "chevron-down"} size={22} color={colors.brandPrimary} />
            </Pressable>
            {open === it.id ? <View style={s.body}><JsonView data={it.script} /></View> : null}
          </Card>
        ))
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { color: c.onSurface, fontSize: 15, fontFamily: fonts.heading },
  meta: { color: c.muted, fontSize: 12, fontFamily: fonts.body },
  body: { backgroundColor: c.surfaceTertiary, borderRadius: radius.md, padding: spacing.sm },
}));
