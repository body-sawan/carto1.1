import { Pressable, ScrollView, View, Text, StyleSheet } from "react-native";
import type { CartSnapshot } from "../store/cartUiStore";
import { TotalsCard, formatMoney } from "./TotalsCard";

interface CartItemsPanelProps {
  snapshot: CartSnapshot | null;
  connected: boolean;
  onCheckout: () => void;
}

export function CartItemsPanel({ snapshot, connected, onCheckout }: CartItemsPanelProps) {
  const cartItems = snapshot?.cartItems ?? [];
  const checkoutDisabled = !connected || !cartItems.length || snapshot?.state !== "SHOPPING";

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Cart</Text>
        <Text style={styles.count}>{cartItems.length} lines</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {cartItems.map((item) => (
          <View key={item.lineId} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.quantity}>x{item.quantity}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.meta}>Unit</Text>
              <Text style={styles.money}>{formatMoney(item.unitPrice)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.meta}>Line total</Text>
              <Text style={styles.lineTotal}>{formatMoney(item.lineTotal)}</Text>
            </View>
          </View>
        ))}
        {!cartItems.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No items in cart yet</Text>
            <Text style={styles.emptySub}>Scanned products will appear here.</Text>
          </View>
        ) : null}
      </ScrollView>
      <TotalsCard totals={snapshot?.totals} />
      <Pressable
        accessibilityRole="button"
        disabled={checkoutDisabled}
        onPress={onCheckout}
        style={({ pressed }) => [
          styles.checkoutButton,
          checkoutDisabled ? styles.checkoutButtonDisabled : null,
          pressed && !checkoutDisabled ? styles.checkoutButtonPressed : null
        ]}
      >
        <Text style={[styles.checkoutButtonText, checkoutDisabled ? styles.checkoutButtonTextDisabled : null]}>
          Checkout
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 14, minHeight: 0 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  title: { fontSize: 21, fontWeight: "900", color: "#142033" },
  count: { color: "#64748b", fontSize: 12, fontWeight: "800" },
  list: { gap: 10, paddingBottom: 4, flexGrow: 1 },
  itemCard: {
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 9
  },
  itemHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  name: { flex: 1, color: "#1e293b", fontSize: 15, fontWeight: "900" },
  quantity: {
    minWidth: 36,
    textAlign: "center",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "900"
  },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  meta: { color: "#64748b", fontSize: 12, fontWeight: "800" },
  money: { color: "#334155", fontSize: 13, fontWeight: "800" },
  lineTotal: { color: "#142033", fontSize: 14, fontWeight: "900" },
  emptyState: {
    flexGrow: 1,
    minHeight: 210,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 18
  },
  emptyTitle: { color: "#142033", fontSize: 16, fontWeight: "900", textAlign: "center" },
  emptySub: { color: "#64748b", fontSize: 13, fontWeight: "700", textAlign: "center", marginTop: 6 },
  checkoutButton: {
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  checkoutButtonPressed: { backgroundColor: "#1d4ed8" },
  checkoutButtonDisabled: { backgroundColor: "#cbd5e1" },
  checkoutButtonText: { color: "#ffffff", fontSize: 17, fontWeight: "900" },
  checkoutButtonTextDisabled: { color: "#64748b" }
});
