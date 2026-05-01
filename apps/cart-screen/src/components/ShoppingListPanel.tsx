import { ScrollView, View, Text, StyleSheet } from "react-native";
import type { CartSnapshot } from "../store/cartUiStore";

export function ShoppingListPanel({ snapshot }: { snapshot: CartSnapshot | null }) {
  const items = snapshot?.shoppingList ?? [];

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Shopping List</Text>
        <Text style={styles.count}>{items.length} items</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {items.map((item) => (
          <View key={item.productId} style={styles.row}>
            <View style={styles.itemCopy}>
              <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.sub}>Qty wanted: {item.quantity}</Text>
            </View>
            <Text style={[styles.badge, statusStyle(item.status)]}>{item.status}</Text>
          </View>
        ))}
        {!items.length ? <Text style={styles.empty}>Shopping list will appear here after pairing.</Text> : null}
      </ScrollView>
    </View>
  );
}

function statusStyle(status: string) {
  if (status === "IN_CART") return { backgroundColor: "#dff7e8", color: "#146b38" };
  if (status === "PARTIAL") return { backgroundColor: "#fff0c2", color: "#7a5200" };
  if (status === "REMOVED") return { backgroundColor: "#fee2e2", color: "#991b1b" };
  if (status === "SKIPPED") return { backgroundColor: "#f1f5f9", color: "#475569" };
  return { backgroundColor: "#e8eef8", color: "#31445f" };
}

const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 14, minHeight: 0 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  title: { fontSize: 21, fontWeight: "900", color: "#142033" },
  count: { color: "#64748b", fontSize: 12, fontWeight: "800" },
  list: { gap: 10, paddingBottom: 4 },
  row: {
    minHeight: 74,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12
  },
  itemCopy: { flex: 1, gap: 5 },
  name: { fontSize: 15, fontWeight: "800", color: "#1e293b" },
  sub: { fontSize: 12, color: "#64748b", fontWeight: "700" },
  badge: { overflow: "hidden", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, fontSize: 10, fontWeight: "900" },
  empty: { color: "#64748b", lineHeight: 20 }
});
