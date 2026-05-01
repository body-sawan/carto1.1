import { SafeAreaView, StyleSheet, View } from "react-native";
import type { CartState } from "@carto/shared";
import { useCartSocket } from "../realtime/useCartSocket";
import { useCartUiStore } from "../store/cartUiStore";
import { QRCodePanel } from "../components/QRCodePanel";
import { ShoppingListPanel } from "../components/ShoppingListPanel";
import { StoreMapPlaceholderPanel } from "../components/StoreMapPlaceholderPanel";
import { CartItemsPanel } from "../components/CartItemsPanel";
import { ConnectionStatus } from "../components/ConnectionStatus";

const SHOPPING_LAYOUT_STATES = new Set<CartState>([
  "SHOPPING",
  "CHECKOUT_PENDING",
  "WAITING_PAYMENT",
  "PAID",
  "PAYMENT_FAILED",
  "SESSION_CLOSED",
  "ERROR"
]);

export function CartScreen() {
  useCartSocket();
  const snapshot = useCartUiStore((state) => state.snapshot);
  const connected = useCartUiStore((state) => state.connected);
  const lastUpdateAt = useCartUiStore((state) => state.lastUpdateAt);
  const showShoppingLayout = snapshot ? SHOPPING_LAYOUT_STATES.has(snapshot.state) : false;

  return (
    <SafeAreaView style={styles.root}>
      {!showShoppingLayout ? (
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
              <CartItemsPanel snapshot={snapshot} />
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#eef2f6" },
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
  rightPanel: { flex: 1, minWidth: 250 }
});
