import type { CartSnapshot } from "@carto/shared";
import { useEffect, useRef } from "react";
import { useCartUiStore } from "../store/cartUiStore";
import { CART_CODE } from "./config";
import { buildWaitingSnapshot, getActiveSession, getCartQrCode, getCartoErrorKind, mapActiveSessionToSnapshot } from "./cartoApi";

const WAITING_POLL_INTERVAL_MS = 2000;
const ACTIVE_POLL_INTERVAL_MS = 2000;
const ERROR_RETRY_INTERVAL_MS = 2000;
const QR_REFRESH_FALLBACK_INTERVAL_MS = 45000;
const QR_REFRESH_EARLY_BUFFER_MS = 10000;
const OFFLINE_THRESHOLD = 2;

export function useCartoActiveSession(enabled: boolean) {
  const activeSessionRefreshKey = useCartUiStore((state) => state.activeSessionRefreshKey);
  const sessionControlMode = useCartUiStore((state) => state.sessionControlMode);
  const setBackendStatus = useCartUiStore((state) => state.setBackendStatus);
  const setConnected = useCartUiStore((state) => state.setConnected);
  const setListStatus = useCartUiStore((state) => state.setListStatus);
  const setSessionControlMode = useCartUiStore((state) => state.setSessionControlMode);
  const setSnapshot = useCartUiStore((state) => state.setSnapshot);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<(() => Promise<void>) | null>(null);
  const qrRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const qrFetchInFlightRef = useRef(false);
  const mountedRef = useRef(false);
  const pollStartedRef = useRef(false);
  const consecutiveNetworkFailuresRef = useRef(0);
  const activeRequestControllerRef = useRef<AbortController | null>(null);
  const qrRequestControllerRef = useRef<AbortController | null>(null);

  function clearPollTimer() {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  function clearQrRefreshTimer() {
    if (qrRefreshTimerRef.current) {
      clearTimeout(qrRefreshTimerRef.current);
      qrRefreshTimerRef.current = null;
    }
  }

  function cancelQrRequest() {
    qrRequestControllerRef.current?.abort();
    qrRequestControllerRef.current = null;
  }

  function scheduleQrRefresh(snapshot: CartSnapshot | null, lastUpdateAt: string | null, cartCode: string) {
    clearQrRefreshTimer();

    if (!mountedRef.current || !cartCode) {
      return;
    }

    const delay = getQrRefreshDelay(snapshot, lastUpdateAt);
    qrRefreshTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) {
        return;
      }
      void ensureWaitingSnapshot(useCartUiStore.getState().snapshot, cartCode, true);
    }, delay);
  }

  function scheduleQrRetry(cartCode: string) {
    clearQrRefreshTimer();

    if (!mountedRef.current || !cartCode) {
      return;
    }

    qrRefreshTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) {
        return;
      }
      void ensureWaitingSnapshot(useCartUiStore.getState().snapshot, cartCode, true);
    }, ERROR_RETRY_INTERVAL_MS);
  }

  async function ensureWaitingSnapshot(snapshot: CartSnapshot | null, cartCode = CART_CODE, force = false) {
    const state = useCartUiStore.getState();
    const latestSnapshot = state.snapshot ?? snapshot;
    const effectiveCartCode = cartCode || latestSnapshot?.pairing?.cartId || latestSnapshot?.cartId || CART_CODE;

    if (isSessionActive(latestSnapshot)) {
      clearQrRefreshTimer();
      return;
    }

    if (!force && !shouldRefreshWaitingSnapshot(latestSnapshot, state.lastUpdateAt)) {
      scheduleQrRefresh(latestSnapshot, state.lastUpdateAt, effectiveCartCode);
      return;
    }

    if (!effectiveCartCode || qrFetchInFlightRef.current) {
      return;
    }

    qrFetchInFlightRef.current = true;
    clearQrRefreshTimer();

    const controller = new AbortController();
    qrRequestControllerRef.current = controller;

    setListStatus(force ? "refreshing_qr" : "fetching_qr", 0);
    setSnapshot(buildWaitingSnapshot(effectiveCartCode));

    try {
      const qrData = await getCartQrCode(effectiveCartCode, controller.signal);
      if (!mountedRef.current || isSessionActive(useCartUiStore.getState().snapshot)) {
        return;
      }

      const waitingSnapshot = buildWaitingSnapshot(effectiveCartCode, qrData);
      setListStatus("waiting", 0);
      setSnapshot(waitingSnapshot);
      scheduleQrRefresh(waitingSnapshot, new Date().toISOString(), effectiveCartCode);
    } catch (error) {
      if (!mountedRef.current || isSessionActive(useCartUiStore.getState().snapshot)) {
        return;
      }

      const errorKind = getCartoErrorKind(error);
      setListStatus(
        errorKind === "auth"
          ? "auth_error"
          : errorKind === "cart_not_found"
            ? "cart_not_found"
            : errorKind === "cors"
              ? "cors_error"
            : errorKind === "network"
              ? "offline"
              : "failed",
        0
      );
      setSnapshot(buildWaitingSnapshot(effectiveCartCode));
      scheduleQrRetry(effectiveCartCode);
    } finally {
      if (qrRequestControllerRef.current === controller) {
        qrRequestControllerRef.current = null;
      }
      qrFetchInFlightRef.current = false;
    }
  }

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    if (sessionControlMode === "local_guest") {
      setConnected(true);
      setBackendStatus("connected");
      setListStatus("waiting", 0);
      return undefined;
    }

    mountedRef.current = true;
    pollStartedRef.current = false;

    function scheduleNextPoll(delay: number) {
      clearPollTimer();
      if (!mountedRef.current) {
        return;
      }

      pollTimerRef.current = setTimeout(() => {
        void poll();
      }, delay);
    }

    async function poll() {
      if (!mountedRef.current || inFlightRef.current) {
        return;
      }

      if (!pollStartedRef.current) {
        setListStatus("checking", 0);
        pollStartedRef.current = true;
      }

      inFlightRef.current = true;
      const controller = new AbortController();
      activeRequestControllerRef.current = controller;
      let nextPollDelay = ERROR_RETRY_INTERVAL_MS;

      try {
        const result = await getActiveSession(undefined, undefined, controller.signal);
        if (!mountedRef.current) {
          return;
        }

        const latestSnapshot = useCartUiStore.getState().snapshot;
        const hasActiveSession = isSessionActive(latestSnapshot);

        if (!result.ok) {
          const nextFailureCount = result.errorKind === "network"
            ? consecutiveNetworkFailuresRef.current + 1
            : 0;
          consecutiveNetworkFailuresRef.current = nextFailureCount;

          setConnected(true);
          setBackendStatus(result.errorKind === "network" ? "offline" : "checking");
          setSessionControlMode("full");
          if (!hasShoppingListSnapshot(latestSnapshot)) {
            setListStatus(
              result.errorKind === "auth"
                ? "auth_error"
                : result.errorKind === "cart_not_found"
                  ? "cart_not_found"
                  : result.errorKind === "cors"
                    ? "cors_error"
                  : result.errorKind === "network"
                    ? (nextFailureCount >= OFFLINE_THRESHOLD ? "offline" : "failed")
                    : "failed",
              0
            );
          }
          if (!hasActiveSession) {
            await ensureWaitingSnapshot(latestSnapshot, result.data.cartCode);
          }
          nextPollDelay = ERROR_RETRY_INTERVAL_MS;
        } else if (result.data.status === "waiting") {
          consecutiveNetworkFailuresRef.current = 0;
          setConnected(true);
          setBackendStatus("waiting");
          setSessionControlMode("full");
          setListStatus("waiting", 0);
          await ensureWaitingSnapshot(latestSnapshot, result.data.cartCode, hasActiveSession);
          nextPollDelay = WAITING_POLL_INTERVAL_MS;
        } else {
          const listContainer = result.data.shoppingList ?? result.data.list ?? null;
          if (!listContainer) {
            consecutiveNetworkFailuresRef.current = 0;
            setConnected(true);
            setBackendStatus("offline");
            setSessionControlMode("full");
            if (!hasShoppingListSnapshot(latestSnapshot)) {
              setListStatus("failed", 0);
            }
            if (!hasActiveSession) {
              await ensureWaitingSnapshot(latestSnapshot, result.data.cartCode, true);
            }
            nextPollDelay = ERROR_RETRY_INTERVAL_MS;
            return;
          }

          consecutiveNetworkFailuresRef.current = 0;
          const receivedItemCount = Array.isArray(listContainer.items) ? listContainer.items.length : 0;
          setConnected(true);
          setBackendStatus("active");
          setSessionControlMode("full");
          setListStatus("received", receivedItemCount);
          clearQrRefreshTimer();
          cancelQrRequest();
          setSnapshot(mapActiveSessionToSnapshot(result.data, latestSnapshot));
          nextPollDelay = ACTIVE_POLL_INTERVAL_MS;
        }
      } finally {
        activeRequestControllerRef.current = null;
        inFlightRef.current = false;
        if (mountedRef.current) {
          scheduleNextPoll(nextPollDelay);
        }
      }
    }

    pollRef.current = poll;
    void poll();

    return () => {
      mountedRef.current = false;
      pollRef.current = null;
      activeRequestControllerRef.current?.abort();
      activeRequestControllerRef.current = null;
      cancelQrRequest();
      inFlightRef.current = false;
      qrFetchInFlightRef.current = false;
      clearPollTimer();
      clearQrRefreshTimer();
    };
  }, [enabled, sessionControlMode, setBackendStatus, setConnected, setListStatus, setSessionControlMode, setSnapshot]);

  useEffect(() => {
    if (!enabled || activeSessionRefreshKey === 0 || !mountedRef.current) {
      return;
    }

    clearPollTimer();
    pollStartedRef.current = false;
    void pollRef.current?.();
  }, [activeSessionRefreshKey, enabled]);
}

