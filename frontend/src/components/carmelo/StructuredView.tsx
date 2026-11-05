import React, { useState } from "react";
import { View, Text } from "react-native";

import { Card, Field, Button, useToast } from "@/src/components/ui";
import { makeStyles } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { api } from "@/src/lib/api";

// Renders a day-by-day itinerary and lets the admin refine it by chatting with Carmelo.
export function StructuredView({
  itinerary,
  onChange,
  sessionId,
  model,
  onPdf,
}: {
  itinerary: any;
  onChange: (it: any) => void;
  sessionId: string;
  model: string;
  onPdf: () => void;
}) {
  const s = useStyles();
  const toast = useToast();
  const [msg, setMsg] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const patch = async () => {
    if (!msg.trim()) return;
    setBusy(true);
    try {
      const res = await api.post("/carmelo/itinerary/patch", { session_id: sessionId, model, itinerary, message: msg.trim() }, { timeout: 180000 });
      onChange(res.data.itinerary);
      setReply(res.data.reply || "");
      setMsg("");
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Errore IA", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: spacing.md }} testID="ci-structured">
      <Card style={{ gap: 6 }}>
        <Text style={s.title}>{itinerary.title}</Text>
        {itinerary.intro ? <Text style={s.body}>{itinerary.intro}</Text> : null}
      </Card>
      {(itinerary.days || []).map((d: any) => (
        <Card key={d.day} style={{ gap: spacing.sm }}>
          <Text style={s.day}>Giorno {d.day}{d.theme ? ` · ${d.theme}` : ""}</Text>
          {(d.stops || []).map((st: any, i: number) => (
            <View key={i} style={s.stop}>
              <Text style={s.stopName}>{st.time ? `${st.time} · ` : ""}{st.name || st.title}</Text>
              {st.description ? <Text style={s.body}>{st.description}</Text> : null}
              <Text style={s.meta}>{[st.location, st.hours, st.cost, st.duration].filter(Boolean).join(" · ")}</Text>
            </View>
          ))}
        </Card>
      ))}
      <Card style={{ gap: spacing.sm }}>
        <Text style={s.day}>Modifica con Carmelo</Text>
        {reply ? <Text style={s.reply}>{reply}</Text> : null}
        <Field value={msg} onChangeText={setMsg} placeholder="Es. sposta lo Zingaro al giorno 2, aggiungi una cena di pesce" icon="pencil-outline" multiline testID="ci-patch-input" />
        <Button testID="ci-patch" label="Applica modifica" icon="auto-fix" variant="outline" onPress={patch} loading={busy} />
        <Button testID="ci-structured-pdf" label="Scarica PDF schematico" icon="file-pdf-box" variant="olive" onPress={onPdf} />
      </Card>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  title: { color: c.onSurface, fontSize: 20, fontFamily: fonts.heading },
  day: { color: c.brandPrimary, fontSize: 16, fontFamily: fonts.heading },
  stop: { borderLeftWidth: 2, borderLeftColor: c.brandSecondary, paddingLeft: spacing.sm, gap: 2 },
  stopName: { color: c.onSurface, fontSize: 14, fontFamily: fonts.body, fontWeight: "700" },
  body: { color: c.onSurfaceSecondary, fontSize: 13, lineHeight: 19, fontFamily: fonts.body },
  meta: { color: c.muted, fontSize: 12, fontFamily: fonts.body },
  reply: { color: c.onSurface, fontSize: 13, fontFamily: fonts.body, backgroundColor: c.surfaceTertiary, padding: spacing.sm, borderRadius: radius.md },
}));
