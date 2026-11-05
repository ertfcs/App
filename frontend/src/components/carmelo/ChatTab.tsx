import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, { FadeInUp } from "react-native-reanimated";

import { Icon, IconName } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { api, streamCarmelo } from "@/src/lib/api";
import { MarkdownText } from "@/src/components/MarkdownText";

type Msg = { id: string; role: "user" | "assistant"; content: string };

// Multi-turn chat with Carmelo (admin only). History is persisted per session.
export function ChatTab({ sessionId, model }: { sessionId: string; model: string }) {
  const { t } = useTranslation();
  const s = useStyles();
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get(`/carmelo/messages/${sessionId}`)
      .then((r) => setMessages((r.data as any[]).map((m) => ({ id: m.id, role: m.role, content: m.content }))))
      .catch(() => setMessages([]));
  }, [sessionId]);

  const suggestions: { label: string; icon: IconName; prompt: string }[] = [
    { label: t("ai_itinerary.style_relax"), icon: "umbrella-beach", prompt: "Consigliami un itinerario di 3 giorni rilassante tra mare e spiagge vicino Trappeto." },
    { label: t("ai_itinerary.style_food"), icon: "silverware-fork-knife", prompt: "Dove posso mangiare piatti tipici siciliani vicino Trappeto? Consigliami un tour gastronomico." },
    { label: t("ai_itinerary.style_culture"), icon: "bank", prompt: "Crea un itinerario culturale di 2 giorni tra Palermo e Trapani con arte e storia." },
    { label: t("ai_itinerary.style_adventure"), icon: "hiking", prompt: "Suggerisci escursioni nella natura e panorami da non perdere in Sicilia occidentale." },
  ];

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const aiId = `a${Date.now()}`;
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: "user", content: trimmed }, { id: aiId, role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      await streamCarmelo("/carmelo/chat", { session_id: sessionId, message: trimmed, model }, (_c, full) => {
        setMessages((m) => m.map((msg) => (msg.id === aiId ? { ...msg, content: full } : msg)));
      });
    } catch (e: any) {
      setMessages((m) => m.map((msg) => (msg.id === aiId ? { ...msg, content: e?.message || t("ai_itinerary.default_error") } : msg)));
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} testID="carmelo-scroll" contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {messages.length === 0 ? (
          <View style={s.intro}>
            <View style={s.avatar}><Icon name="robot-happy" size={34} color={colors.onBrandPrimary} /></View>
            <Text style={s.introTitle}>Ciao Matteo, sono Carmelo</Text>
            <Text style={s.introDesc}>Chiedimi consigli per i tuoi ospiti, itinerari, ristoranti o eventi. Le risposte restano salvate in questa conversazione.</Text>
            <View style={s.suggestions}>
              {suggestions.map((sg) => (
                <Pressable key={sg.label} testID={`suggest-${sg.icon}`} style={s.suggestChip} onPress={() => send(sg.prompt)}>
                  <Icon name={sg.icon} size={16} color={colors.brandPrimary} />
                  <Text style={s.suggestTxt}>{sg.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          messages.map((m) => (
            <Animated.View key={m.id} entering={FadeInUp.duration(200)} style={[s.bubbleRow, { justifyContent: m.role === "user" ? "flex-end" : "flex-start" }]}>
              <View style={[s.bubble, m.role === "user" ? s.userBubble : s.aiBubble]}>
                {m.content === "" && busy ? (
                  <ActivityIndicator color={colors.brandPrimary} size="small" />
                ) : m.role === "assistant" ? (
                  <MarkdownText text={m.content} />
                ) : (
                  <Text selectable style={[s.bubbleTxt, { color: colors.onBrandPrimary }]}>{m.content}</Text>
                )}
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
      <View style={s.inputBar}>
        <TextInput
          testID="carmelo-input"
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder={t("ai_itinerary.interests_placeholder")}
          placeholderTextColor={colors.muted}
          multiline
        />
        <Pressable testID="carmelo-send" style={[s.sendBtn, (!input.trim() || busy) && { opacity: 0.4 }]} disabled={!input.trim() || busy} onPress={() => send(input)}>
          <Icon name="send" size={20} color={colors.onBrandPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  scroll: { padding: spacing.md, paddingBottom: spacing.lg, gap: spacing.md, flexGrow: 1 },
  intro: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xl, gap: spacing.sm },
  avatar: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  introTitle: { color: c.onSurface, fontSize: 24, fontFamily: fonts.heading, textAlign: "center", marginTop: spacing.sm, lineHeight: 28 },
  introDesc: { color: c.muted, fontSize: 14, textAlign: "center", fontFamily: fonts.body, lineHeight: 21 },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center", marginTop: spacing.md },
  suggestChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.pill },
  suggestTxt: { color: c.onSurface, fontSize: 13, fontWeight: "600", fontFamily: fonts.body },
  bubbleRow: { flexDirection: "row", maxWidth: "100%" },
  bubble: { maxWidth: "86%", padding: spacing.md, borderRadius: radius.lg },
  userBubble: { backgroundColor: c.brandPrimary, borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderBottomLeftRadius: 4 },
  bubbleTxt: { fontSize: 15, lineHeight: 22, fontFamily: fonts.body },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, padding: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: c.surfaceSecondary, borderTopWidth: 1, borderTopColor: c.divider },
  input: { flex: 1, maxHeight: 120, minHeight: 44, backgroundColor: c.surfaceTertiary, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 12, color: c.onSurface, fontSize: 15, fontFamily: fonts.body },
  sendBtn: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
}));
