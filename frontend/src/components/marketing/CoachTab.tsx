import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { Card, Field, Button, SectionTitle, ChipRow, useToast } from "@/src/components/ui";
import { JsonView } from "@/src/components/JsonView";
import { MarkdownText } from "@/src/components/MarkdownText";
import { makeStyles } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { api } from "@/src/lib/api";
import { storage } from "@/src/utils/storage";

const SESSION_KEY = "mkt_coach_session";
type Entry = { user_message: string; results: { model: string; label?: string; answer: string }[] };

function ModelResults({ results, field }: { results: any[]; field: string }) {
  const s = useStyles();
  return (
    <View style={{ gap: spacing.sm }}>
      {results.map((r) => (
        <Card key={r.model} style={{ gap: 6 }}>
          <Text style={s.model}>{r.label || r.model}</Text>
          {r.error && !r[field] ? <Text style={s.err}>{r.error}</Text> : <JsonView data={r[field]} />}
        </Card>
      ))}
    </View>
  );
}

// Google Business coach: free chat, profile audit and structured post, with model choice (or all 3 compared).
export function CoachTab() {
  const s = useStyles();
  const toast = useToast();
  const [model, setModel] = useState("claude");
  const [session, setSession] = useState<string | null>(null);
  const [history, setHistory] = useState<Entry[]>([]);
  const [msg, setMsg] = useState("");
  const [desc, setDesc] = useState("");
  const [brief, setBrief] = useState("");
  const [postType, setPostType] = useState("NOVITA");
  const [audit, setAudit] = useState<any[] | null>(null);
  const [post, setPost] = useState<any[] | null>(null);
  const [busy, setBusy] = useState("");

  const models = useQuery({ queryKey: ["mkt-models"], queryFn: async () => (await api.get("/admin/marketing/models")).data.models as any[] });

  useEffect(() => {
    storage.getItem<string>(SESSION_KEY, "").then(async (sid) => {
      if (!sid) return;
      setSession(sid);
      const h = await api.get(`/admin/marketing/chat/${sid}/history`).catch(() => null);
      if (h) setHistory(h.data.items);
    });
  }, []);

  const call = async (kind: string, fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Errore IA", "error");
    } finally {
      setBusy("");
    }
  };

  const send = () =>
    msg.trim() &&
    call("chat", async () => {
      const res = await api.post("/admin/marketing/chat", { message: msg.trim(), session_id: session, model }, { timeout: 180000 });
      setSession(res.data.session_id);
      storage.setItem(SESSION_KEY, res.data.session_id);
      setHistory((h) => [...h, { user_message: msg.trim(), results: res.data.results }]);
      setMsg("");
    });

  const reset = async () => {
    if (session) await api.delete(`/admin/marketing/chat/${session}`).catch(() => {});
    storage.setItem(SESSION_KEY, "");
    setSession(null);
    setHistory([]);
  };

  const modelChips = [...(models.data ?? []).map((m) => ({ key: m.key, label: m.label })), { key: "all", label: "Confronta tutti" }];

  return (
    <View style={{ gap: spacing.md }}>
      <ChipRow items={modelChips} selected={model} onSelect={setModel} />
      <Card style={{ gap: spacing.sm }}>
        <SectionTitle title="Coach Google Business" />
        {history.map((h, i) => (
          <View key={i} style={{ gap: 6 }}>
            <Text style={s.user}>{h.user_message}</Text>
            {h.results.map((r) => (
              <View key={r.model} style={s.answer}>
                <Text style={s.model}>{r.label || r.model}</Text>
                <MarkdownText text={r.answer || r.error || ""} />
              </View>
            ))}
          </View>
        ))}
        <Field value={msg} onChangeText={setMsg} placeholder="Chiedi al coach (es. come salgo su Maps?)" icon="chat-outline" multiline testID="coach-msg" />
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 2 }}><Button testID="coach-send" label="Invia" icon="send" onPress={send} loading={busy === "chat"} /></View>
          <View style={{ flex: 1 }}><Button testID="coach-reset" label="Nuova" icon="broom" variant="outline" onPress={reset} /></View>
        </View>
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <SectionTitle title="Audit del profilo" />
        <Field value={desc} onChangeText={setDesc} placeholder="Incolla la descrizione attuale del profilo Google" icon="file-search-outline" multiline testID="audit-desc" />
        <Button testID="audit-run" label="Analizza profilo" icon="magnify-scan" variant="olive" onPress={() => desc.trim() && call("audit", async () => setAudit((await api.post("/admin/marketing/audit", { current_description: desc.trim(), model }, { timeout: 180000 })).data.results))} loading={busy === "audit"} />
      </Card>
      {audit ? <ModelResults results={audit} field="audit" /> : null}

      <Card style={{ gap: spacing.sm }}>
        <SectionTitle title="Post Google strutturato" />
        <ChipRow items={[{ key: "NOVITA", label: "Novità" }, { key: "OFFERTA", label: "Offerta" }, { key: "EVENTO", label: "Evento" }, { key: "PRODOTTO", label: "Prodotto" }]} selected={postType} onSelect={setPostType} />
        <Field value={brief} onChangeText={setBrief} placeholder="Cosa vuoi comunicare?" icon="lightbulb-outline" multiline testID="gpost-brief" />
        <Button testID="gpost-run" label="Genera post" icon="creation" variant="olive" onPress={() => brief.trim() && call("post", async () => setPost((await api.post("/admin/marketing/generate-post", { brief: brief.trim(), post_type: postType, model }, { timeout: 180000 })).data.results))} loading={busy === "post"} />
      </Card>
      {post ? <ModelResults results={post} field="post" /> : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  user: { alignSelf: "flex-end", backgroundColor: c.brandPrimary, color: c.onBrandPrimary, padding: spacing.sm, borderRadius: radius.md, fontFamily: fonts.body, fontSize: 14, maxWidth: "88%" },
  answer: { backgroundColor: c.surfaceTertiary, borderRadius: radius.md, padding: spacing.sm, gap: 4 },
  model: { color: c.brandPrimary, fontSize: 12, fontWeight: "700", fontFamily: fonts.body },
  txt: { color: c.onSurface, fontSize: 14, lineHeight: 20, fontFamily: fonts.body },
  err: { color: c.error, fontSize: 13, fontFamily: fonts.body },
}));
