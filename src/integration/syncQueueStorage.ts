import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SyncQueueItem } from "./types";

const QUEUE_KEY = "@active-price-list/v1/integration-sync-queue";

function queueId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function loadSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as SyncQueueItem[];
  } catch {
    return [];
  }
}

export async function saveSyncQueue(items: SyncQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueueSyncItem(
  item: Omit<SyncQueueItem, "localId">
): Promise<string> {
  const id = queueId();
  const queue = await loadSyncQueue();
  queue.push({ ...item, localId: id });
  await saveSyncQueue(queue);
  return id;
}

export async function removeSyncItem(localId: string): Promise<void> {
  const queue = await loadSyncQueue();
  const next = queue.filter((item) => item.localId !== localId);
  await saveSyncQueue(next);
}
