import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { CartSnapshot } from "@carto/shared";
import { formatMoney } from "./TotalsCard";

interface SmartReceiptScreenProps {
  snapshot: CartSnapshot;
}

export function SmartReceiptScreen({ snapshot }: SmartReceiptScreenProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.receipt}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Smart Receipt</Text>
            <Text style={styles.subtitle}>Waiting for payment confirmation</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{snapshot.payment.status}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.items}>
          {snapshot.cartItems.map((item) => (
            <View key={item.lineId} style={styles.itemRow}>
              <View style={styles.itemNameCell}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>Qty {item.quantity}</Text>
              </View>
              <Text style={styles.money}>{formatMoney(item.unitPrice)}</Text>
              <Text style={styles.lineTotal}>{formatMoney(item.lineTotal)}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.totals}>
          <Line label="Subtotal" value={snapshot.totals.subtotal} />
          <Line label="Discount" value={snapshot.totals.discount} />
          <Line label="Tax" value={snapshot.totals.tax} />
          <View style={styles.finalTotal}>
            <Text style={styles.finalLabel}>Final total</Text>
            <Text style={styles.finalValue}>{formatMoney(snapshot.totals.total)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.totalLine}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>{formatMoney(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#eef2f6", padding: 24, justifyContent: "center" },
  receipt: {
    flex: 1,
    maxWidth: 980,
    width: "100%",
    alignSelf: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    gap: 18
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16 },
  title: { color: "#142033", fontSize: 34, fontWeight: "900" },
  subtitle: { color: "#475569", fontSize: 17, fontWeight: "800", marginTop: 6 },
  statusPill: { borderRadius: 999, backgroundColor: "#dbeafe", paddingHorizontal: 14, paddingVertical: 9 },
  statusText: { color: "#1d4ed8", fontSize: 13, fontWeight: "900" },
  items: { gap: 10, paddingVertical: 2 },
  itemRow: {
    minHeight: 70,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  itemNameCell: { flex: 1, minWidth: 0 },
  itemName: { color: "#142033", fontSize: 17, fontWeight: "900" },
  itemMeta: { color: "#64748b", fontSize: 13, fontWeight: "800", marginTop: 4 },
  money: { width: 150, color: "#334155", fontSize: 15, fontWeight: "800", textAlign: "right" },
  lineTotal: { width: 160, color: "#142033", fontSize: 17, fontWeight: "900", textAlign: "right" },
  totals: { borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 16, gap: 8 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  totalLabel: { color: "#64748b", fontSize: 15, fontWeight: "800" },
  totalValue: { color: "#334155", fontSize: 15, fontWeight: "800" },
  finalTotal: {
    marginTop: 6,
    minHeight: 64,
    borderRadius: 12,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  finalLabel: { color: "#065f46", fontSize: 18, fontWeight: "900" },
  finalValue: { color: "#047857", fontSize: 28, fontWeight: "900" }
});
