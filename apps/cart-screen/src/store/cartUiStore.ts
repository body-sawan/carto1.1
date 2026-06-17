import { create } from "zustand";
import type { CartSnapshot, ReceiptLine } from "@carto/shared";

export type { CartSnapshot } from "@carto/shared";

export type TabletTab = "home" | "scan" | "cart" | "map" | "checkout" | "settings";
export type UiLanguage = "en" | "ar";
export type UiTextSize = "normal" | "large";
export type UiScanMode = "auto" | "manual";
export type IntegrationMode = "local-edge" | "online-api" | "mock-online";
export type SessionControlMode = "full" | "local_guest" | "read_only";
export type CartBackendStatus = "checking" | "connected" | "waiting" | "active" | "offline";
export type ListDeliveryStatus =
  | "waiting"
  | "checking"
  | "received"
  | "failed"
  | "offline"
  | "fetching_qr"
  | "refreshing_qr"
  | "auth_error"
  | "cart_not_found"
  | "cors_error";
export type CartPaymentFlowStatus = "idle" | "creating" | "pending" | "success" | "failed";

export interface CartPaymentSession {
  amount: number;
  amountDisplay?: string;
  cartSessionId: string;
  currency: string;
  errorMessage?: string | null;
  expiresAt?: string | null;
  paymentAttemptId?: string;
  paymentStatus: string;
  paymentUrl: string;
  qrValue: string;
  receiptId: string;
  status: CartPaymentFlowStatus;
}

export interface DeviceCartItemInput {
  addedAt?: string;
  barcode: string;
  category?: string | null;
  lineId?: string;
  mapNodeId?: string;
  name: string;
  productId: string;
  quantity?: number;
  shelfId?: string;
  unitPrice: number;
}

interface CartUiStore {
  connected: boolean;
  deviceCartItems: ReceiptLine[];
  deviceCartSessionId: string | null;
  snapshot: CartSnapshot | null;
  lastUpdateAt: string | null;
  backendStatus: CartBackendStatus;
  listStatus: ListDeliveryStatus;
  receivedItemCount: number;
  paymentSession: CartPaymentSession | null;
  sessionControlMode: SessionControlMode;
  integrationMode: IntegrationMode;
  activeTab: TabletTab;
  language: UiLanguage;
  textSize: UiTextSize;
  scanMode: UiScanMode;
  activeSessionRefreshKey: number;
  setConnected: (connected: boolean) => void;
  setBackendStatus: (status: CartBackendStatus) => void;
  setListStatus: (status: ListDeliveryStatus, receivedItemCount?: number) => void;
  setPaymentSession: (paymentSession: CartPaymentSession | null) => void;
  clearPaymentSession: () => void;
  clearDeviceCart: (sessionId?: string | null) => void;
  setSnapshot: (snapshot: CartSnapshot) => void;
  clearSnapshot: () => void;
  syncDeviceCartSession: (sessionId: string | null) => void;
  addDeviceCartItem: (item: DeviceCartItemInput) => void;
  removeDeviceCartItem: (productId: string, quantity?: number) => void;
  setSessionControlMode: (mode: SessionControlMode) => void;
  setIntegrationMode: (mode: IntegrationMode) => void;
  setActiveTab: (activeTab: TabletTab) => void;
  setLanguage: (language: UiLanguage) => void;
  setTextSize: (textSize: UiTextSize) => void;
  setScanMode: (scanMode: UiScanMode) => void;
  requestActiveSessionRefresh: () => void;
}

