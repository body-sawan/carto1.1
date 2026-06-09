import type { CartSnapshot } from "@carto/shared";
import { useEffect, useRef } from "react";
import { useCartUiStore } from "../store/cartUiStore";
import { CART_CODE } from "./config";
import { buildWaitingSnapshot, fetchCartoQr, getActiveSession, mapActiveSessionToSnapshot } from "./cartoApi";

const WAITING_POLL_INTERVAL_MS = 2000;
const ACTIVE_POLL_INTERVAL_MS = 5000;
const ERROR_RETRY_INTERVAL_MS = 5000;

export function useCartoActiveSession(enabled: boolean) {
  const sessionControlMode = useCartUiStore((state) => state.sessionControlMode);
  const setBackendStatus = useCartUiStore((state) => state.setBackendStatus);
  const setConnected = useCartUiStore((state) => state.setConnected);
  const setSessionControlMode = useCartUiStore((state) => state.setSessionControlMode);
  const setSnapshot = useCartUiStore((state) => state.setSnapshot);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const activeRequestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const currentSnapshot = useCartUiStore.getState().snapshot;

    if (sessionControlMode === "local_guest") {
      setConnected(true);
      setBackendStatus("connected");
      return undefined;
    }

    let mounted = true;

    function clearPollTimer() {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }

    function scheduleNextPoll(delay: number) {
      clearPollTimer();
      if (!mounted) {
        return;
      }

      pollTimerRef.current = setTimeout(() => {
        void poll();
      }, delay);
    }

    void ensureWaitingSnapshot(currentSnapshot);

    async function poll() {
      if (!mounted || inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;
      const controller = new AbortController();
      activeRequestControllerRef.current = controller;
      let nextPollDelay = ERROR_RETRY_INTERVAL_MS;

      try {
        const result = await getActiveSession(undefined, undefined, controller.signal);
        if (!mounted) {
          return;
        }

        const latestSnapshot = useCartUiStore.getState().snapshot;
        const hasActiveSession = isSessionActive(latestSnapshot);

        if (!result.ok) {
          setConnected(true);
          setBackendStatus("offline");
          setSessionControlMode("full");
          if (!hasActiveSession) {
            await ensureWaitingSnapshot(latestSnapshot, result.data.cartCode);
          }
          nextPollDelay = ERROR_RETRY_INTERVAL_MS;
        } else if (result.data.status === "waiting") {
          setConnected(true);
          setBackendStatus("waiting");
          setSessionControlMode("full");
          await ensureWaitingSnapshot(latestSnapshot, result.data.cartCode, hasActiveSession);
          nextPollDelay = WAITING_POLL_INTERVAL_MS;
        } else {
          setConnected(true);
          setBackendStatus("active");
          setSessionControlMode("full");
          setSnapshot(mapActiveSessionToSnapshot(result.data, latestSnapshot));
          nextPollDelay = ACTIVE_POLL_INTERVAL_MS;
        }
      } finally {
        activeRequestControllerRef.current = null;
        inFlightRef.current = false;
        if (mounted) {
          scheduleNextPoll(nextPollDelay);
        }
      }
    }

    void poll();

    return () => {
      mounted = false;
      activeRequestControllerRef.current?.abort();
      activeRequestControllerRef.current = null;
      inFlightRef.current = false;
      clearPollTimer();
    };
  }, [enabled, sessionControlMode, setBackendStatus, setConnected, setSessionControlMode, setSnapshot]);

  async function ensureWaitingSnapshot(snapshot: CartSnapshot | null, cartCode = CART_CODE, force = false) {
    const latestSnapshot = useCartUiStore.getState().snapshot ?? snapshot;

    if (!force && isSessionActive(latestSnapshot)) {
      return;
    }

    if (!force && latestSnapshot?.state === "WAITING_FOR_LIST" && latestSnapshot.pairing?.qrPayload) {
      return;
    }

    try {
      const qrData = await fetchCartoQr(cartCode);
      if (!force && isSessionActive(useCartUiStore.getState().snapshot)) {
        return;
      }
      setSnapshot(buildWaitingSnapshot(cartCode, qrData));
    } catch {
      if (!force && isSessionActive(useCartUiStore.getState().snapshot)) {
        return;
      }
      setSnapshot(buildWaitingSnapshot(cartCode));
    }
  }
}

function isSessionActive(snapshot: CartSnapshot | null | undefined) {
  return Boolean(snapshot?.sessionId && snapshot.state !== "WAITING_FOR_LIST" && snapshot.state !== "SESSION_CLOSED");
}
