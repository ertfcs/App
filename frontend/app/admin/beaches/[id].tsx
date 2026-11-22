import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Header } from "@/src/components/Header";
import { Button, ChipRow, Field, Loading, useToast } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { useAuth } from "@/src/lib/auth";
import { api, mediaUri } from "@/src/lib/api";
import { pickAndUploadImage } from "@/src/lib/upload";
import { useBeaches, type MergedBeach } from "@/src/lib/beachData";

const WINDS = ["Tramontana", "Grecale", "Levante", "Scirocco", "Ostro", "Libeccio", "Ponente", "Maestrale"];
type Form = Record<string, string>;
const TEXTS: [string, string, boolean][] = [
  ["type", "Tipo di spiaggia (es. Sabbia, Scogli)", false],
  ["desc", "Descrizione", true],
  ["access", "Accesso", false],
  ["seabed", "Fondale", false],
  ["crowd", "Affollamento", false],
  ["food", "Da mangiare", false],
  ["parking_info", "Parcheggio (dettagli)", true],
  ["tips", "Consiglio / Nota", true],
];

export default function AdminBeachEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, loading } = useAuth();
  const beaches = useBeaches(true);
  const beach = beaches.data?.find((b) => b.id === id);

  useEffect(() => {
    if (!loading && !token) router.replace("/admin/login");
  }, [loading, token]);

  if (loading || !token || !beach) return <Loading />;
  return <BeachEditor key={beach.id} beach={beach} />;
}

function initialForm(beach: MergedBeach): Form {
  const f: Form = { name: beach.name, location: beach.location, prov: beach.prov, time: beach.time, dist: beach.dist };
  for (const [k] of TEXTS) f[k] = (beach.it as Record<string, string>)[k] ?? "";
  return f;
}

