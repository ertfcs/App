import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Modal, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Header } from "@/src/components/Header";
import { Field, Button, useToast } from "@/src/components/ui";
import { Icon, IconName } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { usePois, Poi , poiText } from "@/src/lib/queries";
import { useItinerary } from "@/src/lib/itinerary";
import { downloadItineraryPdf } from "@/src/lib/pdf";
import { SuggestedItineraries } from "@/src/components/SuggestedItineraries";
import { LockedSection } from "@/src/components/LockedSection";
import { router } from "expo-router";
import { useGuestAccess } from "@/src/lib/guestAccess";

const CAT_TINT: Record<string, (c: any) => string> = {
  art: (c) => c.brandPrimary,
  beach: (c) => c.info,
  nature: (c) => c.olive,
};

export default function MapScreen() {
  const { t, i18n } = useTranslation();
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const pois = usePois();
  const { ids: selected, toggle, remove, clear, has } = useItinerary();

  const access = useGuestAccess();
  const unlocked = access.unlocked;
  const [name, setName] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [detail, setDetail] = useState<Poi | null>(null);

  const all = useMemo(() => pois.data ?? [], [pois.data]);
  const selectedPois = useMemo(() => all.filter((p) => selected.includes(p.id)), [all, selected]);

  const tintFor = useCallback((category: string) => (CAT_TINT[category] ?? CAT_TINT.art)(colors), [colors]);

  const openDirections = (p: Poi) => {
    const url = p.maps_url || `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
    Linking.openURL(url).catch(() => {});
  };

  const download = async () => {
    if (selected.length === 0) return toast.show(t("guest.select_one"), "error");
    if (!unlocked) return toast.show(t("guest.unlock_first"), "error");
    setDownloading(true);
    try {
      await downloadItineraryPdf({ code: access.code, poiIds: selected, travelerName: name.trim() });
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
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 24, gap: spacing.md }} showsVerticalScrollIndicator={false}>
        {/* 1. Itinerari consigliati */}
        <View style={{ gap: 4 }}>
          <Text style={s.kicker}>{t("itin.suggested_kicker")}</Text>
          <Text style={s.h2}>{t("itin.suggested_title")}</Text>
        </View>
        <SuggestedItineraries code={access.code} hideTitle />

        {/* 2. Crea il tuo itinerario */}
        <View style={[s.createCard]} testID="create-itinerary">
          <Text style={s.kicker}>{t("itin.create_kicker")}</Text>
          <Text style={s.h2}>{t("itin.create_title")}</Text>
          <Text style={s.hint}>{t("itin.create_hint")}</Text>
          <Button testID="pick-places" label={t("itin.pick_places")} icon="plus" variant="outline" onPress={() => router.push("/places")} />

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
            <Text style={s.hint}>{t("itin.empty")}</Text>
          ) : (
            <View style={{ gap: 6 }}>
              {selectedPois.map((p, i) => (
                <View key={p.id} style={s.selRow} testID={`sel-${p.id}`}>
                  <View style={[s.num, { backgroundColor: colors.brandPrimary }]}>
                    <Text style={s.numTxt}>{i + 1}</Text>
                  </View>
                  <Pressable style={{ flex: 1 }} onPress={() => setDetail(p)}>
                    <Text style={s.selName} numberOfLines={1}>{p.name}</Text>
                  </Pressable>
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

          {unlocked ? (
            <>
              <Field value={name} onChangeText={setName} placeholder={t("map_page.traveler_name_ph")} icon="account-outline" testID="traveler-name" />
              <Button testID="download-pdf" label={t("map_page.download_pdf")} icon="file-pdf-box" onPress={download} loading={downloading} disabled={selected.length === 0} />
            </>
          ) : (
            <LockedSection compact title={t("itin.pdf_locked_title")} text={t("itin.pdf_locked_text")} />
          )}
        </View>
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

                {poiText(detail, "description", i18n.language) ? <Text style={s.sheetDesc}>{poiText(detail, "description", i18n.language)}</Text> : null}

                <View style={s.infoGrid}>
                  {poiText(detail, "price", i18n.language) ? <InfoChip icon="cash" label={poiText(detail, "price", i18n.language) ?? ""} c={colors} /> : null}
                  {poiText(detail, "hours", i18n.language) ? <InfoChip icon="clock-outline" label={poiText(detail, "hours", i18n.language) ?? ""} c={colors} /> : null}
                  {poiText(detail, "duration", i18n.language) ? <InfoChip icon="timer-sand" label={poiText(detail, "duration", i18n.language) ?? ""} c={colors} /> : null}
                  {poiText(detail, "discount", i18n.language) ? <InfoChip icon="sale" label={poiText(detail, "discount", i18n.language) ?? ""} c={colors} /> : null}
                </View>
                {poiText(detail, "notes", i18n.language) ? <Text style={s.notes}>ℹ️ {poiText(detail, "notes", i18n.language)}</Text> : null}
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
  kicker: { color: c.brandPrimary, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", fontFamily: fonts.body },
  h2: { color: c.onSurface, fontSize: 24, lineHeight: 28, fontFamily: fonts.heading },
  createCard: { gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary },
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