export const useCartUiStore = create<CartUiStore>((set) => ({
  connected: false,
  deviceCartItems: [],
  deviceCartSessionId: null,
  snapshot: null,
  lastUpdateAt: null,
  backendStatus: "checking",
  listStatus: "checking",
  receivedItemCount: 0,
  paymentSession: null,
  sessionControlMode: "full",
  integrationMode: "online-api",
  activeTab: "home",
  language: "en",
  textSize: "normal",
  scanMode: "auto",
  activeSessionRefreshKey: 0,
  setConnected: (connected) => set({ connected }),
  setBackendStatus: (backendStatus) => set({ backendStatus }),
  setListStatus: (listStatus, receivedItemCount = 0) => set({ listStatus, receivedItemCount }),
  setPaymentSession: (paymentSession) => set({ paymentSession }),
  clearPaymentSession: () => set({ paymentSession: null }),
  clearDeviceCart: (sessionId = null) => set({ deviceCartItems: [], deviceCartSessionId: sessionId }),
  setSnapshot: (snapshot) => set({ snapshot, lastUpdateAt: new Date().toISOString() }),
  clearSnapshot: () => set({ snapshot: null, lastUpdateAt: null }),
  syncDeviceCartSession: (sessionId) => set((state) => (
    state.deviceCartSessionId === sessionId
      ? { deviceCartSessionId: sessionId }
      : { deviceCartItems: [], deviceCartSessionId: sessionId }
  )),
  addDeviceCartItem: (item) => set((state) => ({
    deviceCartItems: addOrIncrementDeviceCartItem(state.deviceCartItems, item)
  })),
  removeDeviceCartItem: (productId, quantity = 1) => set((state) => ({
    deviceCartItems: decrementOrRemoveDeviceCartItem(state.deviceCartItems, productId, quantity)
  })),
  setSessionControlMode: (sessionControlMode) => set({ sessionControlMode }),
  setIntegrationMode: (integrationMode) => set({ integrationMode }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setLanguage: (language) => set({ language }),
  setTextSize: (textSize) => set({ textSize }),
  setScanMode: (scanMode) => set({ scanMode }),
  requestActiveSessionRefresh: () => set((state) => ({ activeSessionRefreshKey: state.activeSessionRefreshKey + 1 }))
}));

function addOrIncrementDeviceCartItem(items: ReceiptLine[], item: DeviceCartItemInput) {
  const quantity = normalizeQuantity(item.quantity);
  const nextIndex = items.findIndex((entry) => entry.productId === item.productId);

  if (nextIndex >= 0) {
    return items.map((entry, index) => (
      index === nextIndex
        ? {
          ...entry,
          barcode: item.barcode || entry.barcode,
          category: item.category ?? entry.category,
          lineId: item.lineId ?? entry.lineId,
          lineTotal: roundMoney(item.unitPrice * (entry.quantity + quantity)),
          mapNodeId: item.mapNodeId ?? entry.mapNodeId,
          name: item.name || entry.name,
          quantity: entry.quantity + quantity,
          shelfId: item.shelfId ?? entry.shelfId,
          unitPrice: item.unitPrice || entry.unitPrice
        }
        : entry
    ));
  }

  return [
    {
      addedAt: item.addedAt ?? new Date().toISOString(),
      barcode: item.barcode,
      category: item.category ?? undefined,
      lineId: item.lineId ?? `device-line-${item.productId}`,
      lineTotal: roundMoney(item.unitPrice * quantity),
      mapNodeId: item.mapNodeId,
      name: item.name,
      productId: item.productId,
      quantity,
      shelfId: item.shelfId,
      unitPrice: item.unitPrice
    },
    ...items
  ];
}

function decrementOrRemoveDeviceCartItem(items: ReceiptLine[], productId: string, quantity: number) {
  const safeQuantity = normalizeQuantity(quantity);

  return items.flatMap((item) => {
    if (item.productId !== productId) {
      return [item];
    }

    const nextQuantity = item.quantity - safeQuantity;
    if (nextQuantity <= 0) {
      return [];
    }

    return [{
      ...item,
      lineTotal: roundMoney(item.unitPrice * nextQuantity),
      quantity: nextQuantity
    }];
  });
}

function normalizeQuantity(value: number | undefined) {
  const quantity = Number(value ?? 1);
  return Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
