import React, { useState } from "react";
import { View, Pressable, ScrollView, Text, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";

import { Header } from "@/src/components/Header";
import { Loading } from "@/src/components/ui";
import { PhotoViewer } from "@/src/components/PhotoViewer";
import { makeStyles } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { useAllPhotos } from "@/src/lib/queries";

// Every photo: the house first, then the gallery. Tap one to open it full screen.
export default function PhotosScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { width } = useWindowDimensions();
  const photos = useAllPhotos();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const cols = width >= 760 ? 3 : 2;

  return (
    <View style={s.screen}>
      <Header title={t("home_new.photos_title")} kicker={t("home_new.photos_kicker", { count: photos.data.length })} showBack />
      {photos.isLoading ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.grid}>
            {photos.data.map((p, i) => (
              <Pressable
                key={p.id}
                testID={`all-photo-${i}`}
                onPress={() => setViewerIndex(i)}
                accessibilityRole="imagebutton"
                style={[s.cell, { flexBasis: cols === 3 ? "31%" : "47%" }, i === 0 && s.first]}
              >
                <Image source={{ uri: p.data_url }} style={s.img} contentFit="cover" transition={200} />
              </Pressable>
            ))}
          </View>
          {photos.data.length === 0 ? <Text style={s.empty}>—</Text> : null}
        </ScrollView>
      )}
      <PhotoViewer photos={photos.data.map((p) => ({ id: p.id, uri: p.data_url }))} index={viewerIndex} onClose={() => setViewerIndex(null)} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  cell: { flexGrow: 1, aspectRatio: 4 / 3, borderRadius: radius.md, overflow: "hidden", backgroundColor: c.surfaceTertiary },
  first: { flexBasis: "100%" },
  img: { width: "100%", height: "100%" },
  empty: { color: c.muted, fontFamily: fonts.body, textAlign: "center", marginTop: spacing.xl },
}));
