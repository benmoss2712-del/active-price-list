import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ApiSession } from "./types";

const SESSION_KEY = "@active-price-list/v1/company-session";

export async function loadApiSession(): Promise<ApiSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApiSession;
    if (!parsed?.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveApiSession(session: ApiSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearApiSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
