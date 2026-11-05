import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Card, Field, Button, SectionTitle, ChipRow, useToast } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, spacing } from "@/src/lib/typography";
import { api } from "@/src/lib/api";
import { euro } from "@/src/lib/format";
import { confirmAction } from "@/src/lib/confirm";

const FIELDS: { key: string; label: string; icon: any }[] = [
  { key: "base_price_per_night", label: "Prezzo base sito / notte (€)", icon: "cash" },
  { key: "base_booking_price_per_night", label: "Prezzo base Booking / notte (€)", icon: "alpha-b-box" },
  { key: "base_guests", label: "Ospiti inclusi nel prezzo", icon: "account-multiple" },
  { key: "extra_person_per_night", label: "Persona extra / notte (€)", icon: "account-plus" },
  { key: "ac_per_night", label: "Aria condizionata / notte (€)", icon: "air-conditioner" },
  { key: "tourist_tax_per_person_per_night", label: "Tassa soggiorno / persona / notte (€)", icon: "bank-outline" },
  { key: "cleaning_fee", label: "Pulizia finale (€)", icon: "broom" },
];

// Base tariff settings used by the guest quote (/quote).
export function BaseFeesCard() {
  const s = useStyles();
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const fees = useQuery({ queryKey: ["fees"], queryFn: async () => (await api.get("/fees")).data });

  useEffect(() => {
    if (fees.data) setForm(Object.fromEntries(Object.entries(fees.data).map(([k, v]) => [k, String(v ?? "")])));
  }, [fees.data]);

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, any> = { booking_url: form.booking_url || "" };
      FIELDS.forEach((f) => (body[f.key] = parseFloat(form[f.key]) || 0));
      body.base_guests = Math.round(body.base_guests) || 1;
      await api.put("/fees", body);
      qc.invalidateQueries({ queryKey: ["fees"] });
      qc.invalidateQueries({ queryKey: ["quote"] });
      toast.show("Tariffe base salvate", "success");
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Errore", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={{ gap: spacing.sm }}>
      <SectionTitle kicker="Preventivo ospiti" title="Tariffe base" />
      {FIELDS.map((f) => (
        <View key={f.key}>
          <Text style={s.label}>{f.label}</Text>
          <Field value={form[f.key] || ""} onChangeText={(v) => setForm({ ...form, [f.key]: v })} placeholder={f.label} icon={f.icon} keyboardType="numeric" testID={`fee-${f.key}`} />
        </View>
      ))}
      <Text style={s.label}>Link Booking.com</Text>
      <Field value={form.booking_url || ""} onChangeText={(v) => setForm({ ...form, booking_url: v })} placeholder="https://www.booking.com/..." icon="link-variant" autoCapitalize="none" testID="fee-booking_url" />
      <Button testID="fees-save" label="Salva tariffe base" icon="content-save" onPress={save} loading={saving} />
    </Card>
  );
}

// Extra costs added to every quote (per night or per stay).
export function CustomFeesCard() {
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("per_stay");
  const list = useQuery({ queryKey: ["custom-fees"], queryFn: async () => (await api.get("/custom-fees")).data as any[] });

  const run = async (fn: () => Promise<any>, ok: string) => {
    try {
      await fn();
      qc.invalidateQueries({ queryKey: ["custom-fees"] });
      qc.invalidateQueries({ queryKey: ["quote"] });
      toast.show(ok, "success");
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Errore", "error");
    }
  };

  const add = () => {
    if (!name.trim() || !parseFloat(amount)) return toast.show("Nome e importo obbligatori", "error");
    run(() => api.post("/custom-fees", { name: name.trim(), amount: parseFloat(amount), mode }), "Costo aggiunto").then(() => {
      setName("");
      setAmount("");
    });
  };

  return (
    <Card style={{ gap: spacing.sm }}>
      <SectionTitle kicker="Preventivo ospiti" title="Costi extra" />
      {(list.data ?? []).map((f) => (
        <View key={f.id} style={s.row} testID={`cfee-${f.id}`}>
          <Text style={s.name}>{f.name}</Text>
          <Text style={s.val}>{euro(f.amount)} {f.mode === "per_night" ? "/ notte" : "/ soggiorno"}</Text>
          <Pressable testID={`cfee-del-${f.id}`} onPress={async () => (await confirmAction(`Eliminare "${f.name}"?`)) && run(() => api.delete(`/custom-fees/${f.id}`), "Eliminato")} hitSlop={6}>
            <Icon name="trash-can-outline" size={18} color={colors.error} />
          </Pressable>
        </View>
      ))}
      <Field value={name} onChangeText={setName} placeholder="Nome (es. Biancheria extra)" icon="tag-outline" testID="cfee-name" />
      <Field value={amount} onChangeText={setAmount} placeholder="Importo €" icon="cash" keyboardType="numeric" testID="cfee-amount" />
      <ChipRow items={[{ key: "per_stay", label: "Per soggiorno" }, { key: "per_night", label: "Per notte" }]} selected={mode} onSelect={setMode} />
      <Button testID="cfee-add" label="Aggiungi costo" icon="plus" variant="olive" onPress={add} />
    </Card>
  );
}

const useStyles = makeStyles((c) => ({
  label: { color: c.muted, fontSize: 11, fontFamily: fonts.body, marginBottom: 3 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider, paddingBottom: 6 },
  name: { flex: 1, color: c.onSurface, fontSize: 14, fontFamily: fonts.body },
  val: { color: c.onSurfaceSecondary, fontSize: 13, fontFamily: fonts.body },
}));
