import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Print from "expo-print";
import CustomerAutocomplete from "../components/CustomerAutocomplete";
import { filterPrices, formatMoney, PriceItem } from "../data/prices";
import { usePriceOverrides } from "../hooks/usePriceOverrides";
import {
  emptyCustomer,
  emptyQuotationDraft,
  lineFromPriceItem,
  toQuotationDraft,
} from "../quotation/quotationDefaults";
import { buildQuotationPrintHtml } from "../quotation/buildQuotationPrintHtml";
import { buildQuotationSummaryText } from "../quotation/buildQuotationSummary";
import { lineExtendedAmount, quotationTotals } from "../quotation/quotationMath";
import { colorForVegType } from "../theme/categoryColors";
import { hasRealIntegrationConfig, submitQuotationDraft } from "../integration";
import { useSavedQuotes } from "../hooks/useSavedQuotes";
import type { SavedQuote } from "../persistence/savedQuotesStorage";
import type {
  CustomerDetails,
  QuotationLineDraft,
  QuotationStatus,
} from "../types/quotation";

const BG = "#f0fdf4";
const SURFACE = "#ffffff";
const BORDER = "rgba(22, 101, 52, 0.12)";
const STATUS_OPTIONS: QuotationStatus[] = ["draft", "sent", "accepted", "declined"];
const COMPANY = {
  name: "Intaba Trading (Pvt) Ltd",
  address: "4 Banty Road, Alexandra Park, Harare",
  email: "accounts@intabatrading.com",
  phone: "+263 8677005240",
  tax: "20221472",
  tin: "2000753625",
  currency: "USD",
};

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

function expiryFrom(createdAtIso: string, validDaysStr: string): string {
  const created = new Date(createdAtIso);
  const days = Number.parseInt(validDaysStr, 10);
  if (Number.isNaN(created.getTime()) || !Number.isFinite(days)) return "Not set";
  const exp = new Date(created.getTime() + days * 24 * 60 * 60 * 1000);
  return exp.toLocaleDateString();
}

