import { useEffect, useMemo, useRef } from "react";
import { useCartUiStore } from "../store/cartUiStore";
import { CART_CODE, CART_SCREEN_BACKEND_MODE, IS_DEV } from "./config";
import {
  addCartoItem,
  applyPaymentSessionToSnapshot,
  buildWaitingSnapshot,
  disconnectCartoSession,
  getCartQrCode,
  requestCartoPaymentQr,
  removeCartoItem,
  resetMockOnlineSession
} from "./cartoApi";
import type { CartoPaymentQrItemPayload } from "./cartoApi";
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
import { useCartoPaymentStatus } from "./useCartoPaymentStatus";
import { useBackendHealth } from "./useBackendHealth";
import { useCartSocket } from "./useCartSocket";
import { findCatalogProductById } from "./cartCatalog";
import { calculateCartTotals } from "../components/shopperUtils";

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
  const deviceCartItems = useCartUiStore((state) => state.deviceCartItems);
  const snapshot = useCartUiStore((state) => state.snapshot);
  const sessionControlMode = useCartUiStore((state) => state.sessionControlMode);
  const addDeviceCartItem = useCartUiStore((state) => state.addDeviceCartItem);
  const setBackendStatus = useCartUiStore((state) => state.setBackendStatus);
  const clearDeviceCart = useCartUiStore((state) => state.clearDeviceCart);
  const setConnected = useCartUiStore((state) => state.setConnected);
  const clearPaymentSession = useCartUiStore((state) => state.clearPaymentSession);
  const removeDeviceCartItem = useCartUiStore((state) => state.removeDeviceCartItem);
  const setListStatus = useCartUiStore((state) => state.setListStatus);
  const setPaymentSession = useCartUiStore((state) => state.setPaymentSession);
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
  useCartoPaymentStatus(backendMode === "carto");

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
          clearPaymentSession();
          const waitingSnapshot = await disconnectAndBuildWaitingSnapshot(snapshotRef.current);
          setConnected(true);
          setBackendStatus("waiting");
          setListStatus("waiting", 0);
          setSessionControlMode("full");
          clearDeviceCart();
          setSnapshot(waitingSnapshot);
          requestActiveSessionRefresh();
          return;
        }
        cancelLocalGuestCheckout();
      },
      confirmPayment: async () => {
        if (!isLocalGuest) {
          throw new Error("Phone payment is handled by the payment QR on the shopper's device.");
        }
        confirmLocalGuestPayment();
      },
      refreshQr: async () => {
        if (isLocalGuest) {
          return;
        }

        clearPaymentSession();
        const cartCode = snapshotRef.current?.pairing?.cartId || snapshotRef.current?.cartId;
        if (!cartCode) {
          throw new Error("Cart code is missing. Unable to refresh QR.");
        }

        const effectiveCartCode = cartCode || "cart-01";
        setConnected(true);
        setBackendStatus("waiting");
        setListStatus("refreshing_qr", 0);
        setSessionControlMode("full");
        clearDeviceCart();
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
        removeDeviceCartItem(productId, quantity);

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
          clearPaymentSession();
          return;
        }

        clearPaymentSession();
        const hasBackendSession = Boolean(snapshotRef.current?.sessionId && snapshotRef.current?.state !== "WAITING_FOR_LIST");
        let waitingSnapshot = hasBackendSession
          ? await disconnectAndBuildWaitingSnapshot(snapshotRef.current)
          : buildWaitingSnapshot(snapshotRef.current?.cartId);

        if (!hasBackendSession) {
          const effectiveCartCode = snapshotRef.current?.pairing?.cartId || snapshotRef.current?.cartId;
          if (effectiveCartCode) {
            const qrData = await getCartQrCode(effectiveCartCode);
            waitingSnapshot = buildWaitingSnapshot(effectiveCartCode, qrData);
          }
        }

        resetMockOnlineSession();
        clearDeviceCart();
        setConnected(true);
        setBackendStatus("waiting");
        setListStatus("waiting", 0);
        setSessionControlMode("full");
        setSnapshot(waitingSnapshot);
      },
      retryPayment: async () => {
        if (!isLocalGuest) {
          await createBackendPaymentSession();
          return;
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

        if (!deviceCartItems.length) {
          throw new Error("Cart is empty. Scan items before checkout.");
        }

        await createBackendPaymentSession();
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
        syncDeviceCartProduct(productId, quantity);

        setConnected(true);
        setBackendStatus("active");
        setSessionControlMode("full");
        setSnapshot(snapshot);
      }
    };
  }, [
    addDeviceCartItem,
    backendMode,
    clearDeviceCart,
    clearPaymentSession,
    deviceCartItems.length,
    edgeSocket,
    removeDeviceCartItem,
    requestActiveSessionRefresh,
    sessionControlMode,
    setBackendStatus,
    setConnected,
    setListStatus,
    setPaymentSession,
    setSessionControlMode,
    setSnapshot
  ]);

  async function createBackendPaymentSession() {
    const currentSnapshot = snapshotRef.current;
    if (!currentSnapshot?.sessionId || currentSnapshot.state === "WAITING_FOR_LIST") {
      throw new Error("No active backend session is available for payment.");
    }

    const cartCode = currentSnapshot.pairing?.cartId || currentSnapshot.cartId || CART_CODE;
    const paymentRequest = buildPaymentQrRequest(currentSnapshot);
    const amount = paymentRequest.amount;
    const currency = paymentRequest.currency;
    const cartSessionId = paymentRequest.cartSessionId;
    const receiptId = paymentRequest.receiptId;
    const basePaymentSession = {
      amount,
      amountDisplay: undefined,
      cartSessionId: cartSessionId ?? "",
      currency,
      errorMessage: null,
      expiresAt: undefined,
      paymentStatus: "PENDING",
      paymentAttemptId: undefined,
      paymentUrl: "",
      qrValue: "",
      receiptId: receiptId ?? "",
      status: "creating"
    } as const;

    if (IS_DEV) {
      console.log("[payment-qr] endpoint", `/api/carts/${encodeURIComponent(cartCode)}/payment-qr`);
      console.log("[payment-qr] amount", amount);
      console.log("[payment-qr] currency", currency);
      console.log("[payment-qr] localDeviceCartItems count", deviceCartItems.length);
    }

    if (!paymentRequest.items.length) {
      const errorMessage = "Cart is empty. Scan items before checkout.";
      const failedPaymentSession = createFailedPaymentSession(basePaymentSession, errorMessage);
      setPaymentSession(failedPaymentSession);
      setSnapshot(applyPaymentSessionToSnapshot(currentSnapshot, failedPaymentSession));
      throw new Error(errorMessage);
    }

    if (amount <= 0) {
      const errorMessage = "Cart is empty. Scan items before checkout.";
      const failedPaymentSession = createFailedPaymentSession(basePaymentSession, errorMessage);
      setPaymentSession(failedPaymentSession);
      setSnapshot(applyPaymentSessionToSnapshot(currentSnapshot, failedPaymentSession));
      throw new Error(errorMessage);
    }

    if (currency !== "EGP") {
      const errorMessage = "Payment currency must be EGP.";
      const failedPaymentSession = createFailedPaymentSession(basePaymentSession, errorMessage);
      setPaymentSession(failedPaymentSession);
      setSnapshot(applyPaymentSessionToSnapshot(currentSnapshot, failedPaymentSession));
      throw new Error(errorMessage);
    }

    setPaymentSession(basePaymentSession);

    try {
      const paymentQr = await requestCartoPaymentQr({
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        items: paymentRequest.items
      }, cartCode);
      const nextPaymentSession = {
        amount: paymentQr.amount && paymentQr.amount > 0 ? paymentQr.amount : amount,
        amountDisplay: paymentQr.amountDisplay ?? undefined,
        cartSessionId: paymentQr.cartSessionId || cartSessionId || "",
        currency: paymentQr.currency || "EGP",
        errorMessage: null,
        expiresAt: paymentQr.expiresAt ?? undefined,
        paymentStatus: paymentQr.paymentStatus || "PENDING",
        paymentAttemptId: paymentQr.paymentAttemptId ?? undefined,
        paymentUrl: paymentQr.paymentUrl || paymentQr.qrValue || "",
        qrValue: paymentQr.qrValue || paymentQr.paymentUrl || "",
        receiptId: paymentQr.receiptId || receiptId || "",
        status: "pending"
      } as const;

      setPaymentSession(nextPaymentSession);
      setConnected(true);
      setBackendStatus("active");
      setSessionControlMode("full");
      setSnapshot(applyPaymentSessionToSnapshot(currentSnapshot, nextPaymentSession));
    } catch (error) {
      const errorMessage = normalizePaymentQrErrorMessage(error);
      const failedPaymentSession = createFailedPaymentSession(basePaymentSession, errorMessage);
      const runtimeError = error instanceof Error && error.message === errorMessage
        ? error
        : new Error(errorMessage);

      setPaymentSession(failedPaymentSession);
      setSnapshot(applyPaymentSessionToSnapshot(currentSnapshot, failedPaymentSession));
      throw runtimeError;
    }
  }

  async function disconnectAndBuildWaitingSnapshot(currentSnapshot: typeof snapshotRef.current) {
    const effectiveCartCode = currentSnapshot?.pairing?.cartId || currentSnapshot?.cartId;
    if (!effectiveCartCode) {
      throw new Error("Cart code is missing. Unable to close the session.");
    }

    await disconnectCartoSession(effectiveCartCode);

    let qrData = null;
    try {
      qrData = await getCartQrCode(effectiveCartCode);
    } catch {
      qrData = null;
    }

    return buildWaitingSnapshot(effectiveCartCode, qrData);
  }

  function createFailedPaymentSession(
    paymentSession: {
      amount: number;
      amountDisplay?: string;
      cartSessionId: string;
      currency: string;
      errorMessage: null;
      expiresAt?: string;
      paymentStatus: string;
      paymentAttemptId?: string;
      paymentUrl: string;
      qrValue: string;
      receiptId: string;
      status: "creating";
    },
    errorMessage: string
  ) {
    return {
      ...paymentSession,
      errorMessage,
      status: "failed"
    } as const;
  }

  function normalizePaymentQrErrorMessage(error: unknown) {
    const code = readRuntimeErrorCode(error);
    const message = error instanceof Error ? error.message.trim() : "";

    switch (code) {
      case "DEVICE_SECRET_REQUIRED":
      case "INVALID_DEVICE_SECRET":
        return "Device secret is wrong or missing.";
      case "CART_NOT_FOUND":
        return "Cart not found. Check cart code is cart-01.";
      case "NO_ACTIVE_SESSION":
        return "No active cart session is available for payment.";
      case "RECEIPT_NOT_FOUND":
        return "Receipt is not ready yet.";
      case "RECEIPT_FINALIZED":
      case "RECEIPT_ALREADY_PAID":
      case "PAYMENT_ALREADY_COMPLETED":
        return "This receipt is already finalized for payment.";
      case "INVALID_RECEIPT_TOTAL":
      case "INVALID_PAYMENT_AMOUNT":
        return "Cart is empty. Scan items before checkout.";
      case "INVALID_RECEIPT_CURRENCY":
        return "Payment currency must be EGP.";
      case "PAYMOB_NOT_CONFIGURED":
        return "Payment provider is not configured yet.";
      case "PAYMENT_PROVIDER_ERROR":
        return "Payment provider could not create a checkout QR right now.";
      case "PAYMENT_URL_MISSING":
        return "Payment QR URL is missing from the backend response.";
      case "DATABASE_UNAVAILABLE":
        return "Payment service is temporarily unavailable. Please try again.";
      default:
        break;
    }

    if (!message) {
      return "Could not create payment QR. Try again.";
    }

    if (/expected object, received null/i.test(message)) {
      return "Payment QR request body is invalid. Please try again.";
    }

    if (/required/i.test(message)) {
      return "Payment QR request is missing amount.";
    }

    return message;
  }

  function normalizeRuntimeId(value: string | null | undefined) {
    if (typeof value !== "string") {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  function buildPaymentQrRequest(snapshot: NonNullable<typeof snapshotRef.current>) {
    const localTotals = calculateCartTotals(deviceCartItems);

    return {
      amount: roundPaymentAmount(localTotals.total),
      cartSessionId: normalizeRuntimeId(snapshot.activeListId),
      currency: "EGP",
      items: deviceCartItems
        .map((item) => mapPaymentItem({
          name: item.name,
          quantity: item.quantity,
          total: item.lineTotal,
          unitPrice: item.unitPrice
        }))
        .filter((item): item is CartoPaymentQrItemPayload => item !== null),
      receiptId: normalizeRuntimeId(snapshot.payment.transactionId)
    };
  }

  function syncDeviceCartProduct(productId: string, quantity = 1) {
    const product = findCatalogProductById(productId);
    if (!product) {
      return;
    }

    addDeviceCartItem({
      barcode: product.barcode,
      category: product.category,
      mapNodeId: product.mapNodeId,
      name: product.name,
      productId: product.id,
      quantity,
      shelfId: product.shelfId,
      unitPrice: product.price
    });
  }

  function mapPaymentItem(item: {
    name?: string | null;
    quantity?: number | null;
    total?: number | null;
    unitPrice?: number | null;
  }) {
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) {
      return null;
    }

    const quantity = Number(item.quantity ?? 1);
    const unitPrice = Number(item.unitPrice ?? 0);
    const total = Number(item.total ?? unitPrice * quantity);

    return {
      name,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      total: Number.isFinite(total) && total >= 0 ? total : 0,
      unitPrice: Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0
    } satisfies CartoPaymentQrItemPayload;
  }

  function readRuntimeErrorCode(error: unknown) {
    const code = error && typeof error === "object" && "code" in error
      ? (error as { code?: unknown }).code
      : null;

    return typeof code === "string" && code.length > 0 ? code : null;
  }

  function roundPaymentAmount(value: number | null | undefined) {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount)) {
      return 0;
    }

    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }
}
