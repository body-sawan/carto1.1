import { View, Text, StyleSheet } from "react-native";
import type { CartSnapshot } from "../store/cartUiStore";

interface ConnectionStatusProps {
  connected: boolean;
  snapshot: CartSnapshot | null;
  lastUpdateAt: string | null;
  variant?: "bar" | "floating";
}

export function ConnectionStatus({ connected, snapshot, lastUpdateAt, variant = "bar" }: ConnectionStatusProps) {
  const lastUpdate = lastUpdateAt ? new Date(lastUpdateAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "not synced";

  return (
    <View style={[styles.container, variant === "floating" && styles.floating]}>
      <View style={styles.brandGroup}>
        <Text style={styles.brand}>Carto</Text>
        <View style={styles.statusGroup}>
          <View style={[styles.dot, connected ? styles.onlineDot : styles.offlineDot]} />
          <Text style={styles.statusText}>{connected ? "Connected" : "Offline"}</Text>
        </View>
      </View>
      <View style={styles.metaGroup}>
        <Text style={styles.state}>{snapshot?.state ?? "BOOTING"}</Text>
        <Text style={styles.lastUpdate}>Updated {lastUpdate}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  floating: {
    position: "absolute",
    top: 22,
    right: 24,
    minHeight: 44,
    paddingVertical: 8,
    shadowColor: "#132033",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  },
  brandGroup: { flexDirection: "row", alignItems: "center", gap: 12 },
  brand: { color: "#142033", fontSize: 20, fontWeight: "900" },
  statusGroup: { flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { width: 9, height: 9, borderRadius: 999 },
  onlineDot: { backgroundColor: "#059669" },
  offlineDot: { backgroundColor: "#dc2626" },
  statusText: { color: "#475569", fontWeight: "800", fontSize: 12 },
  metaGroup: { alignItems: "flex-end", gap: 2 },
  state: { color: "#142033", fontWeight: "900", fontSize: 12 },
  lastUpdate: { color: "#64748b", fontWeight: "700", fontSize: 11 }
});
