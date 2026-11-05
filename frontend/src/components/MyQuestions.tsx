import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Card, useToast } from "./ui";
import { Icon } from "./Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { api } from "@/src/lib/api";

type Msg = { from: "guest" | "host"; text: string; at?: string };
type Thread = { id: string; status: string; thread: Msg[] };

// One guest conversation with Matteo, refreshed periodically.
function ThreadCard({ id }: { id: string }) {
  const { t } = useTranslation();
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["gq-thread", id],
    refetchInterval: 30000,
    retry: false,
    queryFn: async () => (await api.get<Thread>(`/guest-questions/${id}`)).data,
  });

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await api.post(`/guest-questions/${id}/reply`, { text: text.trim() });
      qc.setQueryData(["gq-thread", id], res.data);
      setText("");
    } catch {
      toast.show(t("booking.toast_error"), "error");
    } finally {
      setBusy(false);
    }
  };

  if (!q.data) return null;
  const answered = q.data.thread[q.data.thread.length - 1]?.from === "host";
  return (
    <Card style={{ gap: spacing.sm }} testID={`thread-${id}`}>
      <Text style={[s.status, { color: answered ? colors.success : colors.warning }]}>
        {answered ? t("guest.answered") : t("guest.waiting")}
      </Text>
      {q.data.thread.map((m, i) => (
        <View key={i} style={[s.bubble, m.from === "guest" ? s.mine : s.host]}>
          <Text style={s.who}>{m.from === "guest" ? t("guest.you") : t("guest.host")}</Text>
          <Text style={s.msg}>{m.text}</Text>
        </View>
      ))}
      <View style={s.inputRow}>
        <TextInput
          testID={`thread-input-${id}`}
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder={t("guest.reply_ph")}
          placeholderTextColor={colors.muted}
          multiline
        />
        <Pressable testID={`thread-send-${id}`} onPress={send} disabled={busy || !text.trim()} style={[s.send, (!text.trim() || busy) && { opacity: 0.4 }]}>
          <Icon name="send" size={18} color={colors.onBrandPrimary} />
        </Pressable>
      </View>
    </Card>
  );
}

export function MyQuestions({ ids }: { ids: string[] }) {
  const { t } = useTranslation();
  const s = useStyles();
  if (ids.length === 0) return null;
  return (
    <View style={{ gap: spacing.sm }} testID="my-questions">
      <Text style={s.title}>{t("guest.my_questions")}</Text>
      {ids.map((id) => <ThreadCard key={id} id={id} />)}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  title: { color: c.onSurface, fontSize: 22, fontFamily: fonts.heading, marginTop: spacing.xl },
  status: { fontSize: 11, fontWeight: "700", letterSpacing: 1, fontFamily: fonts.body, textTransform: "uppercase" },
  bubble: { borderRadius: radius.md, padding: spacing.sm, maxWidth: "88%" },
  mine: { alignSelf: "flex-end", backgroundColor: c.surfaceTertiary },
  host: { alignSelf: "flex-start", backgroundColor: c.terracottaSoft },
  who: { color: c.muted, fontSize: 11, fontFamily: fonts.body, fontWeight: "700", marginBottom: 2 },
  msg: { color: c.onSurface, fontSize: 14, fontFamily: fonts.body, lineHeight: 20 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  input: { flex: 1, minHeight: 40, maxHeight: 100, backgroundColor: c.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 8, color: c.onSurface, fontFamily: fonts.body, fontSize: 14 },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
}));
