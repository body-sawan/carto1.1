import { useEffect, useMemo, useRef, useState } from "react";
import { useCartUiStore } from "../store/cartUiStore";
import { CART_SCREEN_BACKEND_MODE } from "./config";
import { buildWaitingSnapshot, fetchCartoActiveSession, fetchCartoQr, mapActiveSessionToSnapshot } from "./cartoApi";
import {
  READ_ONLY_SESSION_MESSAGE,
  cancelLocalGuestCheckout,
  confirmLocalGuestPayment,
  resetLocalGuestSession,
  retryLocalGuestPayment,
  startLocalGuestCheckout,
  startLocalGuestSession
} from "./localCartActions";
import { useBackendHealth } from "./useBackendHealth";
import { useCartSocket } from "./useCartSocket";

type RuntimeActions = {
  cancelCheckout: () => void;
  confirmPayment: () => void;
  resetSession: () => void;
  retryPayment: () => void;
  startCheckout: () => void;
  startShopping: () => void;
};

export function useCartRuntime(): RuntimeActions {
  const mode = CART_SCREEN_BACKEND_MODE;
  const edgeSocket = useCartSocket(mode === "edge");
  const edgeHealth = useBackendHealth(mode === "edge");
  const snapshot = useCartUiStore((state) => state.snapshot);
  const sessionControlMode = useCartUiStore((state) => state.sessionControlMode);
  const setBackendStatus = useCartUiStore((state) => state.setBackendStatus);
  const setConnected = useCartUiStore((state) => state.setConnected);
  const setSessionControlMode = useCartUiStore((state) => state.setSessionControlMode);
  const setSnapshot = useCartUiStore((state) => state.setSnapshot);
  const setTransportMode = useCartUiStore((state) => state.setTransportMode);
  const [qrRefreshNonce, setQrRefreshNonce] = useState(0);
  const qrRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    setTransportMode(mode);
  }, [mode, setTransportMode]);

  useEffect(() => {
    if (mode !== "edge") return;

    setSessionControlMode("full");
    setBackendStatus(
      edgeHealth.status === "online"
        ? "connected"
        : edgeHealth.status === "offline"
          ? "offline"
          : "checking"
    );
  }, [edgeHealth.status, mode, setBackendStatus, setSessionControlMode]);

  useEffect(() => {
    if (mode !== "carto") {
      if (qrRefreshTimerRef.current) {
        clearTimeout(qrRefreshTimerRef.current);
        qrRefreshTimerRef.current = null;
      }
      return undefined;
    }

    if (sessionControlMode === "local_guest") {
      setConnected(true);
      setBackendStatus("connected");
      return undefined;
    }

    let mounted = true;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadQrSnapshot(signal?: AbortSignal) {
      const qr = await fetchCartoQr(signal);
      if (!mounted) return;

      setSnapshot(buildWaitingSnapshot(qr));
      setConnected(true);
      setSessionControlMode("full");
      setBackendStatus("waiting");
      scheduleQrRefresh(qr.expiresAt);
    }

    async function poll() {
      const controller = new AbortController();

      try {
        const activeSession = await fetchCartoActiveSession(controller.signal);
        if (!mounted) return;

        if (!activeSession.active) {
          await loadQrSnapshot(controller.signal);
        } else {
          if (qrRefreshTimerRef.current) {
            clearTimeout(qrRefreshTimerRef.current);
            qrRefreshTimerRef.current = null;
          }
          setSnapshot(mapActiveSessionToSnapshot(activeSession, snapshotRef.current));
          setConnected(true);
          setSessionControlMode("read_only");
          setBackendStatus("active");
        }
      } catch {
        if (!mounted) return;
        setConnected(false);
        setBackendStatus("offline");
      } finally {
        if (mounted) {
          pollTimer = setTimeout(poll, 2500);
        }
      }
    }

    void poll();

    return () => {
      mounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [
    mode,
    qrRefreshNonce,
    sessionControlMode,
    setBackendStatus,
    setConnected,
    setSessionControlMode,
    setSnapshot,
  ]);

  const actions = useMemo<RuntimeActions>(() => {
    if (mode === "edge") {
      return {
        cancelCheckout: () => edgeSocket.cancelCheckout(),
        confirmPayment: () => edgeSocket.confirmPayment(),
        resetSession: () => edgeSocket.resetSession(),
        retryPayment: () => edgeSocket.retryPayment(),
        startCheckout: () => edgeSocket.startCheckout(),
        startShopping: () => edgeSocket.startShopping()
      };
    }

    return {
      cancelCheckout: () => {
        if (sessionControlMode === "local_guest") {
          cancelLocalGuestCheckout();
          return;
        }
        throw new Error(READ_ONLY_SESSION_MESSAGE);
      },
      confirmPayment: () => {
        if (sessionControlMode === "local_guest") {
          confirmLocalGuestPayment();
          return;
        }
        throw new Error(READ_ONLY_SESSION_MESSAGE);
      },
      resetSession: () => {
        if (sessionControlMode === "local_guest") {
          resetLocalGuestSession();
          return;
        }
        throw new Error(READ_ONLY_SESSION_MESSAGE);
      },
      retryPayment: () => {
        if (sessionControlMode === "local_guest") {
          retryLocalGuestPayment();
          return;
        }
        throw new Error(READ_ONLY_SESSION_MESSAGE);
      },
      startCheckout: () => {
        if (sessionControlMode === "local_guest") {
          startLocalGuestCheckout();
          return;
        }
        throw new Error(READ_ONLY_SESSION_MESSAGE);
      },
      startShopping: () => {
        startLocalGuestSession();
      }
    };
  }, [edgeSocket, mode, sessionControlMode]);

  return actions;

  function scheduleQrRefresh(expiresAt?: string) {
    if (qrRefreshTimerRef.current) {
      clearTimeout(qrRefreshTimerRef.current);
      qrRefreshTimerRef.current = null;
    }

    if (!expiresAt) return;

    const refreshInMs = Math.max(1000, new Date(expiresAt).getTime() - Date.now() + 1000);
    qrRefreshTimerRef.current = setTimeout(() => {
      setQrRefreshNonce((current) => current + 1);
    }, refreshInMs);
  }
}
