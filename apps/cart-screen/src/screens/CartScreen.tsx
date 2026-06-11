import type { Alert, CartSnapshot } from "@carto/shared";
import { useEffect, useRef, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { AdminAccessButton } from "../components/AdminAccessButton";
import { AppShell } from "../components/AppShell";
import { BrandTransitionScreen } from "../components/BrandTransitionScreen";
import { CheckoutScreen } from "../components/CheckoutScreen";
import { CheckoutSuccessOverlay } from "../components/CheckoutSuccessOverlay";
import { CloseSessionConfirmModal } from "../components/CloseSessionConfirmModal";
import { HomeScreen } from "../components/HomeScreen";
import { ProductFeedbackOverlay, type ProductFeedback } from "../components/ProductFeedbackOverlay";
import { WelcomeScreen } from "../components/WelcomeScreen";
import { CART_CODE } from "../realtime/config";
import { useCartRuntime } from "../realtime/useCartRuntime";
import { useCartUiStore } from "../store/cartUiStore";
import { FIXED_THEME_NAME, getAppStrings, getTextScale, getThemePalette, scaleSize } from "../ui/appUi";

type AppFlowStage = "welcome" | "transition" | "shopping" | "receipt";

const RECEIPT_STATES = new Set(["CHECKOUT_PENDING", "WAITING_PAYMENT", "PAYMENT_FAILED", "PAID"]);

export function CartScreen() {
  const runtime = useCartRuntime();
  const backendStatus = useCartUiStore((state) => state.backendStatus);
  const snapshot = useCartUiStore((state) => state.snapshot);
  const connected = useCartUiStore((state) => state.connected);
  const language = useCartUiStore((state) => state.language);
  const sessionControlMode = useCartUiStore((state) => state.sessionControlMode);
  const textSize = useCartUiStore((state) => state.textSize);
  const strings = getAppStrings(language);
<<<<<<< HEAD
  const theme = getThemePalette(FIXED_THEME_NAME);
=======
  const theme = getThemePalette();
>>>>>>> save-detached-work
  const textScale = getTextScale(textSize);

  const [stage, setStage] = useState<AppFlowStage>("welcome");
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [isClosingSession, setIsClosingSession] = useState(false);
  const [closeSessionError, setCloseSessionError] = useState<string | null>(null);
  const [productFeedback, setProductFeedback] = useState<ProductFeedback | null>(null);
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const previousSnapshotRef = useRef<CartSnapshot | null>(null);
  const initializedRef = useRef(false);
  const playedTransitionSessionRef = useRef<string | null>(null);
  const pendingReturnToShoppingRef = useRef(false);
  const productFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkoutResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (productFeedbackTimerRef.current) clearTimeout(productFeedbackTimerRef.current);
    if (checkoutResetTimerRef.current) clearTimeout(checkoutResetTimerRef.current);
  }, []);

  useEffect(() => {
    if (!snapshot) return;

    const previous = previousSnapshotRef.current;
    const initialLoad = !initializedRef.current;

    if (initialLoad) {
      initializedRef.current = true;

      if (snapshot.state === "SHOPPING" || snapshot.state === "ERROR") {
        setStage("shopping");
        playedTransitionSessionRef.current = snapshot.sessionId;
      } else if (RECEIPT_STATES.has(snapshot.state)) {
        setStage("receipt");
      } else {
        setStage("welcome");
      }
    } else if (pendingReturnToShoppingRef.current && snapshot.state === "SHOPPING") {
      pendingReturnToShoppingRef.current = false;
      setStage("shopping");
      playedTransitionSessionRef.current = snapshot.sessionId;
    } else if (
      snapshot.state === "SHOPPING"
      && previous?.state === "WAITING_FOR_LIST"
      && playedTransitionSessionRef.current !== snapshot.sessionId
    ) {
      setStage("transition");
    } else if (RECEIPT_STATES.has(snapshot.state)) {
      setStage("receipt");
    } else if (snapshot.state === "SHOPPING" || snapshot.state === "ERROR") {
      setStage("shopping");
    } else if (snapshot.state === "WAITING_FOR_LIST" || snapshot.state === "SESSION_CLOSED") {
      setStage("welcome");
      setShowCheckoutSuccess(false);
      pendingReturnToShoppingRef.current = false;
    }

    if (previous && previous.sessionId === snapshot.sessionId && previous.state === "SHOPPING" && snapshot.state === "SHOPPING") {
      const cartFeedbackChange = findCartFeedbackChange(previous, snapshot);
      if (cartFeedbackChange) {
        showProductOverlay(buildCartFeedback(cartFeedbackChange, snapshot.sessionId, strings));
      }

      const latestErrorAlert = findLatestNewErrorAlert(previous, snapshot);
      if (latestErrorAlert) {
        const removeFailure = looksLikeRemoveFailure(latestErrorAlert.message);
        showProductOverlay({
          id: latestErrorAlert.id,
          message: latestErrorAlert.message,
          status: "error",
          title: removeFailure ? strings.productNotRemoved : strings.productNotAdded,
          icon: removeFailure ? "remove" : "alert"
        });
      }
    }

    if (snapshot.state === "PAID" && previous?.state !== "PAID") {
      setShowCheckoutSuccess(true);
      if (checkoutResetTimerRef.current) clearTimeout(checkoutResetTimerRef.current);
      checkoutResetTimerRef.current = setTimeout(() => {
        void (async () => {
          try {
            await runtime.resetSession();
          } catch {
            // The success overlay still clears the flow even if the backend reset is unavailable.
          } finally {
            resetTransientUi();
          }
        })();
      }, 5000);
    }

    if (snapshot.state !== "PAID" && previous?.state === "PAID") {
      setShowCheckoutSuccess(false);
    }

    previousSnapshotRef.current = snapshot;
  }, [
    runtime,
    sessionControlMode,
    snapshot,
    strings.productAdded,
    strings.productNotAdded,
    strings.productNotRemoved,
    strings.productQuantityUpdated,
    strings.productRemoved
  ]);

  function showProductOverlay(feedback: ProductFeedback) {
    if (productFeedbackTimerRef.current) clearTimeout(productFeedbackTimerRef.current);
    setProductFeedback(feedback);
    productFeedbackTimerRef.current = setTimeout(() => setProductFeedback(null), 1700);
  }

  function resetTransientUi() {
    if (checkoutResetTimerRef.current) {
      clearTimeout(checkoutResetTimerRef.current);
      checkoutResetTimerRef.current = null;
    }
    if (productFeedbackTimerRef.current) {
      clearTimeout(productFeedbackTimerRef.current);
      productFeedbackTimerRef.current = null;
    }

    setShowCheckoutSuccess(false);
    setProductFeedback(null);
    setCloseSessionError(null);
    setIsCloseConfirmOpen(false);
    setIsClosingSession(false);
    pendingReturnToShoppingRef.current = false;
    previousSnapshotRef.current = null;
    setStage("welcome");
  }

  function openCloseSessionConfirm() {
    setCloseSessionError(null);
    setIsCloseConfirmOpen(true);
  }

  function handleCancelCloseSession() {
    if (isClosingSession) return;
    setCloseSessionError(null);
    setIsCloseConfirmOpen(false);
  }

  async function executeCloseSession(options?: { useModalState?: boolean }) {
    const useModalState = options?.useModalState ?? false;
    if (useModalState && isClosingSession) return false;

    if (useModalState) {
      setCloseSessionError(null);
      setIsClosingSession(true);
    }

    try {
      await runtime.resetSession();
      resetTransientUi();
      return true;
    } catch {
      if (useModalState) {
        setCloseSessionError("Could not close session. Please try again.");
        setIsClosingSession(false);
      } else {
        showActionError(strings.closeSession, "Could not close session. Please try again.");
      }
      return false;
    }
  }

  async function handleConfirmCloseSession() {
    await executeCloseSession({ useModalState: true });
  }

  async function handleContinueWithoutList() {
    try {
      await runtime.startShopping();
    } catch (error) {
      showActionError(strings.continueWithoutList, error instanceof Error ? error.message : "Unable to start shopping.");
    }
  }

  function handleBrandTransitionComplete() {
    if (snapshot?.sessionId) {
      playedTransitionSessionRef.current = snapshot.sessionId;
    }
    setStage("shopping");
  }

  async function handleReturnToShopping() {
    if (
      sessionControlMode !== "read_only"
      && (snapshot?.state === "WAITING_PAYMENT" || snapshot?.state === "PAYMENT_FAILED" || snapshot?.state === "CHECKOUT_PENDING")
    ) {
      pendingReturnToShoppingRef.current = true;
      try {
        await runtime.cancelCheckout();
      } catch (error) {
        showActionError(strings.returnToShopping, error instanceof Error ? error.message : "Unable to return to shopping.");
      }
      return;
    }

    setStage("shopping");
  }

  const shoppingContent = snapshot?.state === "ERROR"
    ? (
      <View style={[styles.errorCard, { backgroundColor: theme.errorSoft, borderColor: theme.border }]}>
        <Text style={[styles.errorTitle, { color: theme.error, fontSize: scaleSize(30, textScale) }]}>
          {language === "ar" ? "خطأ في العربة" : "Cart error"}
        </Text>
        <Text style={[styles.errorText, { color: theme.textSecondary, fontSize: scaleSize(15, textScale) }]}>
          {language === "ar"
            ? "يرجى إعادة تشغيل الجلسة أو مراجعة سجل الخادم."
            : "Please restart the session or check the backend logs."}
        </Text>
      </View>
    )
    : (
      <HomeScreen
        connected={connected}
        language={language}
        onCheckout={() => setStage("receipt")}
        snapshot={snapshot}
        strings={strings}
        textScale={textScale}
        theme={theme}
      />
    );

  let content = null;

  if (stage === "transition") {
    content = (
      <BrandTransitionScreen
        appName={strings.appName}
        onComplete={handleBrandTransitionComplete}
        theme={theme}
      />
    );
  } else if (stage === "receipt") {
    content = (
      <CheckoutScreen
        connected={connected}
        language={language}
        onCancelCheckout={() => void runRuntimeAction(runtime.cancelCheckout, strings.cancelCheckout)}
        onConfirmCheckout={() => void runRuntimeAction(runtime.startCheckout, strings.confirmCheckout)}
        onConfirmPayment={() => void runRuntimeAction(runtime.confirmPayment, strings.confirmPayment)}
        onResetSession={() => void executeCloseSession()}
        onRetryPayment={() => void runRuntimeAction(runtime.retryPayment, strings.retryPayment)}
        onReturnToShopping={() => void handleReturnToShopping()}
        sessionControlMode={sessionControlMode}
        snapshot={snapshot}
        strings={strings}
        textScale={textScale}
        theme={theme}
      />
    );
  } else if (stage === "shopping") {
    content = (
      <AppShell
        backendStatus={backendStatus}
        connected={connected}
        onCloseSession={openCloseSessionConfirm}
        snapshot={snapshot}
        strings={strings}
        textScale={textScale}
        theme={theme}
      >
        {shoppingContent}
      </AppShell>
    );
  } else {
    content = (
      <WelcomeScreen
        backendStatus={backendStatus}
        cartCode={CART_CODE}
        connected={connected}
        onContinueWithoutList={() => void handleContinueWithoutList()}
        snapshot={snapshot}
        strings={strings}
        textScale={textScale}
        theme={theme}
      />
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {content}
      <CloseSessionConfirmModal
        errorMessage={closeSessionError}
        isClosing={isClosingSession}
        onCancel={handleCancelCloseSession}
        onConfirm={() => void handleConfirmCloseSession()}
        textScale={textScale}
        theme={theme}
        visible={isCloseConfirmOpen}
      />
      <ProductFeedbackOverlay feedback={productFeedback} textScale={textScale} theme={theme} />
      <CheckoutSuccessOverlay strings={strings} textScale={textScale} theme={theme} visible={showCheckoutSuccess} />
      <AdminAccessButton
        connected={connected}
        snapshot={snapshot}
        onResetSession={() => void executeCloseSession()}
        onStartShopping={() => void runRuntimeAction(runtime.startShopping, strings.startShopping)}
        onStartCheckout={() => void runRuntimeAction(runtime.startCheckout, strings.confirmCheckout)}
        onRetryPayment={() => void runRuntimeAction(runtime.retryPayment, strings.retryPayment)}
        onCancelCheckout={() => void runRuntimeAction(runtime.cancelCheckout, strings.cancelCheckout)}
      />
    </SafeAreaView>
  );

  async function runRuntimeAction(action: () => Promise<void>, title: string) {
    try {
      await action();
    } catch (error) {
      showActionError(title, error instanceof Error ? error.message : "This action is not available right now.");
    }
  }

  function showActionError(title: string, message: string) {
    showProductOverlay({
      id: `runtime-${Date.now()}`,
      icon: "alert",
      message,
      status: "error",
      title
    });
  }
}

