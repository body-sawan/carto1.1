import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { useCartSocket } from "../realtime/useCartSocket";
import { useCartUiStore } from "../store/cartUiStore";
import { QRCodePanel } from "../components/QRCodePanel";
import { ShoppingListPanel } from "../components/ShoppingListPanel";
import { StoreMapPanel } from "../components/StoreMapPanel";
import { ReceiptPanel } from "../components/ReceiptPanel";
import { CartStatusBar } from "../components/StatusBar";
import { CheckoutPanel } from "../components/CheckoutPanel";

export function CartScreen() {
  const client = useCartSocket();
  const snapshot = useCartUiStore((state) => state.snapshot);
  const connected = useCartUiStore((state) => state.connected);

  return (
    <SafeAreaView style={styles.root}>
      <CartStatusBar connected={connected} snapshot={snapshot} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.top}>
          <QRCodePanel snapshot={snapshot} />
          <StoreMapPanel snapshot={snapshot} />
        </View>
        <View style={styles.grid}>
          <ShoppingListPanel snapshot={snapshot} />
          <ReceiptPanel snapshot={snapshot} />
        </View>
        <CheckoutPanel snapshot={snapshot} client={client} connected={connected} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#e8edf3" },
  scroll: { padding: 16, gap: 16 },
  top: { flexDirection: "row", gap: 16, alignItems: "stretch" },
  grid: { flexDirection: "row", gap: 16, minHeight: 280 }
});
