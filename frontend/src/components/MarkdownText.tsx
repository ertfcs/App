import React from "react";
import { Text, View } from "react-native";
import { makeStyles } from "@/src/theme";
import { fonts } from "@/src/lib/typography";

// Inline **bold** / *italic* segments of one line.
function Inline({ text, style }: { text: string; style: any }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).filter(Boolean);
  return (
    <Text selectable style={style}>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <Text key={i} style={{ fontWeight: "700" }}>{p.slice(2, -2)}</Text>
        ) : p.startsWith("*") && p.endsWith("*") && p.length > 2 ? (
          <Text key={i} style={{ fontStyle: "italic" }}>{p.slice(1, -1)}</Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

// Lightweight markdown renderer for AI answers (headings, bullets, bold, italic).
export function MarkdownText({ text, color }: { text: string; color?: string }) {
  const s = useStyles();
  const base = [s.p, color ? { color } : null];
  return (
    <View style={{ gap: 4 }}>
      {text.split("\n").map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <View key={i} style={{ height: 4 }} />;
        const h = line.match(/^#{1,4}\s+(.*)/);
        if (h) return <Inline key={i} text={h[1]} style={[s.h, color ? { color } : null]} />;
        if (/^\s*([-*•]|\d+\.)\s+/.test(line)) {
          const m = line.match(/^\s*([-*•]|\d+\.)\s+(.*)/)!;
          return <Inline key={i} text={`${/\d/.test(m[1]) ? m[1] : "•"} ${m[2]}`} style={[base, { paddingLeft: 8 }]} />;
        }
        if (/^-{3,}$/.test(line.trim())) return <View key={i} style={s.hr} />;
        return <Inline key={i} text={line} style={base} />;
      })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  p: { color: c.onSurface, fontSize: 15, lineHeight: 22, fontFamily: fonts.body },
  h: { color: c.onSurface, fontSize: 16, lineHeight: 22, fontFamily: fonts.heading, marginTop: 4 },
  hr: { height: 1, backgroundColor: c.divider, marginVertical: 4 },
}));
