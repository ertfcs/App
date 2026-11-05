import { Alert, Platform } from "react-native";

// Cross-platform yes/no confirmation before destructive actions.
export function confirmAction(message: string): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(typeof window !== "undefined" && window.confirm(message));
  return new Promise((resolve) =>
    Alert.alert("Conferma", message, [
      { text: "Annulla", style: "cancel", onPress: () => resolve(false) },
      { text: "Elimina", style: "destructive", onPress: () => resolve(true) },
    ]),
  );
}
