import React from "react";
import { View, Text } from "react-native";
import { makeStyles } from "@/src/theme";
import { fonts, spacing } from "@/src/lib/typography";

const pretty = (k: string) => k.replace(/_/g, " ").replace(/^\w/, (m) => m.toUpperCase());

// Readable rendering of any AI JSON result (nested objects/arrays → headings and bullets).
export function JsonView({ data, depth = 0 }: { data: any; depth?: number }) {
  const s = useStyles();
  if (data == null || data === "") return null;
  if (typeof data !== "object") return <Text selectable style={s.txt}>{String(data)}</Text>;
  if (Array.isArray(data)) {
    return (
      <View style={{ gap: 6 }}>
        {data.map((it, i) =>
          typeof it === "object" ? (
            <View key={i} style={s.item}><JsonView data={it} depth={depth + 1} /></View>
          ) : (
            <Text key={i} selectable style={s.txt}>• {String(it)}</Text>
          ),
        )}
      </View>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      {Object.entries(data).map(([k, v]) => (
        <View key={k} style={{ gap: 2 }}>
          <Text style={depth === 0 ? s.h : s.k}>{pretty(k)}</Text>
          <JsonView data={v} depth={depth + 1} />
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  h: { color: c.brandPrimary, fontSize: 14, fontFamily: fonts.heading, marginTop: spacing.xs },
  k: { color: c.muted, fontSize: 11, fontFamily: fonts.body, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  txt: { color: c.onSurface, fontSize: 14, lineHeight: 20, fontFamily: fonts.body },
  item: { borderLeftWidth: 2, borderLeftColor: c.border, paddingLeft: spacing.sm },
}));
