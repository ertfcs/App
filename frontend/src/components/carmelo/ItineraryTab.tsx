import React, { useState } from "react";
import { View, Text } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Card, Field, Button, ChipRow, useToast } from "@/src/components/ui";
import { makeStyles } from "@/src/theme";
import { fonts, spacing } from "@/src/lib/typography";
import { api, streamCarmelo } from "@/src/lib/api";
import { postAuthedFile } from "@/src/lib/adminFiles";
import { useAuth } from "@/src/lib/auth";
import { StructuredView } from "./StructuredView";
import { MarkdownText } from "@/src/components/MarkdownText";

// Generates a full itinerary with Carmelo: free text (streamed) or day-by-day schema.
export function ItineraryTab({ sessionId, model }: { sessionId: string; model: string }) {
  const s = useStyles();
  const toast = useToast();
  const { token } = useAuth();
  const [mode, setMode] = useState("text");
  const [days, setDays] = useState("3");
  const [format, setFormat] = useState("free");
  const [travelers, setTravelers] = useState("");
  const [interests, setInterests] = useState("");
  const [arrival, setArrival] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [structured, setStructured] = useState<any>(null);

  const payload = () => ({
    session_id: sessionId,
    model,
    days: Math.max(1, Math.min(15, parseInt(days, 10) || 3)),
    format,
    travelers: travelers.trim() || null,
    interests: interests.trim() || null,
    arrival_date: arrival.trim() || null,
    notes: notes.trim() || null,
  });

  const generate = async () => {
    setBusy(true);
    try {
      if (mode === "text") {
        setText("");
        await streamCarmelo("/carmelo/itinerary", payload(), (_c, full) => setText(full));
      } else {
        setStructured(null);
        const res = await api.post("/carmelo/itinerary/structured", payload(), { timeout: 240000 });
        setStructured(res.data);
      }
      toast.show("Itinerario pronto", "success");
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || e?.message || "Errore IA", "error");
    } finally {
      setBusy(false);
    }
  };

  const pdf = async () => {
    if (!token) return;
    try {
      if (mode === "text") await postAuthedFile("/carmelo/itinerary/pdf", { content: text, days: payload().days }, "itinerario-carmelo.pdf", token);
      else await postAuthedFile("/carmelo/itinerary/structured/pdf", { itinerary: structured, title: structured?.title }, "itinerario-schema.pdf", token);
    } catch (e: any) {
      toast.show(e?.message || "Errore PDF", "error");
    }
  };

  return (
    <KeyboardAwareScrollView contentContainerStyle={s.scroll} bottomOffset={20} showsVerticalScrollIndicator={false}>
      <Card style={{ gap: spacing.sm }}>
        <ChipRow items={[{ key: "text", label: "Testo completo", icon: "text-long" }, { key: "schema", label: "Schema per giorni", icon: "view-list" }]} selected={mode} onSelect={setMode} />
        <View style={s.row}>
          <View style={{ flex: 1 }}><Field value={days} onChangeText={setDays} placeholder="Giorni (1-15)" icon="calendar-range" keyboardType="numeric" testID="ci-days" /></View>
          <View style={{ flex: 1 }}><Field value={arrival} onChangeText={setArrival} placeholder="Arrivo AAAA-MM-GG" icon="calendar-start" testID="ci-arrival" /></View>
        </View>
        <ChipRow items={[{ key: "free", label: "Libero" }, { key: "hourly", label: "Orario dettagliato" }]} selected={format} onSelect={setFormat} />
        <Field value={travelers} onChangeText={setTravelers} placeholder="Viaggiatori (es. 2 adulti + 1 bambino)" icon="account-group-outline" testID="ci-travelers" />
        <Field value={interests} onChangeText={setInterests} placeholder="Interessi (mare, cibo, arte...)" icon="heart-outline" testID="ci-interests" />
        <Field value={notes} onChangeText={setNotes} placeholder="Note (opzionale)" icon="note-text-outline" multiline testID="ci-notes" />
        <Button testID="ci-generate" label="Genera itinerario" icon="creation" onPress={generate} loading={busy} />
      </Card>

      {mode === "text" && text ? (
        <Card style={{ gap: spacing.sm }} testID="ci-result">
          <MarkdownText text={text} />
          {!busy ? <Button testID="ci-pdf" label="Scarica PDF" icon="file-pdf-box" variant="olive" onPress={pdf} /> : null}
        </Card>
      ) : null}

      {mode === "schema" && structured ? (
        <StructuredView itinerary={structured} onChange={setStructured} sessionId={sessionId} model={model} onPdf={pdf} />
      ) : null}
    </KeyboardAwareScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.sm },
  body: { color: c.onSurface, fontSize: 14, lineHeight: 21, fontFamily: fonts.body },
}));