function isSessionActive(snapshot: CartSnapshot | null | undefined) {
  return Boolean(snapshot?.sessionId && snapshot.state !== "WAITING_FOR_LIST" && snapshot.state !== "SESSION_CLOSED");
}

function hasShoppingListSnapshot(snapshot: CartSnapshot | null | undefined) {
  return isSessionActive(snapshot);
}

function shouldRefreshWaitingSnapshot(snapshot: CartSnapshot | null | undefined, lastUpdateAt: string | null) {
  if (!snapshot || snapshot.state !== "WAITING_FOR_LIST") {
    return true;
  }

  if (!snapshot.pairing?.qrPayload) {
    return true;
  }

  const expiresAtMs = parseTimestamp(snapshot.pairing.expiresAt);
  if (expiresAtMs !== null) {
    return expiresAtMs - Date.now() <= QR_REFRESH_EARLY_BUFFER_MS;
  }

  const updatedAtMs = parseTimestamp(lastUpdateAt);
  if (updatedAtMs === null) {
    return true;
  }

  return Date.now() - updatedAtMs >= QR_REFRESH_FALLBACK_INTERVAL_MS;
}

function getQrRefreshDelay(snapshot: CartSnapshot | null, lastUpdateAt: string | null) {
  const expiresAtMs = parseTimestamp(snapshot?.pairing?.expiresAt);
  if (expiresAtMs !== null) {
    return Math.max(0, expiresAtMs - Date.now() - QR_REFRESH_EARLY_BUFFER_MS);
  }

  const updatedAtMs = parseTimestamp(lastUpdateAt);
  if (updatedAtMs !== null) {
    return Math.max(0, updatedAtMs + QR_REFRESH_FALLBACK_INTERVAL_MS - Date.now());
  }

  return QR_REFRESH_FALLBACK_INTERVAL_MS;
}

function parseTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}
