import React from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "./Icon";
import { useToast } from "./ui";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { useItineraries } from "@/src/lib/queries";
import { API_BASE } from "@/src/lib/api";
import i18n from "@/src/i18n";

// Public library of ready-made itineraries curated by Matteo (PDF downloads).
export function SuggestedItineraries({ code }: { code: string }) {
  const { t } = useTranslation();
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const list = useItineraries(i18n.language);
  const items = list.data ?? [];
  if (items.length === 0) return null;

  const download = (it: any) => {
    if (!it.has_pdf) return;
    if (it.visibility !== "public" && !code) return toast.show(t("guest.code_required"), "error");
    const q = code ? `?code=${encodeURIComponent(code)}` : "";
    Linking.openURL(`${API_BASE}/itineraries/${it.slug}/pdf${q}`).catch(() => {});
  };

  return (
    <View style={{ gap: spacing.sm }} testID="suggested-itineraries">
      <Text style={s.title}>{t("guest.suggested_title")}</Text>
      {items.map((it: any) => (
        <Pressable key={it.id} testID={`sugg-${it.slug}`} style={s.card} onPress={() => download(it)}>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{it.title}</Text>
            <Text style={s.meta}>{t("guest.days", { count: it.days })}{it.theme ? ` · ${it.theme}` : ""}</Text>
            {it.preview_text ? <Text style={s.preview} numberOfLines={3}>{it.preview_text}</Text> : null}
          </View>
          {it.has_pdf ? (
            <Icon name={it.visibility === "public" || code ? "file-pdf-box" : "lock-outline"} size={24} color={colors.brandPrimary} />
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  title: { color: c.onSurface, fontSize: 17, fontFamily: fonts.heading, marginTop: spacing.sm },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: c.border },
  name: { color: c.onSurface, fontSize: 15, fontFamily: fonts.heading },
  meta: { color: c.muted, fontSize: 12, fontFamily: fonts.body, marginTop: 2 },
  preview: { color: c.onSurfaceSecondary, fontSize: 13, fontFamily: fonts.body, lineHeight: 19, marginTop: 4 },
}));