function BeachEditor({ beach }: { beach: MergedBeach }) {
  const id = beach.id;
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();

  const [form, setForm] = useState<Form>(() => initialForm(beach));
  const [flags, setFlags] = useState({ kids: beach.kids, lidi: beach.lidi, snorkel: beach.snorkel, park: beach.park, hidden: !!beach.hidden });
  const [parking, setParking] = useState<string>(beach.parking_type);
  const [good, setGood] = useState<string[]>(beach.wind_good ?? []);
  const [bad, setBad] = useState<string[]>(beach.wind_bad ?? []);
  const [image, setImage] = useState(beach.image ?? "");
  const [uploading, setUploading] = useState(false);

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggleWind = (list: string[], setList: (l: string[]) => void, w: string) =>
    setList(list.includes(w) ? list.filter((x) => x !== w) : [...list, w]);

  const save = useMutation({
    mutationFn: async () => api.put(`/beaches/${id}`, { ...form, ...flags, parking_type: parking, wind_good: good, wind_bad: bad, image: image || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beaches"] });
      toast.show("Spiaggia salvata", "success");
      router.back();
    },
    onError: () => toast.show("Errore salvataggio", "error"),
  });

  const reset = useMutation({
    mutationFn: async () => api.delete(`/beaches/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beaches"] });
      toast.show("Ripristinata all'originale", "info");
      router.back();
    },
    onError: () => toast.show("Errore", "error"),
  });

  const upload = async () => {
    setUploading(true);
    try {
      const url = await pickAndUploadImage();
      if (url) {
        setImage(url);
        toast.show("Foto caricata: ricordati di salvare", "success");
      }
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || e?.message || "Errore caricamento", "error");
    } finally {
      setUploading(false);
    }
  };

  const label = (text: string) => <Text style={s.label}>{text}</Text>;
  const check = (key: keyof typeof flags, text: string) => (
    <Pressable testID={`b-${key}`} onPress={() => setFlags((f) => ({ ...f, [key]: !f[key] }))} style={s.checkRow}>
      <Icon name={flags[key] ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={colors.brandPrimary} />
      <Text style={s.checkTxt}>{text}</Text>
    </Pressable>
  );
  const winds = (list: string[], setList: (l: string[]) => void, tint: string, tid: string) => (
    <View style={s.winds}>
      {WINDS.map((w) => {
        const on = list.includes(w);
        return (
          <Pressable key={w} testID={`${tid}-${w}`} onPress={() => toggleWind(list, setList, w)} style={[s.wind, on && { backgroundColor: tint, borderColor: tint }]}>
            <Text style={[s.windTxt, on && { color: "#FFFFFF" }]}>{w}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={s.screen}>
      <Header title="Modifica spiaggia" kicker="Admin" showBack showLang={false} />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm }} bottomOffset={24} showsVerticalScrollIndicator={false}>
        {label("Foto")}
        <View style={s.preview}>
          {image ? <Image source={{ uri: mediaUri(image) }} style={s.previewImg} contentFit="cover" /> : <Icon name="beach" size={40} color={colors.muted} />}
        </View>
        <Button testID="b-photo" label={image ? "Cambia foto" : "Carica foto dal telefono"} icon="image-plus" variant="outline" onPress={upload} loading={uploading} />
        <Field value={image} onChangeText={setImage} placeholder="oppure incolla un URL foto" icon="link-variant" autoCapitalize="none" testID="b-image" />

        {label("Nome")}
        <Field value={form.name ?? ""} onChangeText={set("name")} placeholder="Nome spiaggia" testID="b-name" />
        <View style={s.row2}>
          <View style={{ flex: 1 }}>
            {label("Località")}
            <Field value={form.location ?? ""} onChangeText={set("location")} placeholder="Comune" testID="b-location" />
          </View>
          <View>
            {label("Provincia")}
            <ChipRow items={[{ key: "PA", label: "PA" }, { key: "TP", label: "TP" }]} selected={form.prov || "PA"} onSelect={set("prov")} />
          </View>
        </View>
        <View style={s.row2}>
          <View style={{ flex: 1 }}>
            {label("Tempo da Trappeto")}
            <Field value={form.time ?? ""} onChangeText={set("time")} placeholder="es. 30 min" testID="b-time" />
          </View>
          <View style={{ flex: 1 }}>
            {label("Distanza / come arrivare")}
            <Field value={form.dist ?? ""} onChangeText={set("dist")} placeholder="es. 28 km" testID="b-dist" />
          </View>
        </View>

        {TEXTS.map(([k, text, multi]) => (
          <View key={k} style={{ gap: spacing.sm }}>
            {label(text)}
            <Field value={form[k] ?? ""} onChangeText={set(k)} placeholder={text} multiline={multi} testID={`b-${k}`} />
          </View>
        ))}

        {label("Adatta a")}
        <View style={s.checks}>
          {check("kids", "Bambini")}
          {check("lidi", "Lidi attrezzati")}
          {check("snorkel", "Snorkeling")}
          {check("park", "Parcheggio vicino")}
        </View>
        {label("Tipo di parcheggio")}
        <ChipRow
          items={[{ key: "free", label: "Gratis" }, { key: "paid", label: "A pagamento" }, { key: "mixed", label: "Misto / strisce blu" }]}
          selected={parking}
          onSelect={setParking}
        />

        {label("Venti con cui è CONSIGLIATA (mare calmo)")}
        {winds(good, setGood, colors.success, "good")}
        {label("Venti con cui è SCONSIGLIATA (mare mosso)")}
        {winds(bad, setBad, colors.error, "bad")}

        {check("hidden", "Nascondi questa spiaggia agli ospiti")}
        <Text style={s.hint}>{"I testi che scrivi qui valgono per l'italiano; le altre lingue restano quelle già presenti."}</Text>

        <Button testID="b-save" label="Salva spiaggia" icon="content-save" onPress={() => save.mutate()} loading={save.isPending} />
        <Button testID="b-reset" label="Ripristina originale" icon="restore" variant="outline" onPress={() => reset.mutate()} loading={reset.isPending} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  label: { color: c.onSurface, fontSize: 13, fontWeight: "700", fontFamily: fonts.body, marginTop: 4 },
  hint: { color: c.muted, fontSize: 12, lineHeight: 17, fontFamily: fonts.body },
  preview: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.md, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  previewImg: { width: "100%", height: "100%" },
  row2: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  checks: { gap: 4 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 4 },
  checkTxt: { color: c.onSurface, fontSize: 14, fontFamily: fonts.body },
  winds: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  wind: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  windTxt: { color: c.onSurface, fontSize: 12, fontWeight: "600", fontFamily: fonts.body },
}));
