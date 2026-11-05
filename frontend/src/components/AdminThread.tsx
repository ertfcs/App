import React, { useState } from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Field, Button, useToast } from "./ui";
import { makeStyles } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { api } from "@/src/lib/api";

// Host side of a guest conversation: shows the thread and sends a reply visible in the guest app.
export function AdminThreadModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const s = useStyles();
  const toast = useToast();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["gq-thread", id],
    enabled: !!id,
    queryFn: async () => (await api.get(`/guest-questions/${id}`)).data,
  });

  const send = async () => {
    if (!text.trim() || !id) return;
    setBusy(true);
    try {
      const res = await api.post(`/admin/guest-questions/${id}/reply`, { text: text.trim() });
      qc.setQueryData(["gq-thread", id], res.data);
      qc.invalidateQueries({ queryKey: ["guest-questions"] });
      setText("");
      toast.show("Risposta inviata all'ospite", "success");
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Errore", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={!!id} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={s.title}>Conversazione con {q.data?.name || "ospite"}</Text>
          <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: spacing.sm }}>
            {(q.data?.thread ?? []).map((m: any, i: number) => (
              <View key={i} style={[s.bubble, m.from === "host" ? s.host : s.guest]}>
                <Text style={s.who}>{m.from === "host" ? "Tu (Matteo)" : q.data?.name}</Text>
                <Text style={s.msg}>{m.text}</Text>
              </View>
            ))}
          </ScrollView>
          <Text style={s.hint}>L{"'"}ospite vede la risposta nella sezione Info dell{"'"}app.</Text>
          <Field value={text} onChangeText={setText} placeholder="Scrivi la risposta" icon="reply" multiline testID="thread-admin-input" />
          <Button testID="thread-admin-send" label="Invia risposta" icon="send" onPress={send} loading={busy} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, backgroundColor: "rgba(44,42,40,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  title: { color: c.onSurface, fontSize: 19, fontFamily: fonts.heading },
  bubble: { borderRadius: radius.md, padding: spacing.sm, maxWidth: "88%" },
  host: { alignSelf: "flex-end", backgroundColor: c.terracottaSoft },
  guest: { alignSelf: "flex-start", backgroundColor: c.surfaceTertiary },
  who: { color: c.muted, fontSize: 11, fontWeight: "700", fontFamily: fonts.body, marginBottom: 2 },
  msg: { color: c.onSurface, fontSize: 14, lineHeight: 20, fontFamily: fonts.body },
  hint: { color: c.muted, fontSize: 12, fontFamily: fonts.body },
}));
