import { useCallback, useEffect, useState } from "react";
import { storage } from "@/src/utils/storage";

const KEY = "my_question_ids";

// Ids of questions this device sent, so the guest can follow the conversation.
export function useMyQuestions() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    storage.getItem<string[]>(KEY, []).then((v) => setIds(Array.isArray(v) ? v : []));
  }, []);

  const add = useCallback((id: string) => {
    setIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 20);
      storage.setItem(KEY, next);
      return next;
    });
  }, []);

  return { ids, add };
}
