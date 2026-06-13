import { useEffect, useMemo, useRef } from "react";
import { useCartUiStore } from "../store/cartUiStore";
import { CART_SCREEN_BACKEND_MODE } from "./config";
import {
  addCartoItem,
  buildWaitingSnapshot,
  checkoutCarto,
  closeCartoSession,
  getCartQrCode,
  removeCartoItem,
  resetMockOnlineSession
} from "./cartoApi";
import {
  cancelLocalGuestCheckout,
  confirmLocalGuestPayment,
  removeLocalProduct,
  resetLocalGuestSession,
  retryLocalGuestPayment,
  addLocalProduct,
  startLocalGuestCheckout,
  startLocalGuestSession
} from "./localCartActions";
import { useCartoActiveSession } from "./useCartoActiveSession";
import { useBackendHealth } from "./useBackendHealth";
import { useCartSocket } from "./useCartSocket";

type RuntimeActions = {
  cancelCheckout: () => Promise<void>;
  confirmPayment: () => Promise<void>;
  refreshQr: () => Promise<void>;
  retryListStatus: () => Promise<void>;
  removeItem: (productId: string, quantity?: number) => Promise<void>;
  resetSession: () => Promise<void>;
  retryPayment: () => Promise<void>;
  startCheckout: () => Promise<void>;
  startShopping: () => Promise<void>;
  syncAddedItem: (productId: string, quantity?: number) => Promise<void>;
};

