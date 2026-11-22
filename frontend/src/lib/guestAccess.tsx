import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { storage } from "@/src/utils/storage";
import { api } from "@/src/lib/api";

// One booking code unlocks every guest section (places, beaches, food, festivals, itinerary PDF).
const KEY = "guest_code";

type AccessCtx = {
  code: string;
  unlocked: boolean;
  /** Checks the code with the server; on success it is remembered on this device. Throws with the server message. */
  unlock: (code: string) => Promise<void>;
  lock: () => void;
};
const Ctx = createContext<AccessCtx>({ code: "", unlocked: false, unlock: async () => {}, lock: () => {} });

export function GuestAccessProvider({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState("");

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<string>(KEY, "");
      if (!saved) return;
      try {
        await api.post("/verify-code", { code: saved });
        setCode(saved);
      } catch {
        storage.setItem(KEY, "");
      }
    })();
  }, []);

  const unlock = useCallback(async (raw: string) => {
    const c = raw.trim().toUpperCase();
    await api.post("/verify-code", { code: c });
    setCode(c);
    storage.setItem(KEY, c);
  }, []);

  const lock = useCallback(() => {
    setCode("");
    storage.setItem(KEY, "");
  }, []);

  return <Ctx.Provider value={{ code, unlocked: !!code, unlock, lock }}>{children}</Ctx.Provider>;
}

export const useGuestAccess = () => useContext(Ctx);
