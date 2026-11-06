import { Platform } from "react-native";
import { Asset } from "expo-asset";
import { setDynamicLoadingEnabled, setDynamicLoadingErrorCallback } from "@react-native-vector-icons/common";

// Web: carica il font delle icone via CSS (nessun timeout da 12s che mostrava l'errore rosso).
if (Platform.OS === "web" && typeof document !== "undefined") {
  const uri = Asset.fromModule(require("@react-native-vector-icons/material-design-icons/fonts/MaterialDesignIcons.ttf")).uri;
  const style = document.createElement("style");
  style.textContent = `@font-face{font-family:"MaterialDesignIcons";src:url("${uri}") format("truetype");font-display:block;}`;
  document.head.appendChild(style);
  setDynamicLoadingEnabled(false);
}

// Native: un caricamento lento non deve mostrare errori a schermo.
setDynamicLoadingErrorCallback(() => {});
