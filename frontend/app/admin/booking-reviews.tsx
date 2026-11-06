import React, { useEffect, useState } from "react";
import { View, Text, Switch, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Header } from "@/src/components/Header";
import { Card, Field, Button, SectionTitle, Loading, useToast } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { CountryPicker } from "@/src/components/CountryPicker";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, spacing } from "@/src/lib/typography";
import { useAuth } from "@/src/lib/auth";
import { api } from "@/src/lib/api";
import { countryByName } from "@/src/lib/countries";

type Review = { id?: string; name: string; country: string; flag: string; rating: number; text: string; visible: boolean };
const EMPTY: Review = { name: "", country: "", flag: "", rating: 5, text: "", visible: true };

export default function AdminBookingReviews() {
  const s = useStyles();
  const { colors } = useTheme();
  const { token, loading } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const [url, setUrl] = useState("");
  const [score, setScore] = useState("");
  const [count, setCount] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !token) router.replace("/admin/login");
  }, [loading, token]);

  const cfg = useQuery({
    queryKey: ["admin-booking-reviews"],
    enabled: !!token,
    queryFn: async () => (await api.get("/admin/booking-reviews")).data,
  });

  useEffect(() => {
    const d = cfg.data;
    if (!d) return;
    setUrl(d.booking_url || "");
    setScore(d.score != null ? String(d.score).replace(".", ",") : "");
    setCount(d.review_count != null ? String(d.review_count) : "");
    setReviews((d.reviews || []).map((r: any) => ({ ...EMPTY, ...r, flag: countryByName(r.country || "")?.flag ?? r.flag ?? "" })));
  }, [cfg.data]);

  const upd = (i: number, patch: Partial<Review>) => setReviews((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, dir: -1 | 1) =>
    setReviews((rs) => {
      const j = i + dir;
      if (j < 0 || j >= rs.length) return rs;
      const n = [...rs];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const save = async () => {
    const bad = reviews.find((r) => !r.name.trim() || !r.text.trim());
    if (bad) return toast.show("Ogni recensione deve avere nome e testo", "error");
    const sc = score.trim() ? Number(score.replace(",", ".")) : null;
    if (sc != null && (isNaN(sc) || sc < 0 || sc > 10)) return toast.show("Il voto deve essere tra 0 e 10", "error");
    setSaving(true);
    try {
      await api.put("/admin/booking-reviews", {
        booking_url: url.trim(),
        score: sc,
        review_count: count.trim() ? parseInt(count, 10) || 0 : null,
        reviews: reviews.map((r) => ({ ...r, name: r.name.trim(), text: r.text.trim() })),
      });
      toast.show("Recensioni salvate", "success");
      qc.invalidateQueries({ queryKey: ["admin-booking-reviews"] });
      qc.invalidateQueries({ queryKey: ["booking-reviews"] });
    } catch (e: any) {
      toast.show(e?.response?.data?.detail?.[0]?.msg || e?.response?.data?.detail || "Errore", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !token) return <Loading />;

  return (
    <View style={s.screen}>
      <Header title="Recensioni Booking" kicker="Admin" showBack showLang={false} />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }} bottomOffset={20} showsVerticalScrollIndicator={false}>
        {cfg.isLoading ? (
          <Loading />
        ) : (
          <>
            <Card style={{ gap: spacing.sm }}>
              <SectionTitle title="Pagina Booking.com" />
              <Text style={s.hint}>Il pulsante "Vedi tutte le recensioni" in fondo alla Home apre questo link. Voto e numero li copi da Booking.</Text>
              <Field value={url} onChangeText={setUrl} placeholder="Link Booking.com" icon="link-variant" autoCapitalize="none" testID="br-url" />
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <View style={{ flex: 1 }}><Field value={score} onChangeText={setScore} placeholder="Voto (es. 8,8)" icon="star-outline" keyboardType="decimal-pad" testID="br-score" /></View>
                <View style={{ flex: 1 }}><Field value={count} onChangeText={setCount} placeholder="N. recensioni" icon="counter" keyboardType="number-pad" testID="br-count" /></View>
              </View>
            </Card>

            <SectionTitle title={`Recensioni in vetrina (${reviews.filter((r) => r.visible).length})`} />
            {reviews.map((r, i) => (
              <Card key={r.id || `new-${i}`} style={{ gap: spacing.sm }} testID={`br-review-${i}`}>
                <View style={s.rowBetween}>
                  <Text style={s.label}>Recensione {i + 1}</Text>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <Pressable onPress={() => move(i, -1)} testID={`br-up-${i}`} hitSlop={6}><Icon name="arrow-up" size={20} color={colors.muted} /></Pressable>
                    <Pressable onPress={() => move(i, 1)} testID={`br-down-${i}`} hitSlop={6}><Icon name="arrow-down" size={20} color={colors.muted} /></Pressable>
                    <Pressable onPress={() => setReviews((rs) => rs.filter((_, j) => j !== i))} testID={`br-delete-${i}`} hitSlop={6}><Icon name="trash-can-outline" size={20} color={colors.error} /></Pressable>
                  </View>
                </View>
                <Field value={r.name} onChangeText={(v) => upd(i, { name: v })} placeholder="Nome ospite" icon="account-outline" testID={`br-name-${i}`} />
                <CountryPicker value={r.country} flag={r.flag} onSelect={(c) => upd(i, { country: c.name, flag: c.flag })} testID={`br-country-${i}`} />
                <View style={s.rowBetween}>
                  <Text style={s.label}>Stelle</Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Pressable key={n} onPress={() => upd(i, { rating: n })} testID={`br-star-${i}-${n}`} hitSlop={4}>
                        <Icon name={n <= r.rating ? "star" : "star-outline"} size={24} color="#FEBB02" />
                      </Pressable>
                    ))}
                  </View>
                </View>
                <Field value={r.text} onChangeText={(v) => upd(i, { text: v })} placeholder="Testo originale, nella lingua dell'ospite (gli ospiti potranno tradurlo)" multiline testID={`br-text-${i}`} />
                <View style={s.rowBetween}>
                  <Text style={s.label}>Mostra in vetrina</Text>
                  <Switch value={r.visible} onValueChange={(v) => upd(i, { visible: v })} trackColor={{ true: colors.brandPrimary }} testID={`br-visible-${i}`} />
                </View>
              </Card>
            ))}

            <Button testID="br-add" label="Aggiungi recensione" icon="plus" variant="outline" onPress={() => setReviews((rs) => [...rs, { ...EMPTY }])} />
            <Button testID="br-save" label="Salva" icon="content-save" onPress={save} loading={saving} />
          </>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  hint: { color: c.muted, fontSize: 13, fontFamily: fonts.body, marginBottom: spacing.xs },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { color: c.onSurface, fontSize: 15, fontFamily: fonts.body },
}));
