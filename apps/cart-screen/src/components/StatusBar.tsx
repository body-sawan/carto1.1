import { View, Text, StyleSheet } from "react-native";
import type { CartSnapshot } from "../store/cartUiStore";

export function CartStatusBar({ connected, snapshot }: { connected: boolean; snapshot: CartSnapshot | null }) {
  const latestAlert = snapshot?.alerts.at(-1);
  return (
    <View style={styles.bar}>
      <View style={styles.group}>
        <Text style={styles.brand}>Carto</Text>
        <Text style={styles.pill}>{connected ? "EDGE CONNECTED" : "OFFLINE"}</Text>
        <Text style={styles.state}>{snapshot?.state ?? "BOOTING"}</Text>
      </View>
      <Text style={styles.alert} numberOfLines={1}>{latestAlert?.message ?? "Waiting for edge snapshot."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, paddingHorizontal: 20, backgroundColor: "#132033" },
  group: { flexDirection: "row", alignItems: "center", gap: 12 },
  brand: { color: "#ffffff", fontSize: 24, fontWeight: "900" },
  pill: { color: "#ffffff", backgroundColor: "#12715b", borderRadius: 8, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: "900" },
  state: { color: "#c7d2e3", fontWeight: "800" },
  alert: { flex: 1, textAlign: "right", color: "#edf5ff", fontWeight: "600" }
});
