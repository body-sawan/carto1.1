import { useEffect, useRef } from "react";
import { fetchPaymentStatus, applyPaymentSessionToSnapshot, getCartoErrorKind } from "./cartoApi";
import { useCartUiStore } from "../store/cartUiStore";

const PAYMENT_STATUS_POLL_INTERVAL_MS = 2000;

export function useCartoPaymentStatus(enabled: boolean) {
  const paymentSession = useCartUiStore((state) => state.paymentSession);
  const setPaymentSession = useCartUiStore((state) => state.setPaymentSession);
  const setSnapshot = useCartUiStore((state) => state.setSnapshot);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || !paymentSession || paymentSession.status === "idle") {
      return undefined;
    }

    if (paymentSession.status === "success" || paymentSession.status === "failed") {
      return undefined;
    }

    let mounted = true;

    function clearTimer() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    function scheduleNextPoll() {
      clearTimer();
      if (!mounted) {
        return;
      }

      timerRef.current = setTimeout(() => {
        void poll();
      }, PAYMENT_STATUS_POLL_INTERVAL_MS);
    }

    async function poll() {
      if (!mounted || inFlightRef.current) {
        return;
      }

      const currentPaymentSession = useCartUiStore.getState().paymentSession;
      if (!currentPaymentSession || currentPaymentSession.status === "success" || currentPaymentSession.status === "failed") {
        return;
      }

      inFlightRef.current = true;
      const controller = new AbortController();
      requestControllerRef.current = controller;

      try {
        const data = await fetchPaymentStatus(currentPaymentSession.receiptId, undefined, controller.signal);
        if (!mounted) {
          return;
        }

        const normalizedPaymentStatus = data.paymentStatus.toUpperCase();
        const nextStatus = normalizedPaymentStatus.includes("PAID") || normalizedPaymentStatus.includes("COMPLETE")
          ? "success"
          : normalizedPaymentStatus.includes("FAIL") || normalizedPaymentStatus.includes("CANCEL")
            ? "failed"
            : "pending";

        const nextPaymentSession = {
          ...currentPaymentSession,
          amount: data.amount && data.amount > 0 ? data.amount : currentPaymentSession.amount,
          cartSessionId: data.cartSessionId || currentPaymentSession.cartSessionId,
          currency: data.currency || currentPaymentSession.currency,
          errorMessage: null,
          paymentStatus: data.paymentStatus,
          paymentUrl: data.paymentUrl || currentPaymentSession.paymentUrl,
          qrValue: data.qrValue || currentPaymentSession.qrValue,
          receiptId: data.receiptId || currentPaymentSession.receiptId,
          status: nextStatus
        } as const;

        setPaymentSession(nextPaymentSession);
        const snapshot = useCartUiStore.getState().snapshot;
        if (snapshot) {
          setSnapshot(applyPaymentSessionToSnapshot(snapshot, nextPaymentSession));
        }

        if (nextStatus === "pending") {
          scheduleNextPoll();
        }
      } catch (error) {
        if (!mounted) {
          return;
        }

        const current = useCartUiStore.getState().paymentSession;
        if (current) {
          setPaymentSession({
            ...current,
            errorMessage: getCartoErrorKind(error) === "network"
              ? "Backend connection lost. Retrying..."
              : "Could not load payment status. Retrying...",
            status: current.status === "creating" ? "pending" : current.status
          });
        }
        scheduleNextPoll();
      } finally {
        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null;
        }
        inFlightRef.current = false;
      }
    }

    void poll();

    return () => {
      mounted = false;
      clearTimer();
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
      inFlightRef.current = false;
    };
  }, [enabled, paymentSession, setPaymentSession, setSnapshot]);
}
