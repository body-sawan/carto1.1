import { useEffect } from "react";
import { useCartUiStore } from "../store/cartUiStore";
import { CART_CODE } from "./config";
import { buildWaitingSnapshot, fetchCartoQr, getActiveSession, mapActiveSessionToSnapshot } from "./cartoApi";

export function useCartoActiveSession(enabled: boolean) {
  const sessionControlMode = useCartUiStore((state) => state.sessionControlMode);
  const setBackendStatus = useCartUiStore((state) => state.setBackendStatus);
  const setConnected = useCartUiStore((state) => state.setConnected);
  const setSessionControlMode = useCartUiStore((state) => state.setSessionControlMode);
  const setSnapshot = useCartUiStore((state) => state.setSnapshot);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const currentSnapshot = useCartUiStore.getState().snapshot;

    if (sessionControlMode === "local_guest") {
      setConnected(true);
      setBackendStatus("connected");
      return undefined;
    }

    let mounted = true;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    void ensureWaitingSnapshot(currentSnapshot);

    async function poll() {
      const controller = new AbortController();
      const result = await getActiveSession(undefined, undefined, controller.signal);
      if (!mounted) return;

      if (!result.ok) {
        setConnected(true);
        setBackendStatus("offline");
        setSessionControlMode("full");
        await ensureWaitingSnapshot(useCartUiStore.getState().snapshot, result.data.cartCode);
      } else if (result.data.status === "waiting") {
        setConnected(true);
        setBackendStatus("waiting");
        setSessionControlMode("full");
        await ensureWaitingSnapshot(useCartUiStore.getState().snapshot, result.data.cartCode);
      } else {
        setConnected(true);
        setBackendStatus("active");
        setSessionControlMode("full");
        setSnapshot(mapActiveSessionToSnapshot(result.data, useCartUiStore.getState().snapshot));
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
  }, [enabled, sessionControlMode, setBackendStatus, setConnected, setSessionControlMode, setSnapshot]);

  async function ensureWaitingSnapshot(snapshot: ReturnType<typeof useCartUiStore.getState>["snapshot"], cartCode = CART_CODE) {
    if (snapshot?.sessionId && snapshot.state !== "WAITING_FOR_LIST") {
      return;
    }

    if (snapshot?.state === "WAITING_FOR_LIST" && snapshot.pairing?.qrPayload) {
      return;
    }

    try {
      const qrData = await fetchCartoQr(cartCode);
      setSnapshot(buildWaitingSnapshot(cartCode, qrData));
    } catch {
      setSnapshot(buildWaitingSnapshot(cartCode));
    }
  }
}
