import { useCallback } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import type { CartState } from "@carto/shared";
import { useCartSocket } from "../realtime/useCartSocket";
import { useCartUiStore } from "../store/cartUiStore";
import { QRCodePanel } from "../components/QRCodePanel";
import { ShoppingListPanel } from "../components/ShoppingListPanel";
import { StoreMapPlaceholderPanel } from "../components/StoreMapPlaceholderPanel";
import { CartItemsPanel } from "../components/CartItemsPanel";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { SmartReceiptScreen } from "../components/SmartReceiptScreen";
import { PaymentSuccessScreen } from "../components/PaymentSuccessScreen";
import { PaymentFailedModal } from "../components/PaymentFailedModal";
import { AdminAccessButton } from "../components/AdminAccessButton";

const SHOPPING_LAYOUT_STATES = new Set<CartState>([
  "SHOPPING",
  "CHECKOUT_PENDING"
]);

export function CartScreen() {
  const socket = useCartSocket();
  const snapshot = useCartUiStore((state) => state.snapshot);
  const connected = useCartUiStore((state) => state.connected);
  const lastUpdateAt = useCartUiStore((state) => state.lastUpdateAt);
  const showShoppingLayout = snapshot ? SHOPPING_LAYOUT_STATES.has(snapshot.state) : false;
  const resetSession = useCallback(() => socket.resetSession(), [socket]);
  const startCheckout = useCallback(() => socket.startCheckout(), [socket]);

  return (
    <SafeAreaView style={styles.root}>
      {snapshot?.state === "WAITING_PAYMENT" || snapshot?.state === "PAYMENT_FAILED" ? (
        <View style={styles.receiptScreen}>
          <SmartReceiptScreen snapshot={snapshot} />
          {snapshot.state === "PAYMENT_FAILED" ? (
            <PaymentFailedModal connected={connected} onTryAgain={() => socket.retryPayment()} />
          ) : null}
        </View>
      ) : snapshot?.state === "PAID" ? (
        <PaymentSuccessScreen onResetSession={resetSession} />
      ) : snapshot?.state === "ERROR" ? (
        <View style={styles.errorScreen}>
          <ConnectionStatus connected={connected} snapshot={snapshot} lastUpdateAt={lastUpdateAt} variant="floating" />
          <Text style={styles.errorTitle}>Cart Error</Text>
          <Text style={styles.errorText}>Please restart the cart session or check the backend logs.</Text>
        </View>
      ) : !showShoppingLayout ? (
        <View style={styles.qrScreen}>
          <ConnectionStatus connected={connected} snapshot={snapshot} lastUpdateAt={lastUpdateAt} variant="floating" />
          <QRCodePanel snapshot={snapshot} />
        </View>
      ) : (
        <View style={styles.shoppingScreen}>
          <ConnectionStatus connected={connected} snapshot={snapshot} lastUpdateAt={lastUpdateAt} />
          <View style={styles.layout}>
            <View style={styles.leftPanel}>
              <ShoppingListPanel snapshot={snapshot} />
            </View>
            <View style={styles.middlePanel}>
              <StoreMapPlaceholderPanel />
            </View>
            <View style={styles.rightPanel}>
              <CartItemsPanel snapshot={snapshot} connected={connected} onCheckout={startCheckout} />
            </View>
          </View>
        </View>
      )}
      <AdminAccessButton
        connected={connected}
        snapshot={snapshot}
        onResetSession={resetSession}
        onStartCheckout={startCheckout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#eef2f6", position: "relative" },
  receiptScreen: { flex: 1 },
  qrScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: "#eef2f6"
  },
  shoppingScreen: { flex: 1, padding: 16, gap: 14 },
  layout: { flex: 1, flexDirection: "row", gap: 14, minHeight: 0 },
  leftPanel: { flex: 1, minWidth: 220 },
  middlePanel: { flex: 2, minWidth: 360 },
  rightPanel: { flex: 1, minWidth: 250 },
  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: "#fff1f2"
  },
  errorTitle: { color: "#be123c", fontSize: 36, fontWeight: "900", textAlign: "center" },
  errorText: { color: "#475569", fontSize: 17, fontWeight: "800", textAlign: "center", marginTop: 10 }
});
