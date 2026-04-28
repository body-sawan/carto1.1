import { create } from "zustand";
import type { CartSnapshot } from "@carto/shared";

export type { CartSnapshot } from "@carto/shared";

interface CartUiStore {
  connected: boolean;
  snapshot: CartSnapshot | null;
  setConnected: (connected: boolean) => void;
  setSnapshot: (snapshot: CartSnapshot) => void;
}

export const useCartUiStore = create<CartUiStore>((set) => ({
  connected: false,
  snapshot: null,
  setConnected: (connected) => set({ connected }),
  setSnapshot: (snapshot) => set({ snapshot })
}));
