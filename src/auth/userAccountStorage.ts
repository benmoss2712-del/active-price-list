import AsyncStorage from "@react-native-async-storage/async-storage";
import { sha256Hex } from "./sha256";

const ACCOUNTS_KEY = "@active-price-list/v1/user-accounts";
const SESSION_KEY = "@active-price-list/v1/user-session";

export type UserAccount = {
  id: string;
  displayName: string;
  username: string;
  pinSalt: string;
  pinHash: string;
  createdAtIso: string;
};

export type ActiveSession = {
  userId: string;
  signedInAtIso: string;
};

export type PublicUser = Pick<
  UserAccount,
  "id" | "displayName" | "username" | "createdAtIso"
>;

function publicUser(account: UserAccount): PublicUser {
  const { id, displayName, username, createdAtIso } = account;
  return { id, displayName, username, createdAtIso };
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateSalt(): string {
  // 16 hex chars (~64 bits) is plenty for PIN-stretching against casual snooping.
  return Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10);
}

export function hashPin(pin: string, salt: string): string {
  return sha256Hex(`${salt}::${pin}`);
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function loadAccounts(): Promise<UserAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAccounts(accounts: UserAccount[]): Promise<void> {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function listPublicUsers(): Promise<PublicUser[]> {
  const accounts = await loadAccounts();
  return accounts
    .map(publicUser)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export type CreateAccountInput = {
  displayName: string;
  username: string;
  pin: string;
};

export type CreateAccountResult =
  | { ok: true; user: PublicUser }
  | { ok: false; reason: "pin_too_short" | "name_required" | "username_required" | "username_taken" };

export async function createAccount(
  input: CreateAccountInput
): Promise<CreateAccountResult> {
  const displayName = input.displayName.trim();
  const username = normalizeUsername(input.username);
  const pin = input.pin.trim();

  if (!displayName) return { ok: false, reason: "name_required" };
  if (!username) return { ok: false, reason: "username_required" };
  if (pin.length < 4) return { ok: false, reason: "pin_too_short" };

  const accounts = await loadAccounts();
  if (accounts.some((a) => a.username === username)) {
    return { ok: false, reason: "username_taken" };
  }

  const salt = generateSalt();
  const account: UserAccount = {
    id: generateId(),
    displayName,
    username,
    pinSalt: salt,
    pinHash: hashPin(pin, salt),
    createdAtIso: new Date().toISOString(),
  };

  await writeAccounts([...accounts, account]);
  return { ok: true, user: publicUser(account) };
}

export type VerifyResult =
  | { ok: true; user: PublicUser }
  | { ok: false; reason: "not_found" | "wrong_pin" };

export async function verifyPin(
  userId: string,
  pin: string
): Promise<VerifyResult> {
  const accounts = await loadAccounts();
  const found = accounts.find((a) => a.id === userId);
  if (!found) return { ok: false, reason: "not_found" };
  const candidate = hashPin(pin.trim(), found.pinSalt);
  if (candidate !== found.pinHash) return { ok: false, reason: "wrong_pin" };
  return { ok: true, user: publicUser(found) };
}

export async function loadActiveSession(): Promise<ActiveSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveSession;
    if (!parsed?.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveActiveSession(userId: string): Promise<void> {
  const session: ActiveSession = {
    userId,
    signedInAtIso: new Date().toISOString(),
  };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearActiveSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function findUserById(userId: string): Promise<PublicUser | null> {
  const accounts = await loadAccounts();
  const found = accounts.find((a) => a.id === userId);
  return found ? publicUser(found) : null;
}