function findLatestNewErrorAlert(previous: CartSnapshot, next: CartSnapshot): Alert | null {
  const seenIds = new Set(previous.alerts.map((alert) => alert.id));

  for (let index = next.alerts.length - 1; index >= 0; index -= 1) {
    const alert = next.alerts[index];
    if (!seenIds.has(alert.id) && alert.level === "error") {
      return alert;
    }
  }

  return null;
}

type CartFeedbackChange =
  | { kind: "added"; productName: string }
  | { kind: "quantity_updated"; productName: string }
  | { kind: "removed"; productName: string };

function findCartFeedbackChange(previous: CartSnapshot, next: CartSnapshot): CartFeedbackChange | null {
  const previousItems = summarizeCart(previous);
  const nextItems = summarizeCart(next);

  for (const [productId, nextItem] of nextItems) {
    const previousQuantity = previousItems.get(productId)?.quantity ?? 0;

    if (nextItem.quantity > previousQuantity) {
      return { kind: "added", productName: nextItem.name };
    }

    if (nextItem.quantity < previousQuantity) {
      return { kind: "quantity_updated", productName: nextItem.name };
    }
  }

  for (const [productId, previousItem] of previousItems) {
    if (!nextItems.has(productId)) {
      return { kind: "removed", productName: previousItem.name };
    }
  }

  return null;
}

