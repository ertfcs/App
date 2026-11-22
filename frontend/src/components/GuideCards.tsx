import React from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";

import { Icon, IconName } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { analyzeBeach, type Beach } from "@/src/lib/beaches";
import type { MergedDish } from "@/src/lib/dishes";
import { useFavorites } from "@/src/lib/favorites";

// Food and beach cards with the same look as the attraction cards (PlaceCard).

type Badge = { text: string; kind?: "light" | "star" };
type Row = { icon: string; label: string; value?: React.ReactNode };

function GuideCard(props: {
  testID: string;
  image?: { uri: string } | number;
  credit?: string;
  placeholderIcon?: IconName;
  placeholderEmoji?: string;
  badges: Badge[];
  status?: { text: string; color: string };
  title: string;
  sub?: string;
  desc?: string;
  rows?: Row[];
  extra?: React.ReactNode;
  tip?: { title: string; text: string };
  actions: React.ReactNode;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const rows = (props.rows ?? []).filter((r) => r.value);
  return (
    <View style={s.card} testID={props.testID}>
      <View style={s.photo}>
        {props.image ? (
          <Image source={props.image} style={s.photoImg} contentFit="cover" transition={200} />
        ) : (
          <View style={[s.photoImg, s.noPhoto]}>
            {props.placeholderEmoji ? (
              <Text style={{ fontSize: 48 }}>{props.placeholderEmoji}</Text>
            ) : (
              <Icon name={props.placeholderIcon ?? "image-outline"} size={44} color={colors.muted} />
            )}
          </View>
        )}
        <View style={s.badges}>
          {props.badges.map((b) => (
            <Text key={b.text} style={[s.badge, b.kind === "light" && s.badgeLight, b.kind === "star" && s.badgeStar]}>
              {b.text}
            </Text>
          ))}
        </View>
        {props.credit ? (
          <Text style={s.credit} numberOfLines={1}>
            Foto: {props.credit}
          </Text>
        ) : null}
      </View>
      <View style={s.body}>
        {props.status ? (
          <Text style={[s.status, { color: props.status.color, backgroundColor: props.status.color + "1F" }]}>{props.status.text}</Text>
        ) : null}
        <Text style={s.title}>{props.title}</Text>
        {props.sub ? <Text style={s.sub}>{props.sub}</Text> : null}
        {props.desc ? <Text style={s.desc}>{props.desc}</Text> : null}
        {rows.length ? (
          <View style={s.box}>
            {rows.map((r) => (
              <Text key={r.label} style={s.row}>
                <Text style={s.rowLabel}>
                  {r.icon} {r.label}:{" "}
                </Text>
                {r.value}
              </Text>
            ))}
          </View>
        ) : null}
        {props.extra}
        {props.tip ? (
          <Text style={s.tip}>
            <Text style={s.tipTitle}>💡 {props.tip.title} </Text>
            {props.tip.text}
          </Text>
        ) : null}
        <View style={s.actions}>{props.actions}</View>
      </View>
    </View>
  );
}

// ---------------- food
export function DishCard({ dish, image, credit }: { dish: MergedDish; image?: { uri: string } | number; credit?: string }) {
  const { t } = useTranslation();
  const s = useStyles();
  const { colors } = useTheme();
  const { isFav, toggle } = useFavorites();
  const fav = isFav(dish.id);
  return (
    <GuideCard
      testID={`dish-${dish.id}`}
      image={image}
      credit={credit}
      placeholderEmoji={dish.icon}
      badges={[{ text: dish.region }, { text: `🍽️ ${t("ui.dish.typical")}`, kind: "light" }]}
      title={dish.name}
      desc={dish.description}
      extra={
        dish.ingredients?.length ? (
          <View style={{ gap: 6 }}>
            <Text style={s.rowLabel}>🧺 {t("ui.ex.ingredients")}</Text>
            <View style={s.chips}>
              {dish.ingredients.map((i) => (
                <Text key={i} style={s.chip}>
                  {i}
                </Text>
              ))}
            </View>
          </View>
        ) : null
      }
      tip={dish.funFact ? { title: t("ui.ex.did_you_know"), text: dish.funFact } : undefined}
      actions={
        <Pressable
          testID={`fav-${dish.id}`}
          onPress={() => toggle(dish.id)}
          style={({ pressed }) => [s.mainBtn, fav && s.mainBtnOn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          <Icon name={fav ? "heart" : "heart-outline"} size={18} color={fav ? colors.brandPrimary : "#FFFFFF"} />
          <Text style={[s.mainTxt, fav && { color: colors.brandPrimary }]}>{fav ? t("ui.dish.in_favorites") : t("ui.dish.add_favorite")}</Text>
        </Pressable>
      }
    />
  );
}

// ---------------- beaches
export function BeachCard({
  beach,
  windName,
  image,
  credit,
  extra,
}: {
  beach: Beach;
  windName: string;
  image?: number | { uri: string };
  credit?: string;
  extra?: { desc?: string; howTo?: string; tip?: string; mustSee?: boolean };
}) {
  const { t, i18n } = useTranslation();
  const s = useStyles();
  const { colors } = useTheme();
  const bl = i18n.language === "it" ? beach.it : beach.en;
  const st = windName ? analyzeBeach(beach, windName) : "neutral";
  const status =
    st === "recommended"
      ? { text: t("ui.ex.rec_today"), color: colors.success }
      : st === "avoid"
        ? { text: t("ui.ex.avoid_today"), color: colors.error }
        : { text: t("ui.ex.neutral_today"), color: colors.muted };
  const parking =
    beach.parking_type === "free" ? t("ui.beaches.pk_free") : beach.parking_type === "paid" ? t("ui.beaches.pk_paid") : t("ui.beaches.pk_mixed");
  const services = [
    beach.kids && t("ui.beaches.chip_kids"),
    beach.lidi && t("ui.beaches.chip_lidi"),
    beach.snorkel && t("ui.beaches.chip_snorkel"),
  ].filter(Boolean) as string[];
  const badges: Badge[] = [{ text: beach.location }, { text: `🏖️ ${bl.type}`, kind: "light" }];
  if (extra?.mustSee) badges.push({ text: t("ui.ex.must"), kind: "star" });
  return (
    <GuideCard
      testID={`beach-${beach.id}`}
      image={image}
      credit={credit}
      placeholderIcon="beach"
      badges={badges}
      status={windName ? status : undefined}
      title={beach.name.replace(/\s*\(.*\)$/, "")}
      sub={`${beach.location} (${beach.prov}) · ${beach.time} · ${beach.dist}`}
      desc={extra?.desc ? `${bl.desc} ${extra.desc}` : bl.desc}
      rows={[
        { icon: "🧗", label: t("ui.ex.access"), value: bl.access },
        { icon: "🌊", label: t("ui.ex.seabed"), value: bl.seabed },
        { icon: "👥", label: t("ui.ex.crowd"), value: bl.crowd },
        { icon: "🍹", label: t("ui.ex.food"), value: bl.food },
        { icon: "✅", label: t("ui.beaches.services"), value: services.join(" · ") },
        { icon: "🅿️", label: t("ui.ex.parking"), value: `${parking} — ${bl.parking_info}` },
        { icon: "🚗", label: t("ui.place.how_to"), value: extra?.howTo },
      ]}
      tip={extra?.tip ? { title: t("ui.ex.tip"), text: extra.tip } : bl.tips ? { title: t("ui.place.note"), text: bl.tips } : undefined}
      actions={
        <Pressable
          testID={`beach-dir-${beach.id}`}
          onPress={() =>
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=Trappeto,PA&destination=${beach.lat},${beach.lng}`).catch(() => {})
          }
          style={({ pressed }) => [s.mainBtn, pressed && { opacity: 0.85 }]}
          accessibilityRole="link"
        >
          <Icon name="directions" size={18} color="#FFFFFF" />
          <Text style={s.mainTxt}>{t("ui.beaches.take_me")}</Text>
        </Pressable>
      }
    />
  );
}

const useStyles = makeStyles((c) => ({
  card: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  photo: { width: "100%", aspectRatio: 16 / 9, backgroundColor: c.surfaceTertiary },
  photoImg: { width: "100%", height: "100%" },
  noPhoto: { alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceTertiary },
  badges: { position: "absolute", top: 10, left: 10, right: 10, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: { overflow: "hidden", fontSize: 11, fontWeight: "700", fontFamily: fonts.body, color: "#FFFFFF", backgroundColor: "rgba(28,26,24,0.82)", paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  badgeLight: { backgroundColor: "rgba(255,255,255,0.93)", color: "#2C2A28" },
  badgeStar: { backgroundColor: "#B4613F", marginLeft: "auto" },
  credit: { position: "absolute", right: 6, bottom: 6, maxWidth: "92%", fontSize: 10, color: "#FFFFFF", backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  body: { padding: 14, gap: 8, flexGrow: 1 },
  status: { alignSelf: "flex-start", overflow: "hidden", fontSize: 12, fontWeight: "700", fontFamily: fonts.body, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  title: { color: c.onSurface, fontSize: 18, lineHeight: 22, fontFamily: fonts.heading },
  sub: { color: c.muted, fontSize: 11, fontFamily: fonts.body, marginTop: -5 },
  desc: { color: c.onSurfaceSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.body },
  box: { gap: 5, padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceTertiary },
  row: { color: c.onSurfaceSecondary, fontSize: 13, lineHeight: 18, fontFamily: fonts.body },
  rowLabel: { color: c.onSurface, fontWeight: "700", fontSize: 13, fontFamily: fonts.body },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { overflow: "hidden", color: c.olive, backgroundColor: c.olive + "1F", fontSize: 12, fontWeight: "600", fontFamily: fonts.body, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  tip: { color: c.onSurface, fontSize: 13, lineHeight: 18, fontFamily: fonts.body, backgroundColor: c.terracottaSoft, padding: 10, borderRadius: radius.md, overflow: "hidden" },
  tipTitle: { color: c.brandPrimary, fontWeight: "700" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: "auto", paddingTop: 4 },
  mainBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, borderRadius: radius.md, backgroundColor: c.brandPrimary, borderWidth: 1, borderColor: c.brandPrimary },
  mainBtnOn: { backgroundColor: c.surfaceSecondary },
  mainTxt: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", fontFamily: fonts.body },
}));
