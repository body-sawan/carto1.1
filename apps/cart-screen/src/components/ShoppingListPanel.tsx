import { View, Text, StyleSheet } from "react-native";
import type { CartSnapshot } from "../store/cartUiStore";

export function ShoppingListPanel({ snapshot }: { snapshot: CartSnapshot | null }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Shopping List</Text>
      {(snapshot?.shoppingList.length ? snapshot.shoppingList : []).map((item) => (
        <View key={item.productId} style={styles.row}>
          <View>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.sub}>{item.inCartQuantity}/{item.quantity} in cart</Text>
          </View>
          <Text style={[styles.badge, statusStyle(item.status)]}>{item.status}</Text>
        </View>
      ))}
      {!snapshot?.shoppingList.length && <Text style={styles.empty}>Waiting for Bluetooth list.</Text>}
    </View>
  );
}

function statusStyle(status: string) {
  if (status === "IN_CART") return { backgroundColor: "#dff7e8", color: "#146b38" };
  if (status === "PARTIAL") return { backgroundColor: "#fff0c2", color: "#7a5200" };
  if (status === "REMOVED") return { backgroundColor: "#ffe2df", color: "#963328" };
  return { backgroundColor: "#e8eef8", color: "#31445f" };
}

const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: "#ffffff", borderRadius: 8, padding: 16, gap: 10 },
  title: { fontSize: 18, fontWeight: "700", color: "#152238" },
  row: { minHeight: 54, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#edf1f5" },
  name: { fontSize: 15, fontWeight: "700", color: "#1d2a3a" },
  sub: { fontSize: 12, color: "#65758b" },
  badge: { overflow: "hidden", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, fontWeight: "800" },
  empty: { color: "#65758b" }
});
