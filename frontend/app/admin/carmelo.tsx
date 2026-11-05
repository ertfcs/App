import React, { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { Header } from "@/src/components/Header";
import { ChipRow, Loading, useToast } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { ChatTab } from "@/src/components/carmelo/ChatTab";
import { ItineraryTab } from "@/src/components/carmelo/ItineraryTab";
import { AdaptTab } from "@/src/components/carmelo/AdaptTab";
import { makeStyles, useTheme } from "@/src/theme";
import { radius } from "@/src/lib/typography";
import { useAuth } from "@/src/lib/auth";
import { api } from "@/src/lib/api";
import { storage } from "@/src/utils/storage";

const SESSION_KEY = "carmelo_admin_session";
const newSession = () => `admin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export default function AdminCarmelo() {
  const s = useStyles();
  const { colors } = useTheme();
  const { token, loading } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("chat");
  const [model, setModel] = useState("claude");
  const [session, setSession] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !token) router.replace("/admin/login");
  }, [loading, token]);

  useEffect(() => {
    storage.getItem<string>(SESSION_KEY, "").then((v) => {
      const id = v || newSession();
      if (!v) storage.setItem(SESSION_KEY, id);
      setSession(id);
    });
  }, []);

  const models = useQuery({
    queryKey: ["carmelo-models"],
    enabled: !!token,
    queryFn: async () => (await api.get("/carmelo/models")).data.models as { key: string; label: string }[],
  });

  const resetChat = async () => {
    if (session) await api.delete(`/carmelo/messages/${session}`).catch(() => {});
    const id = newSession();
    storage.setItem(SESSION_KEY, id);
    setSession(id);
    toast.show("Nuova conversazione", "success");
  };

  if (loading || !token || !session) return <Loading />;

  return (
    <View style={s.screen}>
      <Header
        title="Carmelo IA"
        kicker="Admin"
        showBack
        showLang={false}
        right={
          <Pressable testID="carmelo-reset" onPress={resetChat} hitSlop={6} style={s.reset}>
            <Icon name="broom" size={20} color={colors.brandPrimary} />
          </Pressable>
        }
      />
      <ChipRow
        items={[
          { key: "chat", label: "Chat", icon: "chat-outline" },
          { key: "itinerary", label: "Itinerario", icon: "map-marker-path" },
          { key: "adapt", label: "Adatta file", icon: "file-document-edit-outline" },
        ]}
        selected={tab}
        onSelect={setTab}
      />
      <ChipRow items={(models.data ?? []).map((m) => ({ key: m.key, label: m.label, icon: "chip" as const }))} selected={model} onSelect={setModel} />
      {tab === "chat" ? <ChatTab key={session} sessionId={session} model={model} /> : null}
      {tab === "itinerary" ? <ItineraryTab sessionId={session} model={model} /> : null}
      {tab === "adapt" ? <AdaptTab sessionId={session} model={model} /> : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  reset: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
}));
