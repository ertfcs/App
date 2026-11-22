import React, { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { Field, Button, useToast } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { useGuestAccess } from "@/src/lib/guestAccess";

/** Code box shown under the free examples of a guest section (or on its own with `compact`). */
export function LockedSection({ title, text, compact, names }: { title: string; text: string; compact?: boolean; names?: string[] }) {
  const { t } = useTranslation();
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const { unlock } = useGuestAccess();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!code.trim()) return toast.show(t("guest.enter_code"), "error");
    setBusy(true);
    try {
      await unlock(code);
      toast.show(t("lock.unlocked_all"), "success");
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || t("guest.invalid_code"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[s.box, compact && s.compact]} testID="locked-section">
      {names?.length ? (
        <View style={s.ghost} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {names.map((n) => (
            <View key={n} style={s.ghostRow}>
              <View style={s.ghostThumb} />
              <Text style={[s.ghostTxt, BLUR]} numberOfLines={1}>
                {n}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={s.head}>
        <View style={s.lockIcon}>
          <Icon name="lock-outline" size={22} color={colors.brandPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.text}>{text}</Text>
        </View>
      </View>
      <Field value={code} onChangeText={setCode} placeholder={t("guest.code_ph")} icon="key-variant" autoCapitalize="characters" testID="lock-code" />
      <Button testID="lock-unlock" label={t("lock.unlock")} icon="lock-open-variant" onPress={submit} loading={busy} />
      <Pressable testID="lock-book" onPress={() => router.push("/booking")} style={s.bookLink} accessibilityRole="link">
        <Text style={s.bookTxt}>{t("lock.no_code")}</Text>
        <Icon name="chevron-right" size={18} color={colors.brandPrimary} />
      </Pressable>
    </View>
  );
}

// Blurred names on web; dimmed elsewhere (native has no CSS blur).
const BLUR: any = Platform.OS === "web" ? { filter: "blur(4px)", userSelect: "none" } : { opacity: 0.25 };

/** Small green line shown once the sections are unlocked. */
export function UnlockedNote() {
  const { t } = useTranslation();
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const { lock } = useGuestAccess();
  return (
    <View style={s.okRow}>
      <Icon name="lock-open-variant" size={16} color={colors.success} />
      <Text style={[s.okTxt, { color: colors.success, flex: 1 }]}>{t("lock.unlocked_note")}</Text>
      <Pressable
        testID="lock-logout"
        onPress={() => {
          lock();
          toast.show(t("lock.logged_out"), "success");
        }}
        hitSlop={8}
        accessibilityRole="button"
        style={s.logoutBtn}
      >
        <Icon name="logout" size={14} color={colors.muted} />
        <Text style={s.logoutTxt}>{t("lock.logout")}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  box: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
  },
  compact: { marginHorizontal: 0, marginTop: 0 },
  ghost: { gap: 8, marginBottom: spacing.sm },
  ghostRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: radius.md, backgroundColor: c.surfaceTertiary, opacity: 0.85 },
  ghostThumb: { width: 36, height: 36, borderRadius: 8, backgroundColor: c.border },
  ghostTxt: { flex: 1, color: c.onSurface, fontSize: 14, fontWeight: "600", fontFamily: fonts.body },
  head: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", marginBottom: 4 },
  lockIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.terracottaSoft, alignItems: "center", justifyContent: "center" },
  title: { color: c.onSurface, fontSize: 18, fontFamily: fonts.heading },
  text: { color: c.onSurfaceSecondary, fontSize: 13, lineHeight: 19, fontFamily: fonts.body, marginTop: 2 },
  bookLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, paddingVertical: 6 },
  bookTxt: { color: c.brandPrimary, fontSize: 14, fontWeight: "600", fontFamily: fonts.body },
  okRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: c.border },
  logoutTxt: { color: c.muted, fontSize: 12, fontWeight: "600", fontFamily: fonts.body },
  okTxt: { fontSize: 13, fontWeight: "600", fontFamily: fonts.body },
}));
