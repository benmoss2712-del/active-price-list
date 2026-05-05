import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../auth/AuthContext";
import type { PublicUser } from "../auth/userAccountStorage";

type Mode =
  | { kind: "pick" }
  | { kind: "pin"; user: PublicUser }
  | { kind: "create" };

export default function LoginScreen() {
  const { users, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>(() =>
    users.length === 0 ? { kind: "create" } : { kind: "pick" }
  );

  const onPickUser = useCallback((user: PublicUser) => {
    setMode({ kind: "pin", user });
  }, []);

  const onShowCreate = useCallback(() => setMode({ kind: "create" }), []);
  const onBack = useCallback(() => {
    setMode(users.length === 0 ? { kind: "create" } : { kind: "pick" });
  }, [users.length]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#22c55e", "#15803d", "#166534"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroBrand}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.heroLogo}
            resizeMode="contain"
            accessibilityLabel="Intaba Trading logo"
          />
          <View>
            <Text style={styles.heroTitle}>Intaba Trading</Text>
            <Text style={styles.heroSub}>Sales companion</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {mode.kind === "pick" ? (
            <PickUserView
              users={users}
              onPick={onPickUser}
              onCreate={onShowCreate}
            />
          ) : null}
          {mode.kind === "pin" ? (
            <PinView user={mode.user} signIn={signIn} onBack={onBack} />
          ) : null}
          {mode.kind === "create" ? (
            <CreateView
              signUp={signUp}
              onBack={users.length === 0 ? null : onBack}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PickUserView({
  users,
  onPick,
  onCreate,
}: {
  users: PublicUser[];
  onPick: (u: PublicUser) => void;
  onCreate: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Who's signing in?</Text>
      <Text style={styles.cardSub}>Tap your name to enter your PIN.</Text>

      <View style={styles.userList}>
        {users.map((u) => (
          <TouchableOpacity
            key={u.id}
            onPress={() => onPick(u)}
            activeOpacity={0.85}
            style={styles.userChip}
          >
            <View style={styles.userInitial}>
              <Text style={styles.userInitialText}>
                {u.displayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userChipBody}>
              <Text style={styles.userName}>{u.displayName}</Text>
              <Text style={styles.userMeta}>@{u.username}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#15803d" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.secondaryBtn}
        activeOpacity={0.85}
        onPress={onCreate}
      >
        <Ionicons name="person-add-outline" size={18} color="#166534" />
        <Text style={styles.secondaryBtnText}>Create new account</Text>
      </TouchableOpacity>
    </View>
  );
}

function PinView({
  user,
  signIn,
  onBack,
}: {
  user: PublicUser;
  signIn: ReturnType<typeof useAuth>["signIn"];
  onBack: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async () => {
    if (pin.length < 4) {
      setError("Enter at least 4 digits.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await signIn(user.id, pin);
      if (!res.ok) {
        setError(res.reason === "wrong_pin" ? "Wrong PIN. Try again." : "Account not found.");
        setPin("");
      }
    } finally {
      setSubmitting(false);
    }
  }, [pin, signIn, user.id]);

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onBack} style={styles.backRow} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={18} color="#166534" />
        <Text style={styles.backText}>Choose another user</Text>
      </TouchableOpacity>

      <Text style={styles.cardTitle}>Hi, {user.displayName}</Text>
      <Text style={styles.cardSub}>Enter your PIN.</Text>

      <TextInput
        style={styles.pinInput}
        value={pin}
        onChangeText={(v) => {
          setError(null);
          setPin(v.replace(/[^0-9]/g, "").slice(0, 8));
        }}
        keyboardType="number-pad"
        secureTextEntry
        autoFocus
        placeholder="••••"
        placeholderTextColor="#94a3b8"
        maxLength={8}
        onSubmitEditing={() => void submit()}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryBtn, submitting && styles.primaryBtnBusy]}
        onPress={() => void submit()}
        activeOpacity={0.9}
        disabled={submitting}
      >
        <Text style={styles.primaryBtnText}>
          {submitting ? "Signing in…" : "Sign in"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function CreateView({
  signUp,
  onBack,
}: {
  signUp: ReturnType<typeof useAuth>["signUp"];
  onBack: (() => void) | null;
}) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () =>
      displayName.trim().length > 0 &&
      username.trim().length > 0 &&
      pin.length >= 4 &&
      pin === pin2,
    [displayName, username, pin, pin2]
  );

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await signUp({ displayName, username, pin });
      if (!res.ok) {
        setError(reasonToMessage(res.reason));
      }
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, displayName, pin, signUp, username]);

  return (
    <View style={styles.card}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.backRow} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={18} color="#166534" />
          <Text style={styles.backText}>Back to sign in</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.cardTitle}>Create account</Text>
      <Text style={styles.cardSub}>
        Pick a name your colleagues will recognise and a 4-digit PIN.
      </Text>

      <Text style={styles.fieldLabel}>Full name</Text>
      <TextInput
        style={styles.textInput}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="e.g. Tendai Moyo"
        placeholderTextColor="#94a3b8"
        autoCapitalize="words"
      />

      <Text style={styles.fieldLabel}>Username</Text>
      <TextInput
        style={styles.textInput}
        value={username}
        onChangeText={setUsername}
        placeholder="e.g. tendai"
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.fieldLabel}>PIN (4–8 digits)</Text>
      <TextInput
        style={styles.textInput}
        value={pin}
        onChangeText={(v) => setPin(v.replace(/[^0-9]/g, "").slice(0, 8))}
        keyboardType="number-pad"
        secureTextEntry
        placeholder="••••"
        placeholderTextColor="#94a3b8"
        maxLength={8}
      />

      <Text style={styles.fieldLabel}>Confirm PIN</Text>
      <TextInput
        style={styles.textInput}
        value={pin2}
        onChangeText={(v) => setPin2(v.replace(/[^0-9]/g, "").slice(0, 8))}
        keyboardType="number-pad"
        secureTextEntry
        placeholder="••••"
        placeholderTextColor="#94a3b8"
        maxLength={8}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {pin.length > 0 && pin2.length > 0 && pin !== pin2 ? (
        <Text style={styles.errorText}>PINs don't match.</Text>
      ) : null}

      <TouchableOpacity
        style={[
          styles.primaryBtn,
          (!canSubmit || submitting) && styles.primaryBtnBusy,
        ]}
        onPress={() => void submit()}
        activeOpacity={0.9}
        disabled={!canSubmit || submitting}
      >
        <Text style={styles.primaryBtnText}>
          {submitting ? "Creating…" : "Create account"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function reasonToMessage(reason: string): string {
  switch (reason) {
    case "name_required":
      return "Please enter your full name.";
    case "username_required":
      return "Please choose a username.";
    case "pin_too_short":
      return "PIN must be at least 4 digits.";
    case "username_taken":
      return "That username is already in use on this device.";
    default:
      return "Something went wrong. Try again.";
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#f0fdf4" },
  hero: {
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  heroBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroLogo: {
    width: 56,
    height: 56,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 12,
    padding: 4,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  heroSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginTop: 2,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 36,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(22, 101, 52, 0.12)",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#14532d",
  },
  cardSub: {
    marginTop: 4,
    fontSize: 13,
    color: "#475569",
  },
  userList: {
    marginTop: 14,
    gap: 8,
  },
  userChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(22, 101, 52, 0.18)",
    backgroundColor: "#f0fdf4",
  },
  userInitial: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#15803d",
    alignItems: "center",
    justifyContent: "center",
  },
  userInitialText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  userChipBody: { flex: 1, minWidth: 0 },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#14532d",
  },
  userMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b8f7a",
  },
  secondaryBtn: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(22, 101, 52, 0.35)",
    backgroundColor: "#f0fdf4",
  },
  secondaryBtnText: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "700",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  backText: {
    fontSize: 13,
    color: "#166534",
    fontWeight: "600",
  },
  fieldLabel: {
    marginTop: 12,
    fontSize: 12,
    color: "#475569",
  },
  textInput: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 11 : 8,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  pinInput: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: 22,
    letterSpacing: 6,
    textAlign: "center",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  errorText: {
    marginTop: 10,
    fontSize: 13,
    color: "#b91c1c",
  },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: "#16a34a",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnBusy: {
    opacity: 0.65,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
});
