import { create } from "zustand";
import type { CartSnapshot } from "@carto/shared";

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

interface CartUiStore {
  connected: boolean;
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
  setSnapshot: (snapshot: CartSnapshot) => void;
  clearSnapshot: () => void;
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
  setSnapshot: (snapshot) => set({ snapshot, lastUpdateAt: new Date().toISOString() }),
  clearSnapshot: () => set({ snapshot: null, lastUpdateAt: null }),
  setSessionControlMode: (sessionControlMode) => set({ sessionControlMode }),
  setIntegrationMode: (integrationMode) => set({ integrationMode }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setLanguage: (language) => set({ language }),
  setTextSize: (textSize) => set({ textSize }),
  setScanMode: (scanMode) => set({ scanMode }),
  requestActiveSessionRefresh: () => set((state) => ({ activeSessionRefreshKey: state.activeSessionRefreshKey + 1 }))
}));
