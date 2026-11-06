import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Modal, TextInput, FlatList } from "react-native";

import { Icon } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts, radius, spacing } from "@/src/lib/typography";
import { Country, searchCountries } from "@/src/lib/countries";

export function CountryPicker({ value, flag, onSelect, testID }: { value: string; flag: string; onSelect: (c: Country) => void; testID: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const list = useMemo(() => searchCountries(q), [q]);

  return (
    <>
      <Pressable testID={testID} onPress={() => setOpen(true)} style={s.field}>
        {value ? <Text style={s.flag}>{flag}</Text> : <Icon name="earth" size={18} color={colors.muted} />}
        <Text style={[s.value, !value && { color: colors.muted }]}>{value || "Scegli il Paese"}</Text>
        <Icon name="chevron-down" size={20} color={colors.muted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.searchRow}>
              <Icon name="magnify" size={20} color={colors.muted} />
              <TextInput
                testID={`${testID}-search`}
                value={q}
                onChangeText={setQ}
                placeholder="Cerca Paese..."
                placeholderTextColor={colors.muted}
                style={s.search}
                autoFocus
              />
              <Pressable testID={`${testID}-close`} onPress={() => setOpen(false)} hitSlop={8}>
                <Icon name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>
            <FlatList
              data={list}
              keyExtractor={(c) => c.code}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={s.empty}>Nessun Paese trovato</Text>}
              renderItem={({ item }) => (
                <Pressable
                  testID={`${testID}-opt-${item.code}`}
                  style={s.opt}
                  onPress={() => {
                    onSelect(item);
                    setQ("");
                    setOpen(false);
                  }}
                >
                  <Text style={s.flag}>{item.flag}</Text>
                  <Text style={[s.value, item.name === value && { color: colors.brandPrimary, fontWeight: "700" }]}>{item.name}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  field: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 50, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  flag: { fontSize: 20 },
  value: { flex: 1, color: c.onSurface, fontSize: 15, fontFamily: fonts.body },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.md },
  sheet: { maxHeight: "80%", backgroundColor: c.surface, borderRadius: radius.lg, overflow: "hidden" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: c.border },
  search: { flex: 1, height: 52, color: c.onSurface, fontSize: 16, fontFamily: fonts.body },
  opt: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: c.border },
  empty: { padding: spacing.lg, textAlign: "center", color: c.muted, fontFamily: fonts.body },
}));
