import { useEffect, useMemo, useRef } from "react";
import { useCartUiStore } from "../store/cartUiStore";
import { CARTO_INTEGRATION_MODE } from "./config";
import {
  addCartItem,
  buildWaitingSnapshot,
  checkoutCart,
  closeCartSession,
  getActiveSession,
  removeCartItem,
  mapActiveSessionToSnapshot,
  resetMockOnlineSession
} from "./cartoApi";
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
  removeItem: (productId: string, quantity?: number) => void;
  resetSession: () => void;
  retryPayment: () => void;
  startCheckout: () => void;
  startShopping: () => void;
  syncAddedItem: (productId: string, quantity?: number) => void;
};

export function useCartRuntime(): RuntimeActions {
  const mode = CARTO_INTEGRATION_MODE;
  const edgeSocket = useCartSocket(mode === "local-edge");
  const edgeHealth = useBackendHealth(mode === "local-edge");
  const snapshot = useCartUiStore((state) => state.snapshot);
  const sessionControlMode = useCartUiStore((state) => state.sessionControlMode);
  const setBackendStatus = useCartUiStore((state) => state.setBackendStatus);
  const setConnected = useCartUiStore((state) => state.setConnected);
  const setSessionControlMode = useCartUiStore((state) => state.setSessionControlMode);
  const setSnapshot = useCartUiStore((state) => state.setSnapshot);
  const setIntegrationMode = useCartUiStore((state) => state.setIntegrationMode);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    setIntegrationMode(mode);
  }, [mode, setIntegrationMode]);

  useEffect(() => {
    if (mode !== "local-edge") return;

    setSessionControlMode("full");
    setBackendStatus(
      edgeHealth.status === "offline"
        ? "offline"
        : snapshot?.state === "WAITING_FOR_LIST"
          ? "waiting"
          : snapshot
            ? "active"
            : "connected"
    );
  }, [edgeHealth.status, mode, setBackendStatus, setSessionControlMode, snapshot]);

  useEffect(() => {
    if (mode === "local-edge") {
      return undefined;
    }

    if (sessionControlMode === "local_guest") {
      setConnected(true);
      setBackendStatus("connected");
      return undefined;
    }

    let mounted = true;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    setSnapshot(buildWaitingSnapshot());

    async function poll() {
      const controller = new AbortController();
      const result = await getActiveSession(undefined, undefined, controller.signal);
      if (!mounted) return;

      if (!result.ok) {
        setConnected(false);
        setBackendStatus("offline");
      } else if (result.data.status === "waiting") {
        setConnected(true);
        setSessionControlMode("full");
        setSnapshot(buildWaitingSnapshot(result.data.cartCode));
        setBackendStatus("waiting");
      } else {
        setConnected(true);
        setSessionControlMode(mode === "online-api" ? "read_only" : "full");
        setSnapshot(mapActiveSessionToSnapshot(result.data, snapshotRef.current));
        setBackendStatus("active");
      }

      if (mounted && !(result.ok && result.data.status === "active")) {
        pollTimer = setTimeout(poll, 2500);
      }
    }

    void poll();

    return () => {
      mounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [mode, sessionControlMode, setBackendStatus, setConnected, setSessionControlMode, setSnapshot]);

  return useMemo<RuntimeActions>(() => {
    if (mode === "local-edge") {
      return {
        cancelCheckout: () => edgeSocket.cancelCheckout(),
        confirmPayment: () => edgeSocket.confirmPayment(),
        removeItem: () => undefined,
        resetSession: () => edgeSocket.resetSession(),
        retryPayment: () => edgeSocket.retryPayment(),
        startCheckout: () => edgeSocket.startCheckout(),
        startShopping: () => edgeSocket.startShopping(),
        syncAddedItem: () => undefined
      };
    }

    const canWrite = mode === "mock-online" || sessionControlMode === "local_guest";

    return {
      cancelCheckout: () => {
        assertWritable(canWrite);
        cancelLocalGuestCheckout();
      },
      confirmPayment: () => {
        assertWritable(canWrite);
        confirmLocalGuestPayment();
      },
      removeItem: (productId, quantity = 1) => {
        if (mode === "online-api") {
          void removeCartItem(undefined, undefined, {
            cartSessionId: snapshotRef.current?.activeListId ?? null,
            productId,
            quantity,
            receiptId: snapshotRef.current?.payment.transactionId ?? null,
            sessionId: snapshotRef.current?.sessionId ?? null
          });
        }
      },
      resetSession: () => {
        assertWritable(canWrite);
        if (mode === "online-api") {
          void closeCartSession(undefined, undefined, {
            cartSessionId: snapshotRef.current?.activeListId ?? null,
            receiptId: snapshotRef.current?.payment.transactionId ?? null,
            sessionId: snapshotRef.current?.sessionId ?? null
          });
        }
        resetLocalGuestSession();
        resetMockOnlineSession();
      },
      retryPayment: () => {
        assertWritable(canWrite);
        retryLocalGuestPayment();
      },
      startCheckout: () => {
        assertWritable(canWrite);
        startLocalGuestCheckout();
        if (mode === "online-api") {
          void checkoutCart(undefined, undefined, {
            cartSessionId: snapshotRef.current?.activeListId ?? null,
            receiptId: snapshotRef.current?.payment.transactionId ?? null,
            sessionId: snapshotRef.current?.sessionId ?? null
          });
        }
      },
      startShopping: () => {
        startLocalGuestSession();
      },
      syncAddedItem: (productId, quantity = 1) => {
        if (mode === "online-api") {
          void addCartItem(undefined, undefined, {
            cartSessionId: snapshotRef.current?.activeListId ?? null,
            productId,
            quantity,
            receiptId: snapshotRef.current?.payment.transactionId ?? null,
            sessionId: snapshotRef.current?.sessionId ?? null
          });
        }
      }
    };
  }, [edgeSocket, mode, sessionControlMode]);
}

function assertWritable(canWrite: boolean) {
  if (!canWrite) {
    throw new Error(READ_ONLY_SESSION_MESSAGE);
  }
}