function openWebPrintPreview(html: string): void {
  if (typeof window === "undefined") return;
  const doc = window.document;
  const existing = doc.getElementById("quote-print-preview-overlay");
  if (existing) {
    existing.remove();
  }

  const overlay = doc.createElement("div");
  overlay.id = "quote-print-preview-overlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(15, 23, 42, 0.6)";
  overlay.style.zIndex = "2147483647";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.padding = "16px";

  const card = doc.createElement("div");
  card.style.width = "min(1100px, 96vw)";
  card.style.height = "min(920px, 94vh)";
  card.style.background = "#ffffff";
  card.style.borderRadius = "12px";
  card.style.overflow = "hidden";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.boxShadow = "0 18px 50px rgba(2, 6, 23, 0.35)";

  const toolbar = doc.createElement("div");
  toolbar.style.display = "flex";
  toolbar.style.justifyContent = "space-between";
  toolbar.style.alignItems = "center";
  toolbar.style.padding = "10px 12px";
  toolbar.style.borderBottom = "1px solid #e2e8f0";
  toolbar.style.background = "#f8fafc";

  const title = doc.createElement("div");
  title.textContent = "Print preview";
  title.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  title.style.fontSize = "14px";
  title.style.fontWeight = "600";
  title.style.color = "#0f172a";

  const actions = doc.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "8px";

  const makeBtn = (
    label: string,
    background: string,
    color: string,
    borderColor: string
  ): HTMLButtonElement => {
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.style.background = background;
    btn.style.color = color;
    btn.style.border = `1px solid ${borderColor}`;
    btn.style.borderRadius = "8px";
    btn.style.padding = "7px 12px";
    btn.style.fontSize = "12px";
    btn.style.fontWeight = "600";
    btn.style.cursor = "pointer";
    return btn;
  };

  const printBtn = makeBtn("Print", "#2563eb", "#ffffff", "#1d4ed8");
  const closeBtn = makeBtn("Close", "#ffffff", "#334155", "#cbd5e1");

  const iframe = doc.createElement("iframe");
  iframe.style.flex = "1";
  iframe.style.width = "100%";
  iframe.style.border = "0";
  iframe.setAttribute("title", "Quotation print preview");
  iframe.srcdoc = html;

  const closePreview = (): void => {
    overlay.remove();
  };

  printBtn.onclick = () => {
    if (iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };
  closeBtn.onclick = closePreview;
  overlay.onclick = (evt) => {
    if (evt.target === overlay) {
      closePreview();
    }
  };

  actions.appendChild(printBtn);
  actions.appendChild(closeBtn);
  toolbar.appendChild(title);
  toolbar.appendChild(actions);
  card.appendChild(toolbar);
  card.appendChild(iframe);
  overlay.appendChild(card);
  doc.body.appendChild(overlay);
}

export default function CalculatorScreen() {
  const initialDraft = useMemo(() => emptyQuotationDraft(), []);
  const { items: pricedItems } = usePriceOverrides();
  const { saveQuote, quotes } = useSavedQuotes();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [customer, setCustomer] = useState<CustomerDetails>(() => emptyCustomer());
  const [lines, setLines] = useState<QuotationLineDraft[]>([]);
  const [quoteNumber, setQuoteNumber] = useState(initialDraft.quoteNumber);
  const [createdAtIso, setCreatedAtIso] = useState(initialDraft.createdAtIso);
  const [validDaysStr, setValidDaysStr] = useState(initialDraft.validDaysStr);
  const [status, setStatus] = useState<QuotationStatus>(initialDraft.status);
  const [discountStr, setDiscountStr] = useState(initialDraft.discountPercentStr);
  const [taxStr, setTaxStr] = useState("0");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickQuery, setPickQuery] = useState("");
  const [submittingToSystem, setSubmittingToSystem] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadFromSaved = useCallback((sq: SavedQuote) => {
    setCustomer({ ...sq.customer });
    setLines(sq.lines.map((l) => ({ ...l })));
    setQuoteNumber(sq.quoteNumber);
    setCreatedAtIso(sq.createdAtIso);
    setValidDaysStr(sq.validDaysStr);
    setStatus(sq.status);
    setDiscountStr(sq.discountPercentStr);
    setTaxStr(sq.taxPercentStr);
    setEditingQuoteId(sq.id);
  }, []);

  // When the Saved Quotes screen taps a card, it sets `openQuoteId` as a
  // route param. We pull that quote into local state, then clear the param
  // so re-focusing this tab doesn't keep re-loading it.
  const openQuoteId: string | undefined = route.params?.openQuoteId;
  useEffect(() => {
    if (!openQuoteId) return;
    const sq = quotes.find((q) => q.id === openQuoteId);
    if (sq) {
      loadFromSaved(sq);
    }
    navigation.setParams({ openQuoteId: undefined });
  }, [openQuoteId, quotes, loadFromSaved, navigation]);

  const pickRows = useMemo(
    () => filterPrices(pricedItems, pickQuery, null).slice(0, 80),
    [pricedItems, pickQuery]
  );

  const addProduct = useCallback((p: PriceItem) => {
    setLines((prev) => [...prev, lineFromPriceItem(p)]);
    setPickerOpen(false);
    setPickQuery("");
  }, []);

  const updateLine = useCallback((key: string, patch: Partial<QuotationLineDraft>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);

  const updateCustomer = useCallback((patch: Partial<CustomerDetails>) => {
    setCustomer((c) => ({ ...c, ...patch }));
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const {
    subtotal,
    discountAmount,
    taxRatePercent,
    taxAmount,
    grandTotal,
  } = useMemo(() => quotationTotals(lines, taxStr, discountStr), [lines, taxStr, discountStr]);

  const hasCustomerInput = useMemo(
    () =>
      Object.values(customer).some((v) => typeof v === "string" && v.trim().length > 0),
    [customer]
  );

  const canClear =
    lines.length > 0 ||
    hasCustomerInput ||
    taxStr !== "0" ||
    discountStr !== "0" ||
    status !== "draft";

  const clearAll = useCallback(() => {
    const nextDraft = emptyQuotationDraft();
    setLines([]);
    setQuoteNumber(nextDraft.quoteNumber);
    setCreatedAtIso(nextDraft.createdAtIso);
    setValidDaysStr(nextDraft.validDaysStr);
    setStatus(nextDraft.status);
    setDiscountStr(nextDraft.discountPercentStr);
    setTaxStr(nextDraft.taxPercentStr);
    setCustomer(emptyCustomer());
    setEditingQuoteId(null);
  }, []);

  const saveCurrent = useCallback(
    async (opts?: { silent?: boolean }): Promise<SavedQuote | null> => {
      if (lines.length === 0) {
        if (!opts?.silent) {
          Alert.alert(
            "Nothing to save",
            "Add at least one line item before saving the quote."
          );
        }
        return null;
      }
      const draft = toQuotationDraft(customer, lines, discountStr, taxStr, {
        id: editingQuoteId,
        quoteNumber: quoteNumber.trim() || initialDraft.quoteNumber,
        createdAtIso,
        validDaysStr,
        status,
      });
      setSaving(true);
      try {
        const saved = await saveQuote(draft);
        if (saved) {
          setEditingQuoteId(saved.id);
          if (!opts?.silent) {
            Alert.alert(
              "Saved",
              `${saved.quoteNumber} is in My Quotes (saved on this device).`
            );
          }
        }
        return saved;
      } finally {
        setSaving(false);
      }
    },
    [
      lines,
      customer,
      discountStr,
      taxStr,
      editingQuoteId,
      quoteNumber,
      initialDraft.quoteNumber,
      createdAtIso,
      validDaysStr,
      status,
      saveQuote,
    ]
  );

  const shareQuote = useCallback(async () => {
    if (lines.length === 0) {
      Alert.alert("Nothing to share", "Add at least one line item before sharing a quote.");
      return;
    }
    const draft = toQuotationDraft(customer, lines, discountStr, taxStr, {
      quoteNumber: quoteNumber.trim() || initialDraft.quoteNumber,
      createdAtIso,
      validDaysStr,
      status,
    });
    const message = buildQuotationSummaryText(draft);
    await Share.share({
      title: draft.quoteNumber,
      message,
    });
  }, [
    customer,
    lines,
    discountStr,
    taxStr,
    quoteNumber,
    initialDraft.quoteNumber,
    createdAtIso,
    validDaysStr,
    status,
  ]);

  const submitToCompanySystem = useCallback(async () => {
    if (lines.length === 0) {
      Alert.alert("Cannot submit", "Add at least one line item before submitting.");
      return;
    }
    // Save locally first so the quote shows up in My Quotes regardless of
    // whether the remote submission succeeds.
    await saveCurrent({ silent: true });
    const draft = toQuotationDraft(customer, lines, discountStr, taxStr, {
      id: editingQuoteId,
      quoteNumber: quoteNumber.trim() || initialDraft.quoteNumber,
      createdAtIso,
      validDaysStr,
      status,
    });
    setSubmittingToSystem(true);
    try {
      const result = await submitQuotationDraft(draft);
      if (result.mode === "submitted") {
        Alert.alert(
          "Submitted",
          `Quote synced to company system.\nRemote quote #: ${result.quoteNumber}`
        );
      } else {
        Alert.alert(
          "Queued for sync",
          `API not reachable right now.\nSaved to My Quotes & queued for sync (${result.queueId}).`
        );
      }
    } finally {
      setSubmittingToSystem(false);
    }
  }, [
    lines,
    customer,
    discountStr,
    taxStr,
    editingQuoteId,
    quoteNumber,
    initialDraft.quoteNumber,
    createdAtIso,
    validDaysStr,
    status,
    saveCurrent,
  ]);

  const printQuote = useCallback(async () => {
    if (lines.length === 0) {
      Alert.alert("Nothing to print", "Add at least one line item before printing.");
      return;
    }
    const draft = toQuotationDraft(customer, lines, discountStr, taxStr, {
      quoteNumber: quoteNumber.trim() || initialDraft.quoteNumber,
      createdAtIso,
      validDaysStr,
      status,
    });
    const html = buildQuotationPrintHtml(draft);
    try {
      if (Platform.OS === "web") {
        openWebPrintPreview(html);
        return;
      }
      await Print.printAsync({
        html,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start printing.";
      Alert.alert("Print failed", message);
    }
  }, [
    lines,
    customer,
    discountStr,
    taxStr,
    quoteNumber,
    initialDraft.quoteNumber,
    createdAtIso,
    validDaysStr,
    status,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={22} color="#fff" />
          <Text style={styles.addBtnText}>Add product</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={clearAll}
          activeOpacity={0.8}
          disabled={!canClear}
        >
          <Text style={[styles.clearBtnText, !canClear && styles.clearBtnTextDisabled]}>
            New quote
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => void saveCurrent()}
          activeOpacity={0.85}
          disabled={saving}
        >
          <Ionicons name="bookmark-outline" size={18} color="#166534" />
          <Text style={styles.saveBtnText}>
            {saving ? "Saving…" : editingQuoteId ? "Update" : "Save"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn} onPress={() => void shareQuote()} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={18} color="#166534" />
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.printBtn} onPress={() => void printQuote()} activeOpacity={0.8}>
          <Ionicons name="print-outline" size={18} color="#1d4ed8" />
          <Text style={styles.printBtnText}>Print</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={() => void submitToCompanySystem()}
          activeOpacity={0.8}
          disabled={submittingToSystem}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#0f172a" />
          <Text style={styles.syncBtnText}>
            {submittingToSystem ? "Submitting..." : "Submit"}
          </Text>
        </TouchableOpacity>
      </View>
      {editingQuoteId ? (
        <View style={styles.editingBar}>
          <Ionicons name="create-outline" size={14} color="#0c4a6e" />
          <Text style={styles.editingBarText}>
            Editing saved quote — Save will update it. Tap "New quote" to start fresh.
          </Text>
        </View>
      ) : null}
      {!hasRealIntegrationConfig() ? (
        <View style={styles.integrationHintBar}>
          <Text style={styles.integrationHintText}>
            Integration scaffold active. Set EXPO_PUBLIC_COMPANY_API_BASE_URL to enable live sync.
          </Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.brandBlock}>
              <Image
                source={require("../../assets/logo.png")}
                style={styles.brandLogo}
                resizeMode="contain"
                accessibilityLabel="Intaba Trading logo"
              />
              <View>
                <Text style={styles.brand}>INTABA TRADING</Text>
                <Text style={styles.brandSub}>Crop Solutions</Text>
              </View>
            </View>
            <View style={styles.sheetHeaderRight}>
              <Text style={styles.docTitle}>Quotation</Text>
              <Text style={styles.docSub}>Quote No: {quoteNumber}</Text>
            </View>
          </View>

          <View style={styles.companyRow}>
            <View style={styles.companyCol}>
              <Text style={styles.metaTitle}>{COMPANY.name}</Text>
              <Text style={styles.metaText}>{COMPANY.address}</Text>
              <Text style={styles.metaText}>{COMPANY.email}</Text>
              <Text style={styles.metaText}>{COMPANY.phone}</Text>
            </View>
            <View style={styles.companyCol}>
              <Text style={styles.metaText}>Tax Registration: {COMPANY.tax}</Text>
              <Text style={styles.metaText}>TIN: {COMPANY.tin}</Text>
              <Text style={styles.metaText}>Currency: {COMPANY.currency}</Text>
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setStatus(option)}
                    style={[styles.statusChip, status === option && styles.statusChipActive]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        status === option && styles.statusChipTextActive,
                      ]}
                    >
                      {option.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.customerNameWrap}>
            <Text style={styles.metaCellLabel}>Customer Name</Text>
            <CustomerAutocomplete
              value={customer.name}
              onChangeText={(t) => updateCustomer({ name: t })}
              inputStyle={styles.metaCellInput}
            />
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaCellLabel}>Company</Text>
              <TextInput
                style={styles.metaCellInput}
                value={customer.company}
                onChangeText={(t) => updateCustomer({ company: t })}
                placeholder="Company"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaCellLabel}>Email</Text>
              <TextInput
                style={styles.metaCellInput}
                value={customer.email}
                onChangeText={(t) => updateCustomer({ email: t })}
                placeholder="Email"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaCellLabel}>Phone</Text>
              <TextInput
                style={styles.metaCellInput}
                value={customer.phone}
                onChangeText={(t) => updateCustomer({ phone: t })}
                placeholder="Phone"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.docInfoRow}>
            <View style={styles.docInfoCell}>
              <Text style={styles.docInfoLabel}>Date</Text>
              <Text style={styles.docInfoValue}>{formatShortDate(createdAtIso)}</Text>
            </View>
            <View style={styles.docInfoCell}>
              <Text style={styles.docInfoLabel}>Valid (days)</Text>
              <TextInput
                style={styles.docInfoInput}
                value={validDaysStr}
                onChangeText={setValidDaysStr}
                keyboardType="number-pad"
                placeholder="30"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.docInfoCell}>
              <Text style={styles.docInfoLabel}>Valid Until</Text>
              <Text style={styles.docInfoValue}>{expiryFrom(createdAtIso, validDaysStr)}</Text>
            </View>
            <View style={styles.docInfoCell}>
              <Text style={styles.docInfoLabel}>Quote Number</Text>
              <TextInput
                style={styles.docInfoInput}
                value={quoteNumber}
                onChangeText={setQuoteNumber}
                placeholder="Q-20260415-0001"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View style={styles.notesWrap}>
            <Text style={styles.metaCellLabel}>Address / Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={customer.notes}
              onChangeText={(t) => updateCustomer({ notes: t })}
              placeholder="Delivery address, account reference, special instructions..."
              placeholderTextColor="#94a3b8"
              multiline
            />
          </View>

          <View style={styles.tableWrap}>
            <View style={styles.tableHead}>
              <Text style={[styles.headCell, styles.headDesc]}>Item Description</Text>
              <Text style={[styles.headCell, styles.headQty]}>Qty</Text>
              <Text style={[styles.headCell, styles.headPrice]}>Price</Text>
              <Text style={[styles.headCell, styles.headTax]}>Tax</Text>
              <Text style={[styles.headCell, styles.headTotal]}>Total</Text>
              <Text style={[styles.headCell, styles.headAction]}>-</Text>
            </View>
            {lines.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="document-outline" size={36} color="#94a3b8" />
                <Text style={styles.emptyText}>No items yet. Tap Add product.</Text>
              </View>
            ) : (
              lines.map((line) => {
                const lineTot = lineExtendedAmount(line);
                const lineTax =
                  lineTot === null
                    ? null
                    : Math.round((lineTot * (taxRatePercent / 100) + Number.EPSILON) * 100) / 100;
                return (
                  <View key={line.key} style={styles.tableRow}>
                    <View style={styles.descCol}>
                      <Text style={styles.lineName} numberOfLines={2}>
                        {line.productName}
                      </Text>
                      <Text style={styles.lineSku}>
                        {line.sku} · {line.currency}
                      </Text>
                    </View>
                    <TextInput
                      style={[styles.tableInput, styles.qtyCol]}
                      value={line.qtyStr}
                      onChangeText={(t) => updateLine(line.key, { qtyStr: t })}
                      keyboardType="decimal-pad"
                      placeholder="1"
                      placeholderTextColor="#94a3b8"
                    />
                    <TextInput
                      style={[styles.tableInput, styles.priceCol]}
                      value={line.unitPriceStr}
                      onChangeText={(t) => updateLine(line.key, { unitPriceStr: t })}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#94a3b8"
                    />
                    <Text style={[styles.tableValue, styles.taxCol]}>
                      {lineTax === null ? "-" : lineTax.toFixed(2)}
                    </Text>
                    <Text style={[styles.tableValue, styles.totalCol]}>
                      {lineTot === null ? "-" : lineTot.toFixed(2)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeLine(line.key)}
                      style={styles.removeBtn}
                      accessibilityLabel="Remove line"
                    >
                      <Ionicons name="close-circle-outline" size={20} color="#b91c1c" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.summaryBlock}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sub Total (Exclusive)</Text>
              <Text style={styles.summaryVal}>USD {subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryInputRow}>
              <Text style={styles.summaryLabel}>Tax %</Text>
              <TextInput
                style={styles.summaryInput}
                value={taxStr}
                onChangeText={setTaxStr}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax Total</Text>
              <Text style={styles.summaryVal}>USD {taxAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryInputRow}>
              <Text style={styles.summaryLabel}>Discount %</Text>
              <TextInput
                style={styles.summaryInput}
                value={discountStr}
                onChangeText={setDiscountStr}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={styles.summaryVal}>USD {discountAmount.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.invoiceTotalRow]}>
              <Text style={styles.invoiceTotalLabel}>Invoice Total</Text>
              <Text style={styles.invoiceTotalVal}>USD {grandTotal.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.signRow}>
            <View style={styles.signCol}>
              <Text style={styles.signLabel}>Date</Text>
              <View style={styles.signLine} />
            </View>
            <View style={styles.signCol}>
              <Text style={styles.signLabel}>Signed</Text>
              <View style={styles.signLine} />
            </View>
            <View style={styles.signCol}>
              <Text style={styles.signLabel}>Received By</Text>
              <View style={styles.signLine} />
            </View>
          </View>

          <View style={styles.bankBox}>
            <Text style={styles.bankTitle}>Banking Details</Text>
            <Text style={styles.bankText}>
              Account Name: Intaba Trading (Pvt) Ltd
            </Text>
            <Text style={styles.bankText}>Nedbank (Borrowdale): 31037000207</Text>
            <Text style={styles.bankText}>Stanbic (Borrowdale): 914000053559</Text>
            <Text style={styles.bankText}>Ecobank (Borrowdale): 5767200002071</Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>Pick a product</Text>
              <View style={styles.pickerSearch}>
                <Ionicons name="search" size={20} color="#15803d" />
                <TextInput
                  style={styles.pickerSearchInput}
                  value={pickQuery}
                  onChangeText={setPickQuery}
                  placeholder="Search name or SKU…"
                  placeholderTextColor="#86a89a"
                  autoFocus
                />
              </View>
              <FlatList
                data={pickRows}
                keyExtractor={(item) => item.id}
                style={styles.pickerList}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerRow}
                    onPress={() => addProduct(item)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.pickerDot,
                        { backgroundColor: colorForVegType(item.vegType) },
                      ]}
                    />
                    <View style={styles.pickerRowText}>
                      <Text style={styles.pickerName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.pickerMeta}>
                        {item.sku} · {formatMoney(item.price, item.currency)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.pickerEmpty}>No matches.</Text>
                }
              />
              <TouchableOpacity
                style={styles.pickerClose}
                onPress={() => {
                  setPickerOpen(false);
                  setPickQuery("");
                }}
              >
                <Text style={styles.pickerCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  addBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 12,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  clearBtn: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.35)",
    backgroundColor: "#f0fdf4",
  },
  shareBtnText: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "700",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(22, 101, 52, 0.45)",
    backgroundColor: "#dcfce7",
  },
  saveBtnText: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "700",
  },
  printBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
  },
  printBtnText: {
    color: "#1d4ed8",
    fontSize: 14,
    fontWeight: "700",
  },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#e2e8f0",
  },
  syncBtnText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
  },
  clearBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#b45309",
  },
  clearBtnTextDisabled: {
    color: "#cbd5e1",
  },
  scroll: { flex: 1 },
  integrationHintBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fef9c3",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  integrationHintText: {
    fontSize: 12,
    color: "#713f12",
  },
  editingBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#7dd3fc",
    backgroundColor: "#e0f2fe",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  editingBarText: {
    flex: 1,
    fontSize: 12,
    color: "#0c4a6e",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sheet: {
    backgroundColor: SURFACE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.2)",
    padding: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 10,
  },
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandLogo: {
    width: 44,
    height: 44,
  },
  brand: {
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#334155",
  },
  brandSub: {
    fontSize: 11,
    color: "#64748b",
  },
  sheetHeaderRight: {
    alignItems: "flex-end",
  },
  docTitle: {
    fontSize: 23,
    fontWeight: "700",
    color: "#0f172a",
  },
  docSub: {
    marginTop: 4,
    fontSize: 12,
    color: "#334155",
  },
  companyRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
  },
  companyCol: {
    flex: 1,
  },
  metaTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 3,
  },
  metaText: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 16,
  },
  customerNameWrap: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    zIndex: 50,
  },
  metaGrid: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    overflow: "hidden",
  },
  metaCell: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaCellLabel: {
    fontSize: 11,
    color: "#475569",
    marginBottom: 2,
  },
  metaCellInput: {
    fontSize: 14,
    color: "#0f172a",
    paddingVertical: Platform.OS === "ios" ? 5 : 3,
  },
  notesWrap: {
    marginTop: 10,
  },
  notesInput: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    minHeight: 54,
    fontSize: 13,
    color: "#0f172a",
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: "top",
  },
  docInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  docInfoCell: {
    flex: 1,
    minWidth: "47%",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  docInfoLabel: {
    fontSize: 10,
    color: "#475569",
    marginBottom: 3,
  },
  docInfoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  docInfoInput: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
    paddingVertical: Platform.OS === "ios" ? 4 : 2,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  statusChip: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#ffffff",
  },
  statusChipActive: {
    backgroundColor: "#e2e8f0",
    borderColor: "#94a3b8",
  },
  statusChipText: {
    fontSize: 10,
    color: "#334155",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  statusChipTextActive: {
    color: "#0f172a",
  },
  tableWrap: { marginTop: 12, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, overflow: "hidden" },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  headCell: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  headDesc: { flex: 1.8 },
  headQty: { flex: 0.6, textAlign: "center" },
  headPrice: { flex: 0.8, textAlign: "right" },
  headTax: { flex: 0.7, textAlign: "right" },
  headTotal: { flex: 0.8, textAlign: "right" },
  headAction: { width: 24, textAlign: "center" },
  empty: {
    alignItems: "center",
    paddingVertical: 18,
    gap: 8,
    backgroundColor: "#ffffff",
  },
  emptyText: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  descCol: { flex: 1.8, paddingRight: 6 },
  lineName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
  },
  lineSku: {
    marginTop: 2,
    fontSize: 10,
    color: "#64748b",
  },
  tableInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === "ios" ? 6 : 3,
    fontSize: 12,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  qtyCol: { flex: 0.6, textAlign: "center" },
  priceCol: { flex: 0.8, textAlign: "right" },
  taxCol: { flex: 0.7 },
  totalCol: { flex: 0.8, fontWeight: "700" },
  tableValue: {
    fontSize: 12,
    color: "#0f172a",
    textAlign: "right",
  },
  removeBtn: {
    width: 24,
    alignItems: "center",
  },
  summaryBlock: {
    width: "58%",
    minWidth: 250,
    alignSelf: "flex-end",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    paddingTop: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  summaryInputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#334155",
  },
  summaryVal: {
    fontSize: 12,
    color: "#0f172a",
    fontWeight: "600",
  },
  summaryInput: {
    width: 80,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === "ios" ? 6 : 3,
    fontSize: 12,
    textAlign: "right",
    color: "#0f172a",
  },
  invoiceTotalRow: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    paddingTop: 6,
  },
  invoiceTotalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  invoiceTotalVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  signRow: {
    flexDirection: "row",
    marginTop: 20,
    gap: 12,
  },
  signCol: {
    flex: 1,
  },
  signLabel: {
    fontSize: 12,
    color: "#334155",
    marginBottom: 6,
  },
  signLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#475569",
    height: 22,
  },
  bankBox: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 10,
  },
  bankTitle: {
    fontSize: 12,
    color: "#0f172a",
    fontWeight: "600",
    marginBottom: 6,
  },
  bankText: {
    fontSize: 11,
    color: "#334155",
    lineHeight: 16,
  },
  modalRoot: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
    padding: 16,
  },
  pickerCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: BORDER,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#14532d",
    marginBottom: 12,
  },
  pickerSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.35)",
  },
  pickerSearchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: "#14532d",
  },
  pickerList: { maxHeight: 360 },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e7f5ec",
  },
  pickerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pickerRowText: { flex: 1, minWidth: 0 },
  pickerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#14532d",
  },
  pickerMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b8f7a",
  },
  pickerEmpty: {
    textAlign: "center",
    color: "#94a3b8",
    padding: 24,
  },
  pickerClose: {
    alignItems: "center",
    paddingTop: 12,
  },
  pickerCloseText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#166534",
  },
});
