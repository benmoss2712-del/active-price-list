import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../auth/AuthContext";
import { useSavedQuotes } from "../hooks/useSavedQuotes";
import { quotationTotals } from "../quotation/quotationMath";
import type { SavedQuote } from "../persistence/savedQuotesStorage";

const STATUS_TINTS: Record<
  string,
  { bg: string; fg: string; border: string }
> = {
  draft: { bg: "#f1f5f9", fg: "#475569", border: "#cbd5e1" },
  sent: { bg: "#dbeafe", fg: "#1d4ed8", border: "#93c5fd" },
  accepted: { bg: "#dcfce7", fg: "#166534", border: "#86efac" },
  declined: { bg: "#fee2e2", fg: "#991b1b", border: "#fca5a5" },
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function SavedQuotesScreen() {
  const { user, signOut } = useAuth();
  const { quotes, hydrated, deleteQuote } = useSavedQuotes();
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return quotes;
    return quotes.filter((sq) => {
      return (
        sq.quoteNumber.toLowerCase().includes(q) ||
        sq.customer.name.toLowerCase().includes(q) ||
        sq.customer.company.toLowerCase().includes(q) ||
        sq.lines.some((l) => l.productName.toLowerCase().includes(q))
      );
    });
  }, [quotes, query]);

  const openQuote = useCallback(
    (sq: SavedQuote) => {
      navigation.navigate("Quotes", { openQuoteId: sq.id });
    },
    [navigation]
  );

  const confirmDelete = useCallback(
    (sq: SavedQuote) => {
      Alert.alert(
        "Delete quote?",
        `${sq.quoteNumber} — ${sq.customer.name || sq.customer.company || "no customer"}`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => void deleteQuote(sq.id),
          },
        ]
      );
    },
    [deleteQuote]
  );

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign out?", "You'll go back to the login screen.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  }, [signOut]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#22c55e", "#15803d", "#166534"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroRow}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.heroLogo}
            resizeMode="contain"
            accessibilityLabel="Intaba Trading logo"
          />
          <View style={styles.heroBody}>
            <Text style={styles.heroGreeting}>
              Hi, {user?.displayName ?? "there"}
            </Text>
            <Text style={styles.heroTitle}>My quotes</Text>
            <Text style={styles.heroSub}>
              {quotes.length === 0
                ? "Quotes you save will appear here."
                : `${quotes.length} saved on this device.`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            activeOpacity={0.85}
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={18} color="#ffffff" />
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.searchWrap}>
        <View style={styles.searchField}>
          <Ionicons name="search" size={20} color="#15803d" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search quote #, customer, product…"
            placeholderTextColor="#86a89a"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <EmptyState hydrated={hydrated} hasQuotes={quotes.length > 0} />
        }
        renderItem={({ item }) => (
          <QuoteCard
            quote={item}
            onPress={() => openQuote(item)}
            onLongPress={() => confirmDelete(item)}
          />
        )}
      />
    </SafeAreaView>
  );
}

function QuoteCard({
  quote,
  onPress,
  onLongPress,
}: {
  quote: SavedQuote;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const totals = useMemo(
    () =>
      quotationTotals(quote.lines, quote.taxPercentStr, quote.discountPercentStr),
    [quote.lines, quote.taxPercentStr, quote.discountPercentStr]
  );
  const tint = STATUS_TINTS[quote.status] ?? STATUS_TINTS.draft;
  const customerLabel =
    quote.customer.name.trim() ||
    quote.customer.company.trim() ||
    "(no customer)";
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={styles.card}
    >
      <View style={styles.cardTopRow}>
        <Text style={styles.cardQuoteNo}>{quote.quoteNumber}</Text>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: tint.bg, borderColor: tint.border },
          ]}
        >
          <Text style={[styles.statusPillText, { color: tint.fg }]}>
            {quote.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.cardCustomer} numberOfLines={1}>
        {customerLabel}
      </Text>
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardMetaText}>
          {quote.lines.length} item{quote.lines.length === 1 ? "" : "s"} ·{" "}
          {formatRelative(quote.updatedAtIso)}
        </Text>
        <Text style={styles.cardTotal}>USD {totals.grandTotal.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({
  hydrated,
  hasQuotes,
}: {
  hydrated: boolean;
  hasQuotes: boolean;
}) {
  if (!hydrated) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Loading…</Text>
      </View>
    );
  }
  return (
    <View style={styles.empty}>
      <Ionicons name="document-text-outline" size={48} color="#86a89a" />
      <Text style={styles.emptyTitle}>
        {hasQuotes ? "No matches" : "Nothing saved yet"}
      </Text>
      <Text style={styles.emptyText}>
        {hasQuotes
          ? "Try a different quote number, customer, or product."
          : "Build a quote on the New quote tab and tap Save."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f0fdf4" },
  hero: {
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  heroLogo: {
    width: 52,
    height: 52,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 12,
    padding: 4,
  },
  heroBody: { flex: 1, minWidth: 0 },
  heroGreeting: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },
  heroSub: {
    marginTop: 4,
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  signOutText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(22, 101, 52, 0.18)",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: "#14532d",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(22, 101, 52, 0.12)",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardQuoteNo: {
    fontSize: 14,
    fontWeight: "800",
    color: "#14532d",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  cardCustomer: {
    marginTop: 4,
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
  },
  cardMetaRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardMetaText: {
    fontSize: 12,
    color: "#64748b",
  },
  cardTotal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  empty: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#14532d",
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
