import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { Field, Button, useToast } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { useGuestAccess } from "@/src/lib/guestAccess";

/** Code box shown under the free examples of a guest section (or on its own with `compact`). */
export function LockedSection({ title, text, compact }: { title: string; text: string; compact?: boolean }) {
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

/** Small green line shown once the sections are unlocked. */
export function UnlockedNote() {
  const { t } = useTranslation();
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={s.okRow}>
      <Icon name="lock-open-variant" size={16} color={colors.success} />
      <Text style={[s.okTxt, { color: colors.success }]}>{t("lock.unlocked_note")}</Text>
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
  head: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", marginBottom: 4 },
  lockIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.terracottaSoft, alignItems: "center", justifyContent: "center" },
  title: { color: c.onSurface, fontSize: 18, fontFamily: fonts.heading },
  text: { color: c.onSurfaceSecondary, fontSize: 13, lineHeight: 19, fontFamily: fonts.body, marginTop: 2 },
  bookLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, paddingVertical: 6 },
  bookTxt: { color: c.brandPrimary, fontSize: 14, fontWeight: "600", fontFamily: fonts.body },
  okRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  okTxt: { fontSize: 13, fontWeight: "600", fontFamily: fonts.body },
}));
