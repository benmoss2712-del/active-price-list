import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  ACTIVE_PRICES,
  PRICE_LIST_VERSION,
  PriceItem,
  categoriesFrom,
  filterPrices,
  formatMoney,
} from "./src/data/prices";

export default function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const cats = useMemo(() => categoriesFrom(ACTIVE_PRICES), []);
  const rows = useMemo(
    () => filterPrices(ACTIVE_PRICES, query, category),
    [query, category]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Hook: replace with fetch('/api/prices') then set state
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const lastUpdated = useMemo(() => {
    try {
      return new Date(PRICE_LIST_VERSION).toLocaleString();
    } catch {
      return PRICE_LIST_VERSION;
    }
  }, []);

  const insetTop =
    Platform.OS === "ios" ? 52 : (RNStatusBar.currentHeight ?? 0) + 8;

  return (
    <View style={[styles.safe, { paddingTop: insetTop }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
          <Text style={styles.title}>Active price list</Text>
          <Text style={styles.subtitle}>Updated {lastUpdated}</Text>
        </View>

        <View style={styles.toolbar}>
          <TextInput
            style={styles.search}
            placeholder="Search name, SKU, category…"
            placeholderTextColor="#8b9aaf"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        <View style={styles.chips}>
          <Chip
            label="All"
            active={category === null}
            onPress={() => setCategory(null)}
          />
          {cats.map((c) => (
            <Chip
              key={c}
              label={c}
              active={category === c}
              onPress={() => setCategory(c)}
            />
          ))}
        </View>

        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No items match your search.</Text>
          }
          renderItem={({ item }) => <PriceRow item={item} />}
        />
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PriceRow({ item }: { item: PriceItem }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {item.sku} · {item.unit}
        </Text>
      </View>
      <View style={styles.rowPrice}>
        <Text style={styles.price}>
          {formatMoney(item.price, item.currency)}
        </Text>
        <Text style={styles.cat}>{item.category}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#f8fafc",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#94a3b8",
  },
  toolbar: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  search: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#334155",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  chipActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#cbd5e1",
  },
  chipTextActive: {
    color: "#fff",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  rowMain: { flex: 1, marginRight: 12 },
  rowPrice: { alignItems: "flex-end" },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f8fafc",
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: "#94a3b8",
  },
  price: {
    fontSize: 17,
    fontWeight: "700",
    color: "#38bdf8",
  },
  cat: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  empty: {
    textAlign: "center",
    color: "#64748b",
    marginTop: 40,
    fontSize: 15,
  },
});
