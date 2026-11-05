import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useQuery } from "@tanstack/react-query";

import { Card, Field, Button, SectionTitle, ChipRow, useToast } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { api, API_BASE } from "@/src/lib/api";

const LANGS = [
  { key: "it", label: "IT" }, { key: "en", label: "EN" }, { key: "es", label: "ES" }, { key: "fr", label: "FR" }, { key: "de", label: "DE" },
];
const STEPS = [
  { key: "verify", label: "Profilo verificato su Google" },
  { key: "category", label: "Categoria principale: Casa vacanze" },
  { key: "photos", label: "Almeno 10 foto reali (casa + dintorni)" },
  { key: "hours", label: "Orari di check-in / check-out indicati" },
  { key: "description", label: "Descrizione ottimizzata (usa il generatore qui sotto)" },
  { key: "qa", label: "Domande & risposte pre-caricate" },
  { key: "website", label: "Link al sito / app aggiunto" },
  { key: "weekly_post", label: "Un post a settimana" },
  { key: "ask_reviews", label: "Richiesta recensione dopo ogni soggiorno" },
  { key: "reply_reviews", label: "Risposta a tutte le recensioni" },
];

function useCopy() {
  const toast = useToast();
  return async (txt: string) => {
    await Clipboard.setStringAsync(txt);
    toast.show("Copiato negli appunti", "success");
  };
}

function Result({ title, text, testID }: { title: string; text: string; testID: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const copy = useCopy();
  return (
    <View style={s.result} testID={testID}>
      <View style={s.resHead}>
        <Text style={s.resTitle}>{title}</Text>
        <Pressable testID={`${testID}-copy`} onPress={() => copy(text)} hitSlop={6}><Icon name="content-copy" size={18} color={colors.brandPrimary} /></Pressable>
      </View>
      <Text selectable style={s.resBody}>{text}</Text>
    </View>
  );
}

// Generic "generate with Carmelo" card for one GBP tool.
function GenCard({ title, path, focusPh, render, testID }: { title: string; path: string; focusPh?: string; render: (d: any, lang: string) => { title: string; text: string }[]; testID: string }) {
  const toast = useToast();
  const [lang, setLang] = useState("it");
  const [focus, setFocus] = useState("");
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setData(null);
    try {
      const res = await api.post(path, { languages: [lang], focus: focus.trim() || null, tone: focus.trim() || null }, { timeout: 120000 });
      setData(res.data);
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Errore IA", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SectionTitle title={title} />
      <Card style={{ gap: spacing.sm }}>
        <ChipRow items={LANGS} selected={lang} onSelect={setLang} />
        {focusPh ? <Field value={focus} onChangeText={setFocus} placeholder={focusPh} icon="target" testID={`${testID}-focus`} /> : null}
        <Button testID={`${testID}-gen`} label="Genera con Carmelo" icon="creation" variant="olive" onPress={run} loading={busy} />
        {data ? render(data, lang).map((r, i) => <Result key={i} title={r.title} text={r.text} testID={`${testID}-res-${i}`} />) : null}
      </Card>
    </>
  );
}

export function GbExtras() {
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const guide = useQuery({ queryKey: ["gb-guide"], queryFn: async () => (await api.get("/admin/google-business/guide")).data });
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (guide.data?.progress) setProgress(guide.data.progress);
  }, [guide.data]);

  const toggle = async (k: string) => {
    const next = { ...progress, [k]: !progress[k] };
    setProgress(next);
    try {
      await api.put("/admin/google-business/guide", { progress: next });
    } catch {
      toast.show("Errore salvataggio", "error");
    }
  };
  const done = STEPS.filter((st) => progress[st.key]).length;

  return (
    <>
      <SectionTitle title={`Guida profilo · ${done}/${STEPS.length}`} />
      <Card style={{ gap: 4 }}>
        {STEPS.map((st) => (
          <Pressable key={st.key} testID={`gb-step-${st.key}`} style={s.step} onPress={() => toggle(st.key)}>
            <Icon name={progress[st.key] ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} size={20} color={progress[st.key] ? colors.success : colors.muted} />
            <Text style={[s.stepTxt, progress[st.key] && { color: colors.muted, textDecorationLine: "line-through" }]}>{st.label}</Text>
          </Pressable>
        ))}
        <Pressable testID="gb-sitemap" style={s.step} onPress={() => Linking.openURL(`${API_BASE}/sitemap.xml`)}>
          <Icon name="sitemap" size={20} color={colors.brandPrimary} />
          <Text style={[s.stepTxt, { color: colors.brandPrimary }]}>Sitemap per Google Search Console</Text>
        </Pressable>
      </Card>

      <GenCard
        title="Descrizione attività (max 750)"
        path="/admin/google-business/description"
        focusPh="Tema da privilegiare (opzionale)"
        testID="gb-desc"
        render={(d, l) => {
          const x = d.descriptions?.[l];
          return x ? [{ title: `Descrizione · ${(x.description || "").length} caratteri`, text: x.description || "" }] : [];
        }}
      />
      <GenCard
        title="Messaggi per chiedere recensioni"
        path="/admin/google-business/review-request"
        focusPh="Tono (opzionale: affettuoso, formale...)"
        testID="gb-reqrev"
        render={(d, l) => {
          const m = d.messages?.[l];
          return m ? [{ title: "WhatsApp", text: m.whatsapp || "" }, { title: `Email · ${m.email_subject || ""}`, text: m.email_body || "" }] : [];
        }}
      />
      <GenCard
        title="Domande & risposte del profilo"
        path="/admin/google-business/qa"
        focusPh="Tema (opzionale: famiglie, spiagge...)"
        testID="gb-qa"
        render={(d, l) => (d.qa?.[l] || []).map((q: any) => ({ title: q.question, text: q.answer }))}
      />
    </>
  );
}

const useStyles = makeStyles((c) => ({
  step: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 6 },
  stepTxt: { flex: 1, color: c.onSurface, fontSize: 14, fontFamily: fonts.body },
  result: { backgroundColor: c.surfaceTertiary, borderRadius: radius.md, padding: spacing.md, gap: 6 },
  resHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  resTitle: { color: c.onSurface, fontSize: 14, fontFamily: fonts.heading, flex: 1 },
  resBody: { color: c.onSurface, fontSize: 14, fontFamily: fonts.body, lineHeight: 21 },
}));
