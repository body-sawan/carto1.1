import { View, Text, StyleSheet } from "react-native";
import type { CartSnapshot } from "../store/cartUiStore";

export function ReceiptPanel({ snapshot }: { snapshot: CartSnapshot | null }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Receipt</Text>
      {(snapshot?.cartItems ?? []).map((item) => (
        <View key={item.lineId} style={styles.row}>
          <Text style={styles.item}>{item.quantity}x {item.name}</Text>
          <Text style={styles.money}>{format(item.lineTotal)}</Text>
        </View>
      ))}
      {!snapshot?.cartItems.length && <Text style={styles.empty}>Cart is empty.</Text>}
      <View style={styles.totals}>
        <Line label="Subtotal" value={snapshot?.totals.subtotal} />
        <Line label="Discount" value={snapshot?.totals.discount} />
        <Line label="Tax" value={snapshot?.totals.tax} />
        <View style={styles.totalLine}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.total}>{format(snapshot?.totals.total ?? 0)}</Text>
        </View>
      </View>
    </View>
  );
}

function Line({ label, value = 0 }: { label: string; value?: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.sub}>{label}</Text>
      <Text style={styles.sub}>{format(value)}</Text>
    </View>
  );
}

function format(value: number) {
  return `${value.toFixed(2)} EGP`;
}

const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: "#ffffff", borderRadius: 8, padding: 16, gap: 10 },
  title: { fontSize: 18, fontWeight: "700", color: "#152238" },
  row: { minHeight: 28, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  item: { maxWidth: "68%", color: "#1d2a3a", fontWeight: "600" },
  money: { color: "#1d2a3a", fontWeight: "700" },
  empty: { color: "#65758b" },
  totals: { borderTopWidth: 1, borderTopColor: "#edf1f5", paddingTop: 10, marginTop: "auto" },
  sub: { color: "#65758b", fontSize: 13 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8 },
  totalLabel: { fontWeight: "800", color: "#152238", fontSize: 16 },
  total: { fontWeight: "900", color: "#12715b", fontSize: 22 }
});
