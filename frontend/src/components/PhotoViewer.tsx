import React, { useEffect, useRef, useState } from "react";
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";

import { Icon } from "@/src/components/Icon";
import { fonts, spacing } from "@/src/lib/typography";

type Photo = { id: string; uri: string };

// Full-screen photo viewer: swipe or use the arrows to move, tap X / press Esc to close.
export function PhotoViewer({
  photos,
  index,
  onClose,
}: {
  photos: Photo[];
  index: number | null;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const list = useRef<FlatList<Photo>>(null);
  const [current, setCurrent] = useState(index ?? 0);
  const visible = index !== null && photos.length > 0;

  useEffect(() => {
    if (index !== null) setCurrent(index);
  }, [index]);

  const go = (i: number) => {
    const next = Math.max(0, Math.min(photos.length - 1, i));
    setCurrent(next);
    list.current?.scrollToIndex({ index: next, animated: true });
  };

  useEffect(() => {
    if (!visible || Platform.OS !== "web") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(current + 1);
      else if (e.key === "ArrowLeft") go(current - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={st.backdrop} testID="photo-viewer">
        <FlatList
          ref={list}
          data={photos}
          keyExtractor={(p) => p.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index ?? 0}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
          onScroll={
            Platform.OS === "web"
              ? (e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))
              : undefined
          }
          scrollEventThrottle={64}
          renderItem={({ item }) => (
            <Pressable style={{ width, height, justifyContent: "center" }} onPress={onClose} accessibilityLabel="Chiudi">
              <Image source={{ uri: item.uri }} style={{ width, height: height * 0.86 }} contentFit="contain" transition={150} />
            </Pressable>
          )}
        />

        <Pressable style={st.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Chiudi" testID="photo-viewer-close" hitSlop={12}>
          <Icon name="close" size={26} color="#fff" />
        </Pressable>

        {photos.length > 1 ? (
          <>
            <Text style={st.counter}>
              {current + 1} / {photos.length}
            </Text>
            {current > 0 ? (
              <Pressable style={[st.arrow, { left: spacing.sm }]} onPress={() => go(current - 1)} accessibilityRole="button" accessibilityLabel="Foto precedente" testID="photo-viewer-prev" hitSlop={8}>
                <Icon name="chevron-left" size={32} color="#fff" />
              </Pressable>
            ) : null}
            {current < photos.length - 1 ? (
              <Pressable style={[st.arrow, { right: spacing.sm }]} onPress={() => go(current + 1)} accessibilityRole="button" accessibilityLabel="Foto successiva" testID="photo-viewer-next" hitSlop={8}>
                <Icon name="chevron-right" size={32} color="#fff" />
              </Pressable>
            ) : null}
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(10,9,8,0.96)" },
  close: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  counter: {
    position: "absolute",
    bottom: spacing.xl,
    alignSelf: "center",
    color: "#fff",
    fontFamily: fonts.body,
    fontWeight: "600",
    fontSize: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
});
