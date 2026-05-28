import { create } from "zustand";
import type { CartSnapshot } from "@carto/shared";

export type { CartSnapshot } from "@carto/shared";

export type TabletTab = "home" | "scan" | "cart" | "map" | "checkout" | "settings";
export type UiLanguage = "en" | "ar";
export type UiThemeName = "premium_light" | "friendly_supermarket" | "carto_blue_green";
export type UiTextSize = "normal" | "large";
export type UiScanMode = "auto" | "manual";

interface CartUiStore {
  connected: boolean;
  snapshot: CartSnapshot | null;
  lastUpdateAt: string | null;
  activeTab: TabletTab;
  language: UiLanguage;
  theme: UiThemeName;
  textSize: UiTextSize;
  scanMode: UiScanMode;
  setConnected: (connected: boolean) => void;
  setSnapshot: (snapshot: CartSnapshot) => void;
  clearSnapshot: () => void;
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
  activeTab: "home",
  language: "en",
  theme: "carto_blue_green",
  textSize: "normal",
  scanMode: "auto",
  setConnected: (connected) => set({ connected }),
  setSnapshot: (snapshot) => set({ snapshot, lastUpdateAt: new Date().toISOString() }),
  clearSnapshot: () => set({ snapshot: null, lastUpdateAt: null }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setLanguage: (language) => set({ language }),
  setTheme: (theme) => set({ theme }),
  setTextSize: (textSize) => set({ textSize }),
  setScanMode: (scanMode) => set({ scanMode })
}));
