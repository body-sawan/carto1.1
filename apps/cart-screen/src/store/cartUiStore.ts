import { create } from "zustand";
import type { CartSnapshot } from "@carto/shared";

export type { CartSnapshot } from "@carto/shared";

export type TabletTab = "home" | "scan" | "cart" | "map" | "checkout" | "settings";
export type UiLanguage = "en" | "ar";
export type UiThemeName = "premium_light" | "friendly_supermarket" | "carto_blue_green";
export type UiTextSize = "normal" | "large";
export type UiScanMode = "auto" | "manual";
export type TransportMode = "edge" | "carto";
export type SessionControlMode = "full" | "local_guest" | "read_only";
export type CartBackendStatus = "checking" | "connected" | "waiting" | "active" | "offline";

interface CartUiStore {
  connected: boolean;
  snapshot: CartSnapshot | null;
  lastUpdateAt: string | null;
  backendStatus: CartBackendStatus;
  sessionControlMode: SessionControlMode;
  transportMode: TransportMode;
  activeTab: TabletTab;
  language: UiLanguage;
  theme: UiThemeName;
  textSize: UiTextSize;
  scanMode: UiScanMode;
  setConnected: (connected: boolean) => void;
  setBackendStatus: (status: CartBackendStatus) => void;
  setSnapshot: (snapshot: CartSnapshot) => void;
  clearSnapshot: () => void;
  setSessionControlMode: (mode: SessionControlMode) => void;
  setTransportMode: (mode: TransportMode) => void;
  setActiveTab: (activeTab: TabletTab) => void;
  setLanguage: (language: UiLanguage) => void;
  setTheme: (theme: UiThemeName) => void;
  setTextSize: (textSize: UiTextSize) => void;
  setScanMode: (scanMode: UiScanMode) => void;
}

export const useCartUiStore = create<CartUiStore>((set) => ({
  connected: false,
  snapshot: null,
  lastUpdateAt: null,
  backendStatus: "checking",
  sessionControlMode: "full",
  transportMode: "edge",
  activeTab: "home",
  language: "en",
  theme: "carto_blue_green",
  textSize: "normal",
  scanMode: "auto",
  setConnected: (connected) => set({ connected }),
  setBackendStatus: (backendStatus) => set({ backendStatus }),
  setSnapshot: (snapshot) => set({ snapshot, lastUpdateAt: new Date().toISOString() }),
  clearSnapshot: () => set({ snapshot: null, lastUpdateAt: null }),
  setSessionControlMode: (sessionControlMode) => set({ sessionControlMode }),
  setTransportMode: (transportMode) => set({ transportMode }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setLanguage: (language) => set({ language }),
  setTheme: (theme) => set({ theme }),
  setTextSize: (textSize) => set({ textSize }),
  setScanMode: (scanMode) => set({ scanMode })
}));
