import { View, Text, StyleSheet } from "react-native";
import type { Totals } from "@carto/shared";

export function TotalsCard({ totals }: { totals: Totals | undefined }) {
  return (
    <View style={styles.card}>
      <Line label="Subtotal" value={totals?.subtotal} />
      <Line label="Discount" value={totals?.discount} />
      <Line label="Tax" value={totals?.tax} />
      <View style={styles.totalLine}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatMoney(totals?.total)}</Text>
      </View>
    </View>
  );
}

function Line({ label, value }: { label: string; value?: number }) {
  return (
    <View style={styles.line}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{formatMoney(value)}</Text>
    </View>
  );
}

export function formatMoney(value = 0) {
  return `${value.toFixed(2)} EGP`;
}

const styles = StyleSheet.create({
  card: { borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 14, gap: 8 },
  line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  label: { color: "#64748b", fontSize: 13, fontWeight: "800" },
  value: { color: "#334155", fontSize: 13, fontWeight: "800" },
  totalLine: {
    marginTop: 6,
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  totalLabel: { color: "#065f46", fontSize: 16, fontWeight: "900" },
  totalValue: { color: "#047857", fontSize: 22, fontWeight: "900" }
});
