import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  ACTIVE_PRICES,
  PRICE_LIST_VERSION,
  PriceItem,
  filterPrices,
  formatMoney,
  vegTypesFrom,
} from "../data/prices";
import { usePriceOverrides } from "../hooks/usePriceOverrides";
import { parseBulkPricesText } from "../utils/parseBulkPrices";
import { colorForVegType } from "../theme/categoryColors";

const BG = "#f0fdf4";
const SURFACE = "#ffffff";
const BORDER = "rgba(22, 101, 52, 0.12)";
/** Match row card radius — stripe uses same left corner radius to avoid subpixel clipping */
const CARD_RADIUS = 16;
const STRIPE_W = 6;

export default function PriceListScreen() {
  const [query, setQuery] = useState("");
  const [vegType, setVegType] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<PriceItem | null>(null);
  const [draft, setDraft] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const validSkus = useMemo(
    () => new Set(ACTIVE_PRICES.map((p) => p.sku)),
    []
  );

  const {
    items: pricedItems,
    hydrated,
    setSkuPrice,
    clearSkuPrice,
    hasOverride,
    mergeBulkPatch,
  } = usePriceOverrides();

  const vegTypes = useMemo(() => vegTypesFrom(pricedItems), [pricedItems]);
  const rows = useMemo(
    () => filterPrices(pricedItems, query, null, vegType),
    [pricedItems, query, vegType]
  );

  useEffect(() => {
    if (!editing) {
      setDraft("");
      return;
    }
    if (hasOverride(editing.sku)) {
      setDraft(String(editing.price));
      return;
    }
    setDraft(editing.price > 0 ? String(editing.price) : "");
  }, [editing, hasOverride]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const closeEditor = useCallback(() => setEditing(null), []);

  const applyBulk = useCallback(() => {
    const r = parseBulkPricesText(bulkText, validSkus);
    const detail = [
      r.applied > 0 ? `${r.applied} prices ready to save.` : "No valid rows found.",
      r.unknownSkus.length > 0 ? `${r.unknownSkus.length} unknown SKU(s) (skipped).` : null,
      r.badLines.length > 0 ? `${r.badLines.length} unreadable line(s) (skipped).` : null,
    ]
      .filter(Boolean)
      .join("\n");

    if (r.applied === 0) {
      Alert.alert(
        "Bulk import",
        detail || "Use two columns: SKU and price. Tab (Excel) or comma works."
      );
      return;
    }

    Alert.alert("Apply imported prices?", detail, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Apply",
        onPress: () => {
          void mergeBulkPatch(r.patch);
          setBulkOpen(false);
          setBulkText("");
        },
      },
    ]);
  }, [bulkText, validSkus, mergeBulkPatch]);

  const saveDraft = useCallback(async () => {
    if (!editing) return;
    const trimmed = draft.trim().replace(",", ".");
    if (trimmed === "") {
      await clearSkuPrice(editing.sku);
      closeEditor();
      return;
    }
    const n = parseFloat(trimmed);
    if (!Number.isFinite(n) || n < 0) {
      Alert.alert("Invalid price", "Enter a valid positive number, or leave blank to use the catalog default.");
      return;
    }
    await setSkuPrice(editing.sku, Math.round(n * 100) / 100);
    closeEditor();
  }, [editing, draft, setSkuPrice, clearSkuPrice, closeEditor]);

  const lastUpdated = useMemo(() => {
    try {
      return new Date(PRICE_LIST_VERSION).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return PRICE_LIST_VERSION;
    }
  }, []);

  if (!hydrated) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Loading prices…</Text>
      </View>
    );
  }

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
        <View style={styles.heroInner}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.heroLogo}
            resizeMode="contain"
            accessibilityLabel="Intaba Trading logo"
          />
          <View style={styles.badge}>
            <Ionicons name="pricetags-outline" size={14} color="#ffffff" />
            <Text style={styles.badgeText}>INTABA catalog</Text>
          </View>
          <Text style={styles.title}>Active price list</Text>
          <View style={styles.heroMeta}>
            <Ionicons name="time-outline" size={15} color="rgba(255,255,255,0.9)" />
            <Text style={styles.subtitle}>Updated {lastUpdated}</Text>
          </View>
          <Text style={styles.hint}>
            Bulk-paste hundreds of prices from Excel, or tap the pencil for one row — saved on
            this device.
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.searchWrap}>
        <View style={styles.searchField}>
          <Ionicons name="search" size={20} color="#15803d" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, SKU, category…"
            placeholderTextColor="#86a89a"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScrollOuter}
        contentContainerStyle={styles.chipsScroll}
        keyboardShouldPersistTaps="handled"
      >
        <Chip
          label="All"
          active={vegType === null}
          onPress={() => setVegType(null)}
          categoryColor={null}
        />
        {vegTypes.map((v) => (
          <Chip
            key={v}
            label={v}
            active={vegType === v}
            onPress={() => setVegType(v)}
            categoryColor={colorForVegType(v)}
          />
        ))}
      </ScrollView>

      <View style={styles.statsBlock}>
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            Showing{" "}
            <Text style={styles.statsStrong}>{rows.length}</Text>
            {" · "}
            {ACTIVE_PRICES.length} products
          </Text>
          <TouchableOpacity
            style={styles.bulkBtn}
            onPress={() => setBulkOpen(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Bulk paste prices from spreadsheet"
          >
            <Ionicons name="clipboard-outline" size={18} color="#15803d" />
            <Text style={styles.bulkBtnText}>Bulk paste</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.legendHint}>
          Stripe, chip dot & pencil = crop family (e.g. Tomato, Onion, Carrot).
        </Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#15803d"
            colors={["#16a34a"]}
          />
        }
        ListEmptyComponent={<EmptyState query={query} />}
        renderItem={({ item }) => (
          <PriceRow
            item={item}
            accent={colorForVegType(item.vegType)}
            saved={hasOverride(item.sku)}
            onEdit={() => setEditing(item)}
          />
        )}
      />

      <Modal
        visible={editing !== null}
        transparent
        animationType="fade"
        onRequestClose={closeEditor}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalEyebrow}>Set price ({editing?.currency})</Text>
              <Text style={styles.modalTitle} numberOfLines={3}>
                {editing?.name}
              </Text>
              <Text style={styles.modalSku}>{editing?.sku}</Text>

              <Text style={styles.modalLabel}>Amount</Text>
              <TextInput
                style={styles.modalInput}
                value={draft}
                onChangeText={setDraft}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#86a89a"
                selectTextOnFocus
              />
              <Text style={styles.modalHelp}>
                Leave empty and save to use the catalog default (no price).
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnGhost]}
                  onPress={closeEditor}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalBtnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                  onPress={() => void saveDraft()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalBtnPrimaryText}>Save</Text>
                </TouchableOpacity>
              </View>

              {editing && hasOverride(editing.sku) ? (
                <TouchableOpacity
                  style={styles.modalClear}
                  onPress={() => {
                    void clearSkuPrice(editing.sku);
                    closeEditor();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalClearText}>Remove saved price</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={bulkOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBulkOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, styles.bulkCard]}>
              <Text style={styles.modalEyebrow}>Bulk import</Text>
              <Text style={styles.bulkExplainer}>
                In Excel or Google Sheets, put SKU in column A and price in column B. Select both
                columns (including hundreds of rows), copy, and paste below. Tab-separated works
                best; comma also works if the SKU has no commas.
              </Text>
              <TextInput
                style={styles.bulkInput}
                value={bulkText}
                onChangeText={setBulkText}
                placeholder={"MS/724/10\t12.50\nCPES1L\t8.00"}
                placeholderTextColor="#a8c4b8"
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                scrollEnabled
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnGhost]}
                  onPress={() => {
                    setBulkOpen(false);
                    setBulkText("");
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalBtnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                  onPress={applyBulk}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalBtnPrimaryText}>Preview & apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
  categoryColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  categoryColor: string | null;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      activeOpacity={0.75}
    >
      {categoryColor && !active ? (
        <View
          style={[styles.chipDot, { backgroundColor: categoryColor }]}
          accessibilityElementsHidden
        />
      ) : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PriceRow({
  item,
  accent,
  saved,
  onEdit,
}: {
  item: PriceItem;
  accent: string;
  saved: boolean;
  onEdit: () => void;
}) {
  return (
    <View style={styles.rowOuter}>
      <View style={styles.rowClip}>
        <View style={[styles.rowStripe, { backgroundColor: accent }]} />
        <View style={styles.rowInner}>
        <View style={styles.rowMain}>
          <Text style={styles.name} numberOfLines={3}>
            {item.name}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.skuPill}>
              <Text style={styles.skuText} numberOfLines={1}>
                {item.sku}
              </Text>
            </View>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.meta}>{item.unit}</Text>
          </View>
        </View>
        <View style={styles.rowRight}>
          <TouchableOpacity
            onPress={onEdit}
            style={styles.editBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Edit price"
          >
            <Ionicons name="create-outline" size={22} color={accent} />
          </TouchableOpacity>
          <View style={styles.rowPrice}>
            <Text
              style={[
                styles.price,
                item.price === 0 && styles.pricePlaceholder,
              ]}
            >
              {formatMoney(item.price, item.currency)}
            </Text>
            <View style={styles.catRow}>
              {saved ? (
                <View
                  style={[styles.savedDot, { backgroundColor: accent }]}
                  accessibilityLabel="Saved price"
                />
              ) : null}
              <Text style={styles.cat}>{item.vegType}</Text>
            </View>
          </View>
        </View>
      </View>
      </View>
    </View>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="search-outline" size={36} color="#15803d" />
      </View>
      <Text style={styles.emptyTitle}>No matches</Text>
      <Text style={styles.emptyBody}>
        {query.trim()
          ? `Nothing found for “${query.trim()}”. Try another term or clear filters.`
          : "No items to show."}
      </Text>
    </View>
  );
}

const shadowCard =
  Platform.OS === "web"
    ? {
        boxShadow: "0 6px 20px rgba(22, 101, 52, 0.1)",
      }
    : {
        shadowColor: "#14532d",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
      };

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroInner: {
    paddingTop: 4,
  },
  heroLogo: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 64,
    height: 64,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 14,
    padding: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 14,
    fontSize: 30,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.92)",
    fontWeight: "500",
  },
  hint: {
    marginTop: 12,
    fontSize: 12,
    color: "rgba(255,255,255,0.78)",
    lineHeight: 17,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6b8f7a",
    fontWeight: "600",
  },
  searchWrap: {
    paddingHorizontal: 16,
    marginTop: -6,
    marginBottom: 12,
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.35)",
    ...shadowCard,
  },
  searchIcon: {
    marginLeft: 14,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 16,
    color: "#14532d",
  },
  chipsScrollOuter: {
    flexGrow: 0,
    ...(Platform.OS === "web"
      ? ({ overflow: "visible" } as const)
      : {}),
  },
  chipsScroll: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    paddingBottom: 10,
    paddingRight: 24,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginRight: 8,
  },
  chipDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  chipActive: {
    backgroundColor: "#16a34a",
    borderColor: "#15803d",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#166534",
    maxWidth: 200,
  },
  chipTextActive: {
    color: "#ffffff",
  },
  statsBlock: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  legendHint: {
    marginTop: 6,
    fontSize: 11,
    color: "#86a89a",
    lineHeight: 15,
  },
  statsText: {
    flex: 1,
    fontSize: 13,
    color: "#6b8f7a",
  },
  bulkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  bulkBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803d",
  },
  statsStrong: {
    color: "#15803d",
    fontWeight: "700",
  },
  listScroll: {
    flex: 1,
    ...(Platform.OS === "web"
      ? ({ overflow: "visible" } as const)
      : {}),
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  /**
   * Shadow on outer only — avoids web bug where overflow:hidden + box-shadow clips children.
   * Stripe is position:absolute with same left corner radius as the card.
   */
  rowOuter: {
    marginBottom: 10,
    borderRadius: CARD_RADIUS,
    backgroundColor: "transparent",
    ...shadowCard,
  },
  rowClip: {
    position: "relative",
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  rowStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: STRIPE_W,
    borderTopLeftRadius: CARD_RADIUS,
    borderBottomLeftRadius: CARD_RADIUS,
    zIndex: 0,
  },
  rowInner: {
    position: "relative",
    zIndex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingLeft: STRIPE_W + 12,
    paddingRight: 14,
    minWidth: 0,
  },
  rowMain: { flex: 1, marginRight: 8 },
  rowRight: {
    flexDirection: "row",
    alignItems: "flex-start",
    maxWidth: "42%",
  },
  editBtn: {
    paddingTop: 0,
    paddingRight: 4,
    marginRight: 2,
  },
  rowPrice: { alignItems: "flex-end", flexShrink: 1, minWidth: 0 },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    marginTop: 6,
  },
  savedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#14532d",
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 6,
  },
  skuPill: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.35)",
    maxWidth: "100%",
  },
  skuText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#166534",
    fontVariant: ["tabular-nums"],
  },
  metaDot: {
    fontSize: 13,
    color: "#86a89a",
  },
  meta: {
    fontSize: 12,
    color: "#6b8f7a",
    fontWeight: "500",
  },
  price: {
    fontSize: 16,
    fontWeight: "800",
    color: "#15803d",
    letterSpacing: -0.3,
  },
  pricePlaceholder: {
    color: "#9cb9a8",
    fontWeight: "700",
  },
  cat: {
    fontSize: 10,
    color: "#6b8f7a",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 1,
  },
  modalRoot: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.35)",
    ...shadowCard,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16a34a",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  modalTitle: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: "700",
    color: "#14532d",
    lineHeight: 23,
  },
  modalSku: {
    marginTop: 6,
    fontSize: 13,
    color: "#6b8f7a",
    fontWeight: "600",
  },
  modalLabel: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: "600",
    color: "#166534",
  },
  modalInput: {
    marginTop: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.4)",
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 20,
    fontWeight: "700",
    color: "#14532d",
  },
  modalHelp: {
    marginTop: 10,
    fontSize: 12,
    color: "#86a89a",
    lineHeight: 17,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    minWidth: 100,
    alignItems: "center",
  },
  modalBtnGhost: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  modalBtnGhostText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#166534",
  },
  modalBtnPrimary: {
    backgroundColor: "#16a34a",
  },
  modalBtnPrimaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  modalClear: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 8,
  },
  modalClearText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#b45309",
  },
  bulkCard: {
    maxHeight: "92%",
  },
  bulkExplainer: {
    marginTop: 10,
    fontSize: 13,
    color: "#6b8f7a",
    lineHeight: 19,
  },
  bulkInput: {
    marginTop: 12,
    minHeight: 200,
    maxHeight: 360,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.4)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    lineHeight: 18,
    color: "#14532d",
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    textAlignVertical: "top",
  },
  emptyWrap: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.35)",
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "700",
    color: "#14532d",
  },
  emptyBody: {
    marginTop: 8,
    fontSize: 14,
    color: "#6b8f7a",
    textAlign: "center",
    lineHeight: 20,
  },
});
