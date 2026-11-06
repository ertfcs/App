import React, { useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Linking, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { api } from "@/src/lib/api";

// Nome del Paese nella lingua dell'app (dal codice ISO della bandiera), con fallback al nome salvato.
function countryLabel(name: string, flag: string | undefined, lang: string) {
  try {
    const cps = [...(flag || "")].map((ch) => (ch.codePointAt(0) ?? 0) - 127397);
    if (lang === "it" || cps.length !== 2 || cps.some((n) => n < 65 || n > 90)) return name;
    const code = String.fromCharCode(...cps);
    const DN = (Intl as any).DisplayNames;
    return DN ? new DN([lang], { type: "region" }).of(code) || name : name;
  } catch {
    return name;
  }
}

const BOOKING_BLUE = "#003580";
const STAR = "#FEBB02";

type Review = { id: string; name: string; country?: string; flag?: string; rating: number; text: string };
type Data = { booking_url?: string; score?: number | null; review_count?: number | null; reviews: Review[] };

const Stars = ({ n, size = 16 }: { n: number; size?: number }) => (
  <View style={{ flexDirection: "row", gap: 1 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Icon key={i} name={i <= n ? "star" : i - 0.5 <= n ? "star-half-full" : "star-outline"} size={size} color={STAR} />
    ))}
  </View>
);