export function useCartRuntime(): RuntimeActions {
  const backendMode = CART_SCREEN_BACKEND_MODE;
  const edgeSocket = useCartSocket(backendMode === "edge");
  const edgeHealth = useBackendHealth(backendMode === "edge");
  const snapshot = useCartUiStore((state) => state.snapshot);
  const sessionControlMode = useCartUiStore((state) => state.sessionControlMode);
  const setBackendStatus = useCartUiStore((state) => state.setBackendStatus);
  const setConnected = useCartUiStore((state) => state.setConnected);
  const setListStatus = useCartUiStore((state) => state.setListStatus);
  const setSessionControlMode = useCartUiStore((state) => state.setSessionControlMode);
  const setSnapshot = useCartUiStore((state) => state.setSnapshot);
  const setIntegrationMode = useCartUiStore((state) => state.setIntegrationMode);
  const requestActiveSessionRefresh = useCartUiStore((state) => state.requestActiveSessionRefresh);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    setIntegrationMode(backendMode === "carto" ? "online-api" : "local-edge");
  }, [backendMode, setIntegrationMode]);

  useCartoActiveSession(backendMode === "carto");

  useEffect(() => {
    if (backendMode !== "edge") return;

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
  }, [backendMode, edgeHealth.status, setBackendStatus, setSessionControlMode, snapshot]);

  return useMemo<RuntimeActions>(() => {
    if (backendMode === "edge") {
      return {
        cancelCheckout: async () => edgeSocket.cancelCheckout(),
        confirmPayment: async () => edgeSocket.confirmPayment(),
        refreshQr: async () => undefined,
        retryListStatus: async () => undefined,
        removeItem: async () => undefined,
        resetSession: async () => edgeSocket.resetSession(),
        retryPayment: async () => edgeSocket.retryPayment(),
        startCheckout: async () => edgeSocket.startCheckout(),
        startShopping: async () => edgeSocket.startShopping(),
        syncAddedItem: async () => undefined
      };
    }

    const isLocalGuest = sessionControlMode === "local_guest";

    return {
      cancelCheckout: async () => {
        if (!isLocalGuest) {
          throw new Error("Cancel checkout is only available in local guest mode right now.");
        }
        cancelLocalGuestCheckout();
      },
      confirmPayment: async () => {
        if (!isLocalGuest) {
          throw new Error("Payment confirmation is only available in local guest mode right now.");
        }
        confirmLocalGuestPayment();
      },
      refreshQr: async () => {
        if (isLocalGuest) {
          return;
        }

        const cartCode = snapshotRef.current?.pairing?.cartId || snapshotRef.current?.cartId;
        if (!cartCode) {
          throw new Error("Cart code is missing. Unable to refresh QR.");
        }

        const effectiveCartCode = cartCode || "cart-01";
        setConnected(true);
        setBackendStatus("waiting");
        setListStatus("refreshing_qr", 0);
        setSessionControlMode("full");
        setSnapshot(buildWaitingSnapshot(effectiveCartCode));

        const qrData = await getCartQrCode(effectiveCartCode);
        setSnapshot(buildWaitingSnapshot(effectiveCartCode, qrData));
      },
      retryListStatus: async () => {
        if (isLocalGuest) {
          return;
        }

        setListStatus("checking", 0);
        requestActiveSessionRefresh();
      },
      removeItem: async (productId, quantity = 1) => {
        if (isLocalGuest) {
          for (let index = 0; index < quantity; index += 1) {
            removeLocalProduct(productId);
          }
          return;
        }

        const hasBackendSession = Boolean(snapshotRef.current?.sessionId && snapshotRef.current?.state !== "WAITING_FOR_LIST");
        if (!hasBackendSession) {
          throw new Error("No active backend session is available for cart updates.");
        }

        const snapshot = await removeCartoItem({
          productId,
          quantity
        }, snapshotRef.current);

        setConnected(true);
        setBackendStatus("active");
        setSessionControlMode("full");
        setSnapshot(snapshot);
      },
      resetSession: async () => {
        if (isLocalGuest) {
          resetLocalGuestSession();
          setConnected(true);
          setBackendStatus("connected");
          setListStatus("waiting", 0);
          return;
        }

        const hasBackendSession = Boolean(snapshotRef.current?.sessionId && snapshotRef.current?.state !== "WAITING_FOR_LIST");
        let waitingSnapshot = hasBackendSession
          ? await closeCartoSession()
          : buildWaitingSnapshot(snapshotRef.current?.cartId);

        if (!hasBackendSession) {
          const effectiveCartCode = snapshotRef.current?.pairing?.cartId || snapshotRef.current?.cartId;
          if (effectiveCartCode) {
            const qrData = await getCartQrCode(effectiveCartCode);
            waitingSnapshot = buildWaitingSnapshot(effectiveCartCode, qrData);
          }
        }

        resetMockOnlineSession();
        setConnected(true);
        setBackendStatus("waiting");
        setListStatus("waiting", 0);
        setSessionControlMode("full");
        setSnapshot(waitingSnapshot);
      },
      retryPayment: async () => {
        if (!isLocalGuest) {
          throw new Error("Retry payment is only available in local guest mode right now.");
        }
        retryLocalGuestPayment();
      },
      startCheckout: async () => {
        if (isLocalGuest) {
          startLocalGuestCheckout();
          return;
        }

        const hasBackendSession = Boolean(snapshotRef.current?.sessionId && snapshotRef.current?.state !== "WAITING_FOR_LIST");
        if (!hasBackendSession) {
          throw new Error("No active backend session is available for checkout.");
        }

        const snapshot = await checkoutCarto(snapshotRef.current);
        setConnected(true);
        setBackendStatus("active");
        setSessionControlMode("full");
        setSnapshot(snapshot);
      },
      startShopping: async () => {
        startLocalGuestSession();
      },
      syncAddedItem: async (productId, quantity = 1) => {
        if (isLocalGuest) {
          for (let index = 0; index < quantity; index += 1) {
            addLocalProduct(productId);
          }
          return;
        }

        const hasBackendSession = Boolean(snapshotRef.current?.sessionId && snapshotRef.current?.state !== "WAITING_FOR_LIST");
        if (!hasBackendSession) {
          throw new Error("No active backend session is available for cart updates.");
        }

        const snapshot = await addCartoItem({
          productId,
          quantity
        }, snapshotRef.current);

        setConnected(true);
        setBackendStatus("active");
        setSessionControlMode("full");
        setSnapshot(snapshot);
      }
    };
  }, [backendMode, edgeSocket, requestActiveSessionRefresh, sessionControlMode, setBackendStatus, setConnected, setListStatus, setSessionControlMode, setSnapshot]);
}
