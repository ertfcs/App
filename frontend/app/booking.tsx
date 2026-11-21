import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Switch } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import { Header } from "@/src/components/Header";
import { Button, Card, Field, SectionTitle, useToast } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { api } from "@/src/lib/api";
import { euro, nightsBetween } from "@/src/lib/format";
import { useAvailability } from "@/src/lib/queries";
import { DateRangeCalendar, DateRange, RangeHint } from "@/src/components/DateRangeCalendar";

export default function BookingScreen() {
  const params = useLocalSearchParams<{ start?: string; end?: string }>();
  const { t } = useTranslation();
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [guests, setGuests] = useState(2);
  const [ac, setAc] = useState(false);
  const [discount, setDiscount] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const availability = useAvailability();
  const blocked = useMemo(() => new Set(availability.data?.blocked_dates ?? []), [availability.data]);
  const [range, setRange] = useState<DateRange>({ start: params.start || null, end: params.end || null });
  const start = range.start || "";
  const end = range.end || "";
  const nights = nightsBetween(start, end);
  const canQuote = !!start && !!end && nights > 0;
  const [showCalendar, setShowCalendar] = useState(!(params.start && params.end));
  const fmtDate = (iso: string) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");

  const quoteBody = useMemo(
    () => ({
      guest_name: name || "x",
      guest_email: email || "x@x.it",
      check_in: start,
      check_out: end,
      guests,
      extras: { ac },
      discount_code: discount || null,
    }),
    [name, email, start, end, guests, ac, discount],
  );

  const quote = useQuery({
    queryKey: ["quote", start, end, guests, ac, discount],
    enabled: canQuote,
    queryFn: async () => (await api.post("/quote", quoteBody)).data,
  });

  const code = discount.trim().toUpperCase();
  const discountCheck = useQuery({
    queryKey: ["discount-validate", code],
    enabled: code.length >= 3,
    retry: false,
    queryFn: async () => {
      try {
        const d = (await api.get(`/discount-codes/validate/${encodeURIComponent(code)}`)).data;
        return { ok: true, code: d.code, percent: d.percent, error: "" };
      } catch (e: any) {
        return { ok: false, code, percent: 0, error: e?.response?.data?.detail || "Codice non valido" };
      }
    },
  });

  const submit = async () => {
    if (!canQuote) return toast.show(t("booking.toast_select_dates"), "error");
    if (!name.trim() || !email.trim()) return toast.show(t("booking.toast_need_name_email"), "error");
    if (!phone.trim()) return toast.show(t("booking.toast_need_phone"), "error");
    setSubmitting(true);
    try {
      await api.post("/bookings", {
        guest_name: name,
        guest_email: email,
        guest_phone: phone,
        check_in: start,
        check_out: end,
        guests,
        extras: { ac },
        discount_code: discount || null,
        message: message || null,
      });
      toast.show(t("booking.toast_sent"), "success");
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || t("booking.toast_error"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const q = quote.data;

  return (
    <View style={s.screen}>
      <Header title={t("booking.title")} showBack showLang={false} />
      <KeyboardAwareScrollView
        testID="booking-scroll"
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
        bottomOffset={20}
        showsVerticalScrollIndicator={false}
      >
        {/* Dates: chosen on the home page (summary + "Cambia date"), or picked here */}
        {showCalendar ? (
          <Card style={{ padding: spacing.sm }}>
            <View style={{ paddingHorizontal: spacing.sm, paddingTop: spacing.xs }}>
              <SectionTitle title={t("booking.dates_title")} />
            </View>
            <DateRangeCalendar blocked={blocked} value={range} onChange={setRange} testID="booking-calendar" />
            <View style={{ paddingHorizontal: spacing.sm }}>
              <RangeHint value={range} onClear={() => setRange({ start: null, end: null })} />
            </View>
          </Card>
        ) : (
          <Card style={s.datesCard} testID="booking-dates-summary">
            <Icon name="calendar-check" size={22} color={colors.olive} />
            <View style={{ flex: 1 }}>
              <Text style={s.datesLabel}>{t("booking.dates_title")}</Text>
              <Text style={s.datesValue}>
                {fmtDate(start)} → {fmtDate(end)} · {t(nights === 1 ? "calendar.night_one" : "calendar.night_other", { n: nights })}
              </Text>
            </View>
            <Pressable testID="booking-change-dates" onPress={() => setShowCalendar(true)} hitSlop={8}>
              <Text style={s.datesChange}>{t("booking.change_dates")}</Text>
            </Pressable>
          </Card>
        )}

        {/* Guests + AC */}
        <Card style={{ marginTop: spacing.md, gap: spacing.md }}>
          <View style={s.stepperRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Icon name="account-group-outline" size={20} color={colors.olive} />
              <Text style={s.rowLabel}>{t("booking.guests")}</Text>
            </View>
            <View style={s.stepper}>
              <Pressable testID="guests-minus" onPress={() => setGuests((g) => Math.max(1, g - 1))} style={s.stepBtn}>
                <Icon name="minus" size={18} color={colors.onSurface} />
              </Pressable>
              <Text style={s.stepVal}>{guests}</Text>
              <Pressable testID="guests-plus" onPress={() => setGuests((g) => Math.min(10, g + 1))} style={s.stepBtn}>
                <Icon name="plus" size={18} color={colors.onSurface} />
              </Pressable>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.stepperRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Icon name="snowflake" size={20} color={colors.info} />
              <Text style={s.rowLabel}>{t("booking.ac")}</Text>
            </View>
            <Switch
              testID="ac-switch"
              value={ac}
              onValueChange={setAc}
              trackColor={{ true: colors.olive, false: colors.border }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        {/* Discount */}
        <View style={{ marginTop: spacing.md }}>
          <Field value={discount} onChangeText={setDiscount} placeholder={t("booking.discount_code")} icon="ticket-percent-outline" autoCapitalize="characters" testID="discount-code" />
          {discountCheck.data ? (
            <Text testID="discount-status" style={[s.discountStatus, { color: discountCheck.data.ok ? colors.success : colors.error }]}>
              {discountCheck.data.ok ? `✓ ${discountCheck.data.code} −${discountCheck.data.percent}%` : `✗ ${discountCheck.data.error}`}
            </Text>
          ) : null}
        </View>

        {/* Quote breakdown */}
        {canQuote && q ? (
          <Card style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <SectionTitle title={t("booking.site_total")} />
            <QuoteRow label={t("booking.n_nights", { n: q.nights })} value={euro(q.nightly_total)} />
            {q.extra_guest_fees > 0 ? <QuoteRow label={t("booking.extra_guests")} value={euro(q.extra_guest_fees)} /> : null}
            {q.ac_fee > 0 ? <QuoteRow label={t("booking.ac")} value={euro(q.ac_fee)} /> : null}
            <QuoteRow label={t("booking.cleaning")} value={euro(q.cleaning_fee)} />
            <QuoteRow label={t("booking.tourist_tax")} value={euro(q.tourist_tax)} />
            {(q.custom_fees ?? []).map((cf: any) => (
              <QuoteRow key={cf.name} label={cf.name} value={euro(cf.cost)} />
            ))}
            {q.discount_amount > 0 ? (
              <QuoteRow
                label={t("booking.discount_label", { code: q.discount_info?.code, percent: q.discount_info?.percent })}
                value={`- ${euro(q.discount_amount)}`}
                highlight
              />
            ) : null}
            <View style={s.divider} />
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>{t("booking.site_total")}</Text>
              <Text style={s.totalVal}>{euro(q.total)}</Text>
            </View>
            {q.savings > 0 ? (
              <View style={s.savings}>
                <Icon name="tag-heart" size={15} color={colors.success} />
                <Text style={s.savingsTxt}>{t("booking.save_here", { amount: euro(q.savings) })}</Text>
              </View>
            ) : null}
          </Card>
        ) : null}

        {/* Guest details */}
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <Field value={name} onChangeText={setName} placeholder={t("booking.name_placeholder")} icon="account-outline" testID="guest-name" autoCapitalize="words" />
          <Field value={email} onChangeText={setEmail} placeholder={t("booking.email_placeholder")} icon="email-outline" keyboardType="email-address" autoCapitalize="none" testID="guest-email" />
          <Field value={phone} onChangeText={setPhone} placeholder={t("booking.phone_placeholder")} icon="phone-outline" keyboardType="phone-pad" testID="guest-phone" />
          <Field value={message} onChangeText={setMessage} placeholder={t("booking.message_placeholder")} icon="message-text-outline" multiline testID="guest-message" />
        </View>

      </KeyboardAwareScrollView>

      {/* Always-visible total + send */}
      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={{ flex: 1 }}>
          {canQuote && q ? (
            <>
              <Text style={s.footerLabel}>
                {t("booking.total")} · {t(nights === 1 ? "calendar.night_one" : "calendar.night_other", { n: nights })}
              </Text>
              <Text style={s.footerTotal} testID="footer-total">{euro(q.total)}</Text>
            </>
          ) : (
            <Text style={s.footerLabel}>{t("booking.toast_select_dates")}</Text>
          )}
        </View>
        <View style={{ flexShrink: 0, minWidth: 150 }}>
          <Button testID="booking-submit" label={t("booking.submit_short")} icon="send" onPress={submit} loading={submitting} />
        </View>
      </View>
    </View>
  );
}

function QuoteRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={s.quoteRow}>
      <Text style={[s.quoteLabel, highlight && { color: colors.success }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[s.quoteVal, highlight && { color: colors.success }]}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  datesCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  datesLabel: { color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", fontFamily: fonts.body },
  datesValue: { color: c.onSurface, fontSize: 16, fontFamily: fonts.heading, marginTop: 2 },
  datesChange: { color: c.brandPrimary, fontSize: 14, fontWeight: "700", fontFamily: fonts.body },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: c.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: c.divider,
  },
  footerLabel: { color: c.onSurfaceSecondary, fontSize: 13, fontFamily: fonts.body },
  footerTotal: { color: c.brandPrimary, fontSize: 22, fontFamily: fonts.heading },
  discountStatus: { fontSize: 13, fontFamily: fonts.body, fontWeight: "600", marginTop: 6, marginLeft: 4 },
  screen: { flex: 1, backgroundColor: c.surface },
  datesRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  dateBox: { flex: 1 },
  dateLabel: { color: c.muted, fontSize: 11, letterSpacing: 1, fontFamily: fonts.body, textTransform: "uppercase" },
  dateVal: { color: c.onSurface, fontSize: 17, fontFamily: fonts.heading, marginTop: 2 },
  changeDates: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md, alignSelf: "flex-start" },
  changeDatesTxt: { color: c.brandPrimary, fontSize: 13, fontWeight: "600", fontFamily: fonts.body },
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowLabel: { color: c.onSurface, fontSize: 15, fontFamily: fonts.body, fontWeight: "500" },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.surfaceTertiary, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 4 },
  stepBtn: { width: 34, height: 34, borderRadius: radius.pill, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  stepVal: { color: c.onSurface, fontSize: 17, fontFamily: fonts.heading, minWidth: 20, textAlign: "center" },
  divider: { height: 1, backgroundColor: c.divider },
  quoteRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  quoteLabel: { color: c.onSurfaceSecondary, fontSize: 14, fontFamily: fonts.body, flexShrink: 1 },
  quoteVal: { color: c.onSurface, fontSize: 14, fontFamily: fonts.body, fontWeight: "500" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { color: c.onSurface, fontSize: 18, fontFamily: fonts.heading },
  totalVal: { color: c.brandPrimary, fontSize: 24, fontFamily: fonts.heading },
  savings: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surfaceTertiary, padding: spacing.sm, borderRadius: radius.md },
  savingsTxt: { color: c.success, fontSize: 13, fontWeight: "600", fontFamily: fonts.body },
  giftCard: { marginTop: spacing.md, backgroundColor: c.surfaceTertiary, borderColor: c.olive, borderWidth: 1, gap: spacing.sm },
  giftHead: { gap: 6 },
  giftBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: c.olive, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  giftBadgeTxt: { color: c.onOlive, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, fontFamily: fonts.body },
  giftTitle: { color: c.onSurface, fontSize: 17, fontFamily: fonts.heading },
  giftRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  giftItemTitle: { color: c.onSurface, fontSize: 14, fontFamily: fonts.body, fontWeight: "600" },
  giftItemDesc: { color: c.onSurfaceSecondary, fontSize: 13, fontFamily: fonts.body, lineHeight: 18, marginTop: 1 },
}));
