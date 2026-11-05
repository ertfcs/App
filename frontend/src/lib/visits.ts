import { useEffect } from "react";
import { Platform } from "react-native";
import { storage } from "@/src/utils/storage";
import { api } from "./api";

const KEY = "visit_session_id";

// Records one anonymous visit per session/day for the admin statistics.
export function useTrackVisit() {
  useEffect(() => {
    (async () => {
      try {
        let sid = await storage.getItem<string>(KEY, "");
        if (!sid) {
          sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
          storage.setItem(KEY, sid);
        }
        const isWeb = Platform.OS === "web" && typeof window !== "undefined";
        const path = isWeb ? window.location.pathname : "/app";
        if (path.startsWith("/admin")) return;
        await api.post("/track/visit", {
          session_id: sid,
          path,
          referrer: isWeb ? document.referrer || null : Platform.OS,
        });
      } catch {
        // stats are best-effort
      }
    })();
  }, []);
}
