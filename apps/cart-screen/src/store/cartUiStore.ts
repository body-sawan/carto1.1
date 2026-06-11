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

interface CartUiStore {
  connected: boolean;
  snapshot: CartSnapshot | null;
  lastUpdateAt: string | null;
  backendStatus: CartBackendStatus;
  sessionControlMode: SessionControlMode;
  integrationMode: IntegrationMode;
  activeTab: TabletTab;
  language: UiLanguage;
  textSize: UiTextSize;
  scanMode: UiScanMode;
  setConnected: (connected: boolean) => void;
  setBackendStatus: (status: CartBackendStatus) => void;
  setSnapshot: (snapshot: CartSnapshot) => void;
  clearSnapshot: () => void;
  setSessionControlMode: (mode: SessionControlMode) => void;
  setIntegrationMode: (mode: IntegrationMode) => void;
  setActiveTab: (activeTab: TabletTab) => void;
  setLanguage: (language: UiLanguage) => void;
  setTextSize: (textSize: UiTextSize) => void;
  setScanMode: (scanMode: UiScanMode) => void;
}

export const useCartUiStore = create<CartUiStore>((set) => ({
  connected: false,
  snapshot: null,
  lastUpdateAt: null,
  backendStatus: "checking",
  sessionControlMode: "full",
  integrationMode: "local-edge",
  activeTab: "home",
  language: "en",
  textSize: "normal",
  scanMode: "auto",
  setConnected: (connected) => set({ connected }),
  setBackendStatus: (backendStatus) => set({ backendStatus }),
  setSnapshot: (snapshot) => set({ snapshot, lastUpdateAt: new Date().toISOString() }),
  clearSnapshot: () => set({ snapshot: null, lastUpdateAt: null }),
  setSessionControlMode: (sessionControlMode) => set({ sessionControlMode }),
  setIntegrationMode: (integrationMode) => set({ integrationMode }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setLanguage: (language) => set({ language }),
  setTextSize: (textSize) => set({ textSize }),
  setScanMode: (scanMode) => set({ scanMode })
}));