function summarizeCart(snapshot: CartSnapshot) {
  const items = new Map<string, { name: string; quantity: number }>();

  for (const item of snapshot.cartItems) {
    const current = items.get(item.productId);
    items.set(item.productId, {
      name: item.name,
      quantity: (current?.quantity ?? 0) + item.quantity
    });
  }

  return items;
}

function buildCartFeedback(change: CartFeedbackChange, sessionId: string | null, strings: ReturnType<typeof getAppStrings>): ProductFeedback {
  const idPrefix = sessionId ?? "cart";

  if (change.kind === "removed") {
    return {
      id: `${idPrefix}-${Date.now()}-removed`,
      icon: "remove",
      message: strings.productRemoved,
      status: "success",
      title: change.productName,
      tone: "warning"
    };
  }

  if (change.kind === "quantity_updated") {
    return {
      id: `${idPrefix}-${Date.now()}-quantity`,
      icon: "remove",
      message: strings.productQuantityUpdated,
      status: "success",
      title: change.productName,
      tone: "warning"
    };
  }

  return {
    id: `${idPrefix}-${Date.now()}-added`,
    icon: "check",
    message: strings.productAdded,
    status: "success",
    title: change.productName,
    tone: "success"
  };
}

function looksLikeRemoveFailure(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("remove")
    || normalized.includes("removed")
    || normalized.includes("not in cart");
}

const styles = StyleSheet.create({
  root: { flex: 1, position: "relative" },
  errorCard: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 10
  },
  errorTitle: { fontWeight: "900", textAlign: "center" },
  errorText: { fontWeight: "800", textAlign: "center", lineHeight: 22, maxWidth: 480 }
});
