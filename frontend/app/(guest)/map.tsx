import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Modal, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Header } from "@/src/components/Header";
import { ChipRow, Loading, Field, Button, useToast } from "@/src/components/ui";
import { Icon, IconName } from "@/src/components/Icon";
import { PoiMap } from "@/src/components/PoiMap";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { usePois, Poi } from "@/src/lib/queries";
import { useItinerary } from "@/src/lib/itinerary";
import { api } from "@/src/lib/api";
import { downloadItineraryPdf } from "@/src/lib/pdf";
import { SuggestedItineraries } from "@/src/components/SuggestedItineraries";

const CAT_TINT: Record<string, (c: any) => string> = {
  art: (c) => c.brandPrimary,
  beach: (c) => c.info,
  nature: (c) => c.olive,
};

export default function MapScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const pois = usePois();
  const { ids: selected, toggle, remove, clear, has } = useItinerary();

  const [cat, setCat] = useState("all");
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [name, setName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [detail, setDetail] = useState<Poi | null>(null);

  const chips = [
    { key: "all", label: t("guest.all"), icon: "map-marker-multiple" as IconName },
    { key: "art", label: t("map_page.categories.art"), icon: "bank" as IconName },
    { key: "beach", label: t("map_page.categories.beach"), icon: "beach" as IconName },
    { key: "nature", label: t("map_page.categories.nature"), icon: "pine-tree" as IconName },
  ];

  const all = useMemo(() => pois.data ?? [], [pois.data]);
  const filtered = useMemo(() => (cat === "all" ? all : all.filter((p) => p.category === cat)), [all, cat]);
  const selectedPois = useMemo(() => all.filter((p) => selected.includes(p.id)), [all, selected]);

  const tintFor = useCallback((category: string) => (CAT_TINT[category] ?? CAT_TINT.art)(colors), [colors]);

  const onPressPoi = (p: Poi) => {
    if (!unlocked) {
      toast.show(t("guest.need_code_details"), "error");
      return;
    }
    setDetail(p);
  };

  const openDirections = (p: Poi) => {
    const url = p.maps_url || `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
    Linking.openURL(url).catch(() => {});
  };

  const verify = async () => {
    if (!code.trim()) return toast.show(t("guest.enter_code"), "error");
    setVerifying(true);
    try {
      await api.post("/verify-code", { code: code.trim() });
      setUnlocked(true);
      toast.show(t("guest.unlocked_toast"), "success");
    } catch (e: any) {
      setUnlocked(false);
      toast.show(e?.response?.data?.detail || t("guest.invalid_code"), "error");
    } finally {
      setVerifying(false);
    }
  };

  const download = async () => {
    if (selected.length === 0) return toast.show(t("guest.select_one"), "error");
    if (!unlocked) return toast.show(t("guest.unlock_first"), "error");
    setDownloading(true);
    try {
      await downloadItineraryPdf({ code: code.trim(), poiIds: selected, travelerName: name.trim() });
      toast.show(t("guest.itinerary_ready"), "success");
    } catch (e: any) {
      toast.show(e?.message || t("map_page.pdf_error"), "error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={s.screen}>
      <Header title={t("guest.map_title")} kicker={t("guest.map_kicker")} />
      <ChipRow items={chips} selected={cat} onSelect={setCat} />

      <View style={s.mapBox}>
        {pois.isLoading ? (
          <Loading />
        ) : (
          <PoiMap pois={filtered} selectedIds={selected} onPressPoi={onPressPoi} tintFor={tintFor} />
        )}
        {!unlocked ? (
          <View style={s.lockOverlay} pointerEvents="none">
            <View style={s.lockPill}>
              <Icon name="lock-outline" size={14} color={colors.onBrandPrimary} />
              <Text style={s.lockPillTxt}>{t("guest.lock_pill")}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 24, gap: spacing.md }} showsVerticalScrollIndicator={false}>
        <View style={s.unlockCard}>
          <View style={s.unlockHead}>
            <Icon name={unlocked ? "lock-open-variant" : "lock-outline"} size={18} color={unlocked ? colors.success : colors.brand} />
            <Text style={s.unlockTitle}>{unlocked ? t("guest.map_unlocked") : t("guest.unlock_map")}</Text>
          </View>
          {!unlocked ? (
            <>
              <Text style={s.hint}>{t("guest.unlock_hint")}</Text>
              <Field value={code} onChangeText={setCode} placeholder={t("guest.code_ph")} icon="key-variant" autoCapitalize="characters" testID="unlock-code" />
              <Button testID="unlock-btn" label={t("guest.unlock_btn")} icon="lock-open-variant" variant="olive" onPress={verify} loading={verifying} />
            </>
          ) : (
            <Field value={name} onChangeText={setName} placeholder={t("map_page.traveler_name_ph")} icon="account-outline" testID="traveler-name" />
          )}
        </View>

        <View style={s.sel}>
          <Icon name="playlist-check" size={18} color={colors.brandPrimary} />
          <Text style={s.selTitle}>{t("map_page.my_itinerary")} · {selected.length}</Text>
          {selected.length > 0 ? (
            <Pressable testID="clear-itinerary" onPress={clear} hitSlop={6}>
              <Text style={s.clear}>{t("map_page.clear")}</Text>
            </Pressable>
          ) : null}
        </View>

        {selectedPois.length === 0 ? (
          <Text style={s.hint}>{t("guest.build_hint")}</Text>
        ) : (
          <View style={{ gap: 6 }}>
            {selectedPois.map((p, i) => (
              <View key={p.id} style={s.selRow} testID={`sel-${p.id}`}>
                <View style={[s.num, { backgroundColor: colors.brandPrimary }]}>
                  <Text style={s.numTxt}>{i + 1}</Text>
                </View>
                <Text style={s.selName} numberOfLines={1}>{p.name}</Text>
                <Pressable testID={`sel-dir-${p.id}`} onPress={() => openDirections(p)} hitSlop={8} style={{ padding: 4 }}>
                  <Icon name="directions" size={18} color={colors.olive} />
                </Pressable>
                <Pressable testID={`sel-remove-${p.id}`} onPress={() => remove(p.id)} hitSlop={8} style={{ padding: 4 }}>
                  <Icon name="close" size={18} color={colors.muted} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Button testID="download-pdf" label={t("map_page.download_pdf")} icon="file-pdf-box" onPress={download} loading={downloading} disabled={selected.length === 0} />

        <SuggestedItineraries code={unlocked ? code.trim() : ""} />
      </ScrollView>

      {/* POI detail sheet */}
      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <Pressable style={s.backdrop} onPress={() => setDetail(null)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            {detail ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 8 }}>
                <View style={s.sheetHead}>
                  <View style={[s.sheetIcon, { backgroundColor: tintFor(detail.category) + "22" }]}>
                    <Icon name={detail.category === "beach" ? "beach" : detail.category === "nature" ? "pine-tree" : "bank"} size={22} color={tintFor(detail.category)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.sheetTitle}>{detail.name}</Text>
                    <Text style={s.sheetLoc}>{detail.town ?? detail.province ?? "Sicilia"}</Text>
                  </View>
                  <Pressable testID="detail-close" onPress={() => setDetail(null)} hitSlop={8}><Icon name="close" size={24} color={colors.muted} /></Pressable>
                </View>

                {detail.description ? <Text style={s.sheetDesc}>{detail.description}</Text> : null}

                <View style={s.infoGrid}>
                  {detail.price ? <InfoChip icon="cash" label={detail.price} c={colors} /> : null}
                  {detail.hours ? <InfoChip icon="clock-outline" label={detail.hours} c={colors} /> : null}
                  {detail.duration ? <InfoChip icon="timer-sand" label={detail.duration} c={colors} /> : null}
                  {detail.discount ? <InfoChip icon="sale" label={detail.discount} c={colors} /> : null}
                </View>
                {detail.notes ? <Text style={s.notes}>ℹ️ {detail.notes}</Text> : null}
                <Text style={s.coords}>📍 {detail.lat.toFixed(4)}, {detail.lng.toFixed(4)}</Text>

                <View style={s.sheetBtns}>
                  <View style={{ flex: 1 }}>
                    <Button
                      testID="detail-add"
                      label={has(detail.id) ? t("map_page.remove") : t("guest.add")}
                      icon={has(detail.id) ? "playlist-remove" : "playlist-plus"}
                      variant={has(detail.id) ? "outline" : "primary"}
                      onPress={() => toggle(detail.id)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button testID="detail-directions" label={t("map_page.directions")} icon="directions" variant="olive" onPress={() => openDirections(detail)} />
                  </View>
                </View>
                {detail.ticket_url ? (
                  <Pressable testID="detail-ticket" style={s.ticketLink} onPress={() => Linking.openURL(detail.ticket_url!)}>
                    <Icon name="ticket-confirmation-outline" size={16} color={colors.brandPrimary} />
                    <Text style={s.ticketTxt}>{t("guest.tickets_site")}</Text>
                  </Pressable>
                ) : null}
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function InfoChip({ icon, label, c }: { icon: IconName; label: string; c: any }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surfaceTertiary, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 }}>
      <Icon name={icon} size={15} color={c.olive} />
      <Text style={{ color: c.onSurface, fontSize: 13, fontFamily: fonts.body }}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  mapBox: { height: 340, overflow: "hidden", backgroundColor: c.surfaceTertiary, borderBottomWidth: 1, borderBottomColor: c.divider },
  lockOverlay: { ...({ position: "absolute" } as const), left: 0, right: 0, bottom: 10, alignItems: "center" },
  lockPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.brandPrimary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  lockPillTxt: { color: c.onBrandPrimary, fontSize: 12, fontFamily: fonts.body },
  sel: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  selTitle: { flex: 1, color: c.onSurface, fontSize: 17, fontFamily: fonts.heading },
  clear: { color: c.error, fontSize: 13, fontFamily: fonts.body, fontWeight: "600" },
  hint: { color: c.muted, fontSize: 13, fontFamily: fonts.body, lineHeight: 19 },
  selRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: c.border },
  num: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  numTxt: { color: c.onBrandPrimary, fontSize: 12, fontFamily: fonts.heading },
  selName: { flex: 1, color: c.onSurface, fontSize: 14, fontFamily: fonts.body },
  unlockCard: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: c.border, gap: spacing.sm },
  unlockHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  unlockTitle: { color: c.onSurface, fontSize: 16, fontFamily: fonts.heading },
  backdrop: { flex: 1, backgroundColor: "rgba(44,42,40,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "82%" },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  sheetIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  sheetTitle: { color: c.onSurface, fontSize: 19, fontFamily: fonts.heading },
  sheetLoc: { color: c.muted, fontSize: 13, fontFamily: fonts.body, marginTop: 1 },
  sheetDesc: { color: c.onSurface, fontSize: 14, fontFamily: fonts.body, lineHeight: 21, marginBottom: spacing.sm },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: spacing.sm },
  notes: { color: c.onSurfaceSecondary, fontSize: 13, fontFamily: fonts.body, lineHeight: 19, marginBottom: 4 },
  coords: { color: c.muted, fontSize: 12, fontFamily: fonts.body, marginBottom: spacing.md },
  sheetBtns: { flexDirection: "row", gap: spacing.sm },
  ticketLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: spacing.sm, paddingVertical: 8 },
  ticketTxt: { color: c.brandPrimary, fontSize: 14, fontFamily: fonts.body, fontWeight: "600" },
}));
