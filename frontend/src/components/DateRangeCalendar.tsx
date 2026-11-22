import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { Icon } from "@/src/components/Icon";
import { useToast } from "@/src/components/ui";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { festivalDateSet } from "@/src/lib/festivals";
import { localizeFestival } from "@/src/lib/festivalsI18n";
import { toISODate } from "@/src/lib/format";

export type DateRange = { start: string | null; end: string | null };

function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last) {
    out.push(toISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

// Tap the arrival day, then the departure day. Booked days can't be chosen or crossed.
// Festival days are selectable like any other day; their festivals are listed below.
export function DateRangeCalendar({
  blocked,
  value,
  onChange,
  testID = "availability-calendar",
}: {
  blocked: Set<string>;
  value: DateRange;
  onChange: (r: DateRange) => void;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const festMap = useMemo(() => festivalDateSet(), []);
  const [lastDay, setLastDay] = useState<string | null>(null);

  const marked = useMemo(() => {
    const marks: Record<string, any> = {};
    Object.keys(festMap).forEach((iso) => {
      marks[iso] = { marked: true, dotColor: colors.olive };
    });
    for (const d of blocked) {
      marks[d] = { disabled: true, marked: true, dotColor: colors.error };
    }
    const sel = value.start && value.end ? daysBetween(value.start, value.end) : value.start ? [value.start] : [];
    sel.forEach((iso, i) => {
      marks[iso] = {
        ...(marks[iso] || {}),
        color: colors.brandPrimary,
        textColor: colors.onBrandPrimary,
        startingDay: i === 0,
        endingDay: i === sel.length - 1,
      };
    });
    return marks;
  }, [blocked, value, festMap, colors]);

  const onDayPress = (day: { dateString: string }) => {
    const d = day.dateString;
    setLastDay(d);
    const { start, end } = value;
    const pickingCheckout = !!start && !end && d > start;
    // A booked day can still be the departure day (the next guest arrives that day).
    if (blocked.has(d) && !pickingCheckout) {
      toast.show(t("booking.toast_date_blocked"), "error");
      return;
    }
    if (!pickingCheckout) {
      onChange({ start: d, end: null });
      return;
    }
    // Check-out day itself may be the next guest's check-in, so only the nights in between must be free.
    const nights = daysBetween(start, d).slice(0, -1);
    if (nights.some((n) => blocked.has(n))) {
      toast.show(t("booking.toast_range_blocked"), "error");
      onChange(blocked.has(d) ? { start: null, end: null } : { start: d, end: null });
      return;
    }
    onChange({ start, end: d });
  };

  const fests = lastDay ? festMap[lastDay] ?? [] : [];

  return (
    <View>
      <Calendar
        testID={testID}
        markingType="period"
        markedDates={marked}
        onDayPress={onDayPress}
        minDate={toISODate(new Date())}
        firstDay={1}
        theme={{
          calendarBackground: colors.surfaceSecondary,
          monthTextColor: colors.onSurface,
          textMonthFontFamily: fonts.heading,
          textMonthFontSize: 18,
          dayTextColor: colors.onSurface,
          textDisabledColor: colors.border,
          todayTextColor: colors.brandPrimary,
          arrowColor: colors.brandPrimary,
          textDayFontFamily: fonts.body,
          textDayHeaderFontFamily: fonts.body,
        }}
      />
      <View style={s.legend}>
        <Legend color={colors.brandPrimary} label={t("calendar.selected")} />
        <Legend color={colors.error} label={t("calendar.booked")} />
        <Legend color={colors.olive} label={t("calendar.festivals")} />
      </View>
      {fests.length > 0 ? (
        <Pressable testID="calendar-fest-note" style={s.festNote} onPress={() => router.push("/festivals")}>
          <Text style={s.festTitle}>{t("calendar.festivals_that_day")}</Text>
          {fests.slice(0, 3).map((f) => (
            <Text key={f.id} style={s.festItem} numberOfLines={1}>
              {f.icon} {localizeFestival(f, i18n.language).name}
            </Text>
          ))}
        </Pressable>
      ) : null}
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const s = useStyles();
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <Text style={s.legendTxt}>{label}</Text>
    </View>
  );
}

// "Tap arrival" / "Now tap departure" / "12 → 15 Jun · 3 nights" line under a calendar.
export function RangeHint({ value, onClear }: { value: DateRange; onClear: () => void }) {
  const { t } = useTranslation();
  const s = useStyles();
  const { colors } = useTheme();
  const nights = value.start && value.end ? daysBetween(value.start, value.end).length - 1 : 0;
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return (
    <View style={s.hint} testID="range-hint">
      <Icon name={nights > 0 ? "calendar-check" : "gesture-tap"} size={18} color={colors.brandPrimary} />
      <Text style={s.hintTxt}>
        {!value.start
          ? t("calendar.pick_checkin")
          : !value.end
            ? `${fmt(value.start)} → ${t("calendar.pick_checkout")}`
            : `${fmt(value.start)} → ${fmt(value.end)} · ${t(nights === 1 ? "calendar.night_one" : "calendar.night_other", { n: nights })}`}
      </Text>
      {value.start ? (
        <Pressable onPress={onClear} hitSlop={8} testID="range-clear" accessibilityRole="button" accessibilityLabel={t("calendar.clear")}>
          <Text style={s.clear}>{t("calendar.clear")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: c.onSurfaceSecondary, fontSize: 12, fontFamily: fonts.body },
  festNote: { marginTop: spacing.sm, marginHorizontal: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: c.surfaceTertiary, gap: 2 },
  festTitle: { color: c.olive, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, fontFamily: fonts.body, textTransform: "uppercase" },
  festItem: { color: c.onSurface, fontSize: 14, fontFamily: fonts.body },
  hint: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  hintTxt: { flex: 1, color: c.onSurface, fontSize: 15, fontFamily: fonts.body, fontWeight: "600" },
  clear: { color: c.brandPrimary, fontSize: 13, fontFamily: fonts.body, fontWeight: "600", textDecorationLine: "underline" },
}));