export function BookingReviews() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || "it").slice(0, 2);
  const [tr, setTr] = useState<Record<string, { text?: string; loading?: boolean; show?: boolean; error?: boolean }>>({});
  const s = useStyles();
  const { width } = useWindowDimensions();
  const ref = useRef<ScrollView>(null);
  const [idx, setIdx] = useState(0);
  const q = useQuery<Data>({ queryKey: ["booking-reviews"], queryFn: async () => (await api.get("/booking-reviews")).data });

  const d = q.data;
  const reviews = d?.reviews ?? [];
  if (!d || (!reviews.length && !d.booking_url)) return null;

  const cardW = Math.min(width - spacing.md * 2 - 16, 340);
  const step = cardW + spacing.sm;
  const go = (i: number) => {
    const n = Math.max(0, Math.min(reviews.length - 1, i));
    ref.current?.scrollTo({ x: n * step, animated: true });
    setIdx(n);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIdx(Math.round(e.nativeEvent.contentOffset.x / step));
  const toggleTr = async (id: string) => {
    const key = `${id}:${lang}`;
    const cur = tr[key];
    if (cur?.text) return setTr((m) => ({ ...m, [key]: { ...cur, show: !cur.show } }));
    if (cur?.loading) return;
    setTr((m) => ({ ...m, [key]: { loading: true } }));
    try {
      const { data: res } = await api.post(`/booking-reviews/${id}/translate`, { lang });
      setTr((m) => ({ ...m, [key]: { text: res.text, show: true } }));
    } catch {
      setTr((m) => ({ ...m, [key]: { error: true } }));
    }
  };
  const open = () => d.booking_url && Linking.openURL(d.booking_url).catch(() => {});

  return (
    <View style={s.wrap} testID="booking-reviews-section">
      <Text style={s.title}>{t("reviews.title")}</Text>
      <Text style={s.subtitle}>{t("reviews.subtitle")}</Text>

      {d.score != null ? (
        <View style={s.scorePill} testID="booking-reviews-score">
          <Text style={s.score}>{String(d.score).replace(".", ",")}</Text>
          <Stars n={Math.round(d.score) / 2} />
          {d.review_count ? <Text style={s.scoreTxt}>{t("reviews.count", { count: d.review_count })}</Text> : null}
        </View>
      ) : null}

      {reviews.length ? (
        <View>
          <ScrollView
            ref={ref}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={step}
            decelerationRate="fast"
            onMomentumScrollEnd={onScroll}
            onScrollEndDrag={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: 8, alignItems: "flex-start" }}
          >
            {reviews.map((r) => (
              <View key={r.id} style={[s.card, { width: cardW }]} testID={`booking-review-${r.id}`}>
                <View style={s.cardHead}>
                  <View style={s.avatar}><Text style={s.avatarTxt}>{r.name.trim().charAt(0).toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name} numberOfLines={1}>{r.name}</Text>
                    {r.country ? <Text style={s.country}>{r.flag ? `${r.flag} ` : ""}{countryLabel(r.country, r.flag, lang)}</Text> : null}
                  </View>
                  <Stars n={r.rating} size={14} />
                </View>
                {(() => {
                  const st = tr[`${r.id}:${lang}`];
                  return (
                    <>
                      <Text style={s.text} testID={`booking-review-text-${r.id}`}>“{st?.show && st.text ? st.text : r.text}”</Text>
                      <Pressable testID={`booking-review-translate-${r.id}`} onPress={() => toggleTr(r.id)} style={s.trBtn} hitSlop={6}>
                        <Icon name="translate" size={15} color={BOOKING_BLUE} />
                        <Text style={s.trTxt}>
                          {st?.loading ? t("reviews.translating") : st?.error ? t("reviews.translate_error") : st?.show ? t("reviews.original") : t("reviews.translate")}
                        </Text>
                      </Pressable>
                    </>
                  );
                })()}
                <View style={s.divider} />
                <Text style={s.source}>{t("reviews.published")}</Text>
              </View>
            ))}
          </ScrollView>
          {reviews.length > 1 ? (
            <>
              <Pressable testID="booking-reviews-prev" onPress={() => go(idx - 1)} style={[s.arrow, { left: 0 }]} hitSlop={8}>
                <Icon name="chevron-left" size={24} color="#fff" />
              </Pressable>
              <Pressable testID="booking-reviews-next" onPress={() => go(idx + 1)} style={[s.arrow, { right: 0 }]} hitSlop={8}>
                <Icon name="chevron-right" size={24} color="#fff" />
              </Pressable>
              <View style={s.dots}>
                {reviews.map((r, i) => (
                  <Pressable key={r.id} onPress={() => go(i)} style={[s.dot, i === idx && s.dotOn]} testID={`booking-reviews-dot-${i}`} />
                ))}
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {d.booking_url ? (
        <Pressable testID="booking-reviews-cta" onPress={open} style={s.cta}>
          <Icon name="star" size={18} color="#fff" />
          <Text style={s.ctaTxt}>{t("reviews.cta")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { marginTop: spacing.xl, alignItems: "stretch", gap: spacing.md },
  title: { color: c.onSurface, fontSize: 28, fontFamily: fonts.heading, textAlign: "center" },
  subtitle: { color: c.muted, fontSize: 14, fontFamily: fonts.body, textAlign: "center", marginTop: -6 },
  scorePill: { alignSelf: "center", flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  score: { color: BOOKING_BLUE, fontSize: 24, fontWeight: "700", fontFamily: fonts.heading },
  scoreTxt: { color: c.muted, fontSize: 13, fontFamily: fonts.body },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.md, paddingHorizontal: 30, gap: spacing.sm },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: BOOKING_BLUE, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontSize: 18, fontWeight: "700" },
  name: { color: c.onSurface, fontSize: 16, fontFamily: fonts.heading },
  country: { color: c.muted, fontSize: 13, fontFamily: fonts.body },
  text: { color: c.onSurface, fontSize: 15, lineHeight: 22, fontFamily: fonts.body, textAlign: "center" },
  trBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, alignSelf: "center", paddingVertical: 4 },
  trTxt: { color: BOOKING_BLUE, fontSize: 13, fontWeight: "600", fontFamily: fonts.body },
  divider: { height: 1, backgroundColor: c.border },
  source: { color: c.muted, fontSize: 12, fontFamily: fonts.body, textAlign: "center" },
  arrow: { position: "absolute", top: 90, width: 36, height: 36, borderRadius: 18, backgroundColor: BOOKING_BLUE, alignItems: "center", justifyContent: "center", opacity: 0.92 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.border },
  dotOn: { width: 24, backgroundColor: BOOKING_BLUE },
  cta: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: BOOKING_BLUE, paddingVertical: 14, paddingHorizontal: 22, borderRadius: radius.md },
  ctaTxt: { color: "#fff", fontSize: 15, fontWeight: "600", fontFamily: fonts.body },
}));
