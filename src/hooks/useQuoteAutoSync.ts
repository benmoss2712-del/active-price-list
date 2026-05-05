import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { flushQuoteSyncQueue, hasRealIntegrationConfig } from "../integration";

const AUTO_SYNC_INTERVAL_MS = 20_000;

export function useQuoteAutoSync(): void {
  const flushingRef = useRef(false);

  useEffect(() => {
    if (!hasRealIntegrationConfig()) return;

    const flushSafely = async () => {
      if (flushingRef.current) return;
      flushingRef.current = true;
      try {
        await flushQuoteSyncQueue();
      } finally {
        flushingRef.current = false;
      }
    };

    void flushSafely();

    const intervalId = setInterval(() => {
      void flushSafely();
    }, AUTO_SYNC_INTERVAL_MS);

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          void flushSafely();
        }
      }
    );

    return () => {
      clearInterval(intervalId);
      appStateSubscription.remove();
    };
  }, []);
}
