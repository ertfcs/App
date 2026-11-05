import React, { useState } from "react";
import { Text } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Card, Field, Button, useToast } from "@/src/components/ui";
import { makeStyles } from "@/src/theme";
import { fonts, spacing } from "@/src/lib/typography";
import { streamCarmelo } from "@/src/lib/api";
import { postAuthedFile, uploadAuthedFile } from "@/src/lib/adminFiles";
import { useAuth } from "@/src/lib/auth";
import { MarkdownText } from "@/src/components/MarkdownText";

const DOCS = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];

// Adapts an external itinerary (pasted or from a PDF/Word/TXT file) with local info.
export function AdaptTab({ sessionId, model }: { sessionId: string; model: string }) {
  const s = useStyles();
  const toast = useToast();
  const { token } = useAuth();
  const [original, setOriginal] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);

  const loadFile = async () => {
    if (!token) return;
    setReading(true);
    try {
      const res = await uploadAuthedFile("/carmelo/extract-file", token, DOCS);
      if (res?.text) {
        setOriginal(res.text);
        toast.show(`Letto ${res.filename} (${res.chars} caratteri)`, "success");
      }
    } catch (e: any) {
      toast.show(e?.message || "File non leggibile", "error");
    } finally {
      setReading(false);
    }
  };

  const adapt = async () => {
    if (!original.trim()) return toast.show("Incolla o carica un itinerario", "error");
    setBusy(true);
    setResult("");
    try {
      await streamCarmelo("/carmelo/adapt-itinerary", { session_id: sessionId, model, original_text: original, notes: notes.trim() || null }, (_c, full) => setResult(full));
    } catch (e: any) {
      toast.show(e?.message || "Errore IA", "error");
    } finally {
      setBusy(false);
    }
  };

  const pdf = async () => {
    if (!token) return;
    try {
      await postAuthedFile("/carmelo/itinerary/pdf", { content: result }, "itinerario-adattato.pdf", token);
    } catch (e: any) {
      toast.show(e?.message || "Errore PDF", "error");
    }
  };

  return (
    <KeyboardAwareScrollView contentContainerStyle={s.scroll} bottomOffset={20} showsVerticalScrollIndicator={false}>
      <Card style={{ gap: spacing.sm }}>
        <Text style={s.hint}>Carica l{"'"}itinerario di un ospite (PDF, Word o TXT) o incollalo: Carmelo lo arricchisce con prezzi, orari, ristoranti e distanze da Trappeto.</Text>
        <Button testID="adapt-upload" label="Carica file" icon="file-upload-outline" variant="outline" onPress={loadFile} loading={reading} />
        <Field value={original} onChangeText={setOriginal} placeholder="Oppure incolla qui l'itinerario" icon="text-box-outline" multiline testID="adapt-text" />
        <Field value={notes} onChangeText={setNotes} placeholder="Note per Carmelo (opzionale)" icon="note-text-outline" testID="adapt-notes" />
        <Button testID="adapt-run" label="Adatta itinerario" icon="auto-fix" onPress={adapt} loading={busy} />
      </Card>
      {result ? (
        <Card style={{ gap: spacing.sm }} testID="adapt-result">
          <MarkdownText text={result} />
          {!busy ? <Button testID="adapt-pdf" label="Scarica PDF" icon="file-pdf-box" variant="olive" onPress={pdf} /> : null}
        </Card>
      ) : null}
    </KeyboardAwareScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  hint: { color: c.muted, fontSize: 13, lineHeight: 19, fontFamily: fonts.body },
  body: { color: c.onSurface, fontSize: 14, lineHeight: 21, fontFamily: fonts.body },
}));
