import type { Alert, CartSnapshot } from "@carto/shared";
import { useEffect, useRef, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { AdminAccessButton } from "../components/AdminAccessButton";
import { AppShell } from "../components/AppShell";
import { BrandTransitionScreen } from "../components/BrandTransitionScreen";
import { CheckoutScreen } from "../components/CheckoutScreen";
import { CheckoutSuccessOverlay } from "../components/CheckoutSuccessOverlay";
import { HomeScreen } from "../components/HomeScreen";
import { ProductFeedbackOverlay, type ProductFeedback } from "../components/ProductFeedbackOverlay";
import { WelcomeScreen } from "../components/WelcomeScreen";
import { useBackendHealth } from "../realtime/useBackendHealth";
import { useCartSocket } from "../realtime/useCartSocket";
import { useCartUiStore } from "../store/cartUiStore";
import { getAppStrings, getTextScale, getThemePalette, scaleSize } from "../ui/appUi";

type AppFlowStage = "welcome" | "transition" | "shopping" | "receipt";

const RECEIPT_STATES = new Set(["CHECKOUT_PENDING", "WAITING_PAYMENT", "PAYMENT_FAILED", "PAID"]);

export function CartScreen() {
  const socket = useCartSocket();
  const backendHealth = useBackendHealth();
  const snapshot = useCartUiStore((state) => state.snapshot);
  const clearSnapshot = useCartUiStore((state) => state.clearSnapshot);
  const connected = useCartUiStore((state) => state.connected);
  const language = useCartUiStore((state) => state.language);
  const themeName = useCartUiStore((state) => state.theme);
  const setTheme = useCartUiStore((state) => state.setTheme);
  const textSize = useCartUiStore((state) => state.textSize);
  const strings = getAppStrings(language);
  const theme = getThemePalette(themeName);
  const textScale = getTextScale(textSize);

  const [stage, setStage] = useState<AppFlowStage>("welcome");
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
      const addedProduct = findAddedProduct(previous, snapshot);
      if (addedProduct) {
        showProductOverlay({
          id: `${snapshot.sessionId}-${Date.now()}`,
          message: strings.productAdded,
          status: "success",
          title: addedProduct
        });
      }

      const latestErrorAlert = findLatestNewErrorAlert(previous, snapshot);
      if (latestErrorAlert) {
        showProductOverlay({
          id: latestErrorAlert.id,
          message: latestErrorAlert.message,
          status: "error",
          title: strings.productNotAdded
        });
      }
    }

    if (snapshot.state === "PAID" && previous?.state !== "PAID") {
      setShowCheckoutSuccess(true);
      if (checkoutResetTimerRef.current) clearTimeout(checkoutResetTimerRef.current);
      checkoutResetTimerRef.current = setTimeout(() => {
        resetToWelcome();
        socket.resetSession();
      }, 5000);
    }

    if (snapshot.state !== "PAID" && previous?.state === "PAID") {
      setShowCheckoutSuccess(false);
    }

    previousSnapshotRef.current = snapshot;
  }, [snapshot, socket, strings.productAdded, strings.productNotAdded]);

  function showProductOverlay(feedback: ProductFeedback) {
    if (productFeedbackTimerRef.current) clearTimeout(productFeedbackTimerRef.current);
    setProductFeedback(feedback);
    productFeedbackTimerRef.current = setTimeout(() => setProductFeedback(null), 1700);
  }

  function resetToWelcome() {
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
    pendingReturnToShoppingRef.current = false;
    previousSnapshotRef.current = null;
    clearSnapshot();
    setStage("welcome");
  }

  function handleCloseSession() {
    resetToWelcome();
    socket.resetSession();
  }

  function handleContinueWithoutList() {
    socket.startShopping();
  }

  function handleBrandTransitionComplete() {
    if (snapshot?.sessionId) {
      playedTransitionSessionRef.current = snapshot.sessionId;
    }
    setStage("shopping");
  }

  function handleReturnToShopping() {
    if (snapshot?.state === "WAITING_PAYMENT" || snapshot?.state === "PAYMENT_FAILED" || snapshot?.state === "CHECKOUT_PENDING") {
      pendingReturnToShoppingRef.current = true;
      socket.cancelCheckout();
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
        onCancelCheckout={() => socket.cancelCheckout()}
        onConfirmCheckout={() => socket.startCheckout()}
        onConfirmPayment={() => socket.confirmPayment()}
        onResetSession={handleCloseSession}
        onRetryPayment={() => socket.retryPayment()}
        onReturnToShopping={handleReturnToShopping}
        snapshot={snapshot}
        strings={strings}
        textScale={textScale}
        theme={theme}
      />
    );
  } else if (stage === "shopping") {
    content = (
      <AppShell
        backendStatus={backendHealth.status}
        connected={connected}
        language={language}
        onCloseSession={handleCloseSession}
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
        connected={connected}
        onContinueWithoutList={handleContinueWithoutList}
        onThemeChange={setTheme}
        snapshot={snapshot}
        strings={strings}
        textScale={textScale}
        theme={theme}
        themeName={themeName}
      />
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {content}
      <ProductFeedbackOverlay feedback={productFeedback} textScale={textScale} theme={theme} />
      <CheckoutSuccessOverlay strings={strings} textScale={textScale} theme={theme} visible={showCheckoutSuccess} />
      <AdminAccessButton
        connected={connected}
        snapshot={snapshot}
        onResetSession={handleCloseSession}
        onStartShopping={() => socket.startShopping()}
        onStartCheckout={() => socket.startCheckout()}
        onRetryPayment={() => socket.retryPayment()}
        onCancelCheckout={() => socket.cancelCheckout()}
      />
    </SafeAreaView>
  );
}

function findAddedProduct(previous: CartSnapshot, next: CartSnapshot) {
  const previousQuantities = new Map<string, number>();
  for (const item of previous.cartItems) {
    previousQuantities.set(item.productId, (previousQuantities.get(item.productId) ?? 0) + item.quantity);
  }

  for (const item of next.cartItems) {
    const previousQuantity = previousQuantities.get(item.productId) ?? 0;
    if (item.quantity > previousQuantity) {
      return item.name;
    }
  }

  return null;
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
