import { useCallback, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { CUSTOMER_NAMES } from "../data/customers";

type Props = {
  value: string;
  onChangeText: (next: string) => void;
  options?: readonly string[];
  placeholder?: string;
  /** Maximum suggestions to render. Keep small for perf — list can be ~1800. */
  maxResults?: number;
  inputStyle?: TextStyle;
  containerStyle?: ViewStyle;
};

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function matches(name: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const lower = name.toLowerCase();
  for (const t of tokens) {
    if (!lower.includes(t)) return false;
  }
  return true;
}

export default function CustomerAutocomplete({
  value,
  onChangeText,
  options = CUSTOMER_NAMES,
  placeholder = "Customer name",
  maxResults = 30,
  inputStyle,
  containerStyle,
}: Props) {
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tokens = useMemo(() => tokenize(value), [value]);
  const suggestions = useMemo(() => {
    if (!focused) return [] as string[];
    if (tokens.length === 0) return options.slice(0, maxResults);
    if (options.length === 1 && options[0] === value) return [];
    const out: string[] = [];
    for (const name of options) {
      if (out.length >= maxResults) break;
      if (matches(name, tokens)) out.push(name);
    }
    return out;
  }, [focused, options, tokens, value, maxResults]);

  const showDropdown = focused && suggestions.length > 0;

  const handleSelect = useCallback(
    (name: string) => {
      if (blurTimer.current) {
        clearTimeout(blurTimer.current);
        blurTimer.current = null;
      }
      onChangeText(name);
      setFocused(false);
    },
    [onChangeText]
  );

  const handleBlur = useCallback(() => {
    blurTimer.current = setTimeout(() => setFocused(false), 200);
  }, []);

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        style={[styles.input, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        autoCorrect={false}
        autoCapitalize="words"
      />
      {showDropdown ? (
        <View style={styles.dropdown}>
          <ScrollView
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            style={styles.dropdownScroll}
          >
            {suggestions.map((name) => (
              <Pressable
                key={name}
                onPressIn={() => handleSelect(name)}
                onPress={() => handleSelect(name)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              >
                <Text style={styles.rowText} numberOfLines={1}>
                  {name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {suggestions.length >= 30 ? (
            <Text style={styles.moreHint}>
              Keep typing to narrow down…
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 50,
  },
  input: {
    fontSize: 14,
    color: "#0f172a",
    paddingVertical: Platform.OS === "ios" ? 5 : 3,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: -10,
    right: -10,
    marginTop: 4,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    maxHeight: 240,
    overflow: "hidden",
    zIndex: 100,
    elevation: 8,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  row: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  rowPressed: {
    backgroundColor: "#f0fdf4",
  },
  rowText: {
    fontSize: 13,
    color: "#0f172a",
  },
  moreHint: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    color: "#64748b",
    backgroundColor: "#f8fafc",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
  },
});
