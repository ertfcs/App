import { Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api } from "./api";

// Opens the photo library and returns a base64 data URL (or null if cancelled/denied).
export async function pickImageDataUrl(): Promise<{ dataUrl: string; filename: string } | null> {
  const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (perm.status !== "granted") {
    if (!perm.canAskAgain) {
      Linking.openSettings();
      throw new Error("Consenti l'accesso alle foto dalle Impostazioni");
    }
    const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (req.status !== "granted") throw new Error("Permesso foto negato");
  }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, base64: true });
  if (res.canceled || !res.assets?.[0]?.base64) return null;
  const a = res.assets[0];
  return { dataUrl: `data:${a.mimeType || "image/jpeg"};base64,${a.base64}`, filename: a.fileName || "foto.jpg" };
}

// Picks an image and uploads it to object storage; returns the stored URL path.
export async function pickAndUploadImage(): Promise<string | null> {
  const picked = await pickImageDataUrl();
  if (!picked) return null;
  const res = await api.post("/admin/uploads", { data_url: picked.dataUrl, filename: picked.filename });
  return res.data.url as string;
}
