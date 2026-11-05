import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { Card, Field, Button, SectionTitle, Loading, useToast } from "@/src/components/ui";
import { JsonView } from "@/src/components/JsonView";
import { spacing } from "@/src/lib/typography";
import { api } from "@/src/lib/api";

// Personalised social marketing plan, generated in background and polled until ready.
export function StrategyTab() {
  const toast = useToast();
  const [goal, setGoal] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const start = async () => {
    setPlan(null);
    try {
      const res = await api.post("/admin/marketing/strategy/start", { goal: goal.trim() || null });
      const id = res.data.job_id as string;
      setJobId(id);
      timer.current = setInterval(async () => {
        try {
          const st = (await api.get(`/admin/marketing/strategy/status/${id}`)).data;
          if (st.status === "running") return;
          if (timer.current) clearInterval(timer.current);
          setJobId(null);
          if (st.status === "done") setPlan(st.plan);
          else toast.show(st.error || "Errore generazione", "error");
        } catch {
          // keep polling
        }
      }, 4000);
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Errore", "error");
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Card style={{ gap: spacing.sm }}>
        <SectionTitle title="Piano marketing con Carmelo" />
        <Field value={goal} onChangeText={setGoal} placeholder="Obiettivo (es. riempire settembre, più prenotazioni dirette)" icon="flag-outline" multiline testID="st-goal" />
        <Button testID="st-start" label="Crea strategia" icon="chart-timeline-variant" onPress={start} loading={!!jobId} />
      </Card>
      {jobId ? <Loading label="Carmelo sta preparando il piano (circa 1 minuto)…" /> : null}
      {plan ? (
        <Card testID="st-result">
          <JsonView data={plan} />
        </Card>
      ) : null}
    </View>
  );
}
