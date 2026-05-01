import { View, Text, StyleSheet } from "react-native";
import { Map, Navigation } from "lucide-react-native";

export function StoreMapPlaceholderPanel() {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Store Map</Text>
        <Text style={styles.badge}>Placeholder</Text>
      </View>
      <View style={styles.mapCard}>
        <View style={styles.aisles}>
          <View style={[styles.aisle, styles.aisleTall]} />
          <View style={styles.aisle} />
          <View style={[styles.aisle, styles.aisleTall]} />
          <View style={styles.aisle} />
        </View>
        <View style={styles.routeLine} />
        <View style={[styles.node, styles.nodeStart]}>
          <Navigation size={18} color="#ffffff" />
        </View>
        <View style={[styles.node, styles.nodeEnd]}>
          <Map size={18} color="#ffffff" />
        </View>
        <View style={styles.centerLabel}>
          <Text style={styles.placeholderTitle}>Map Placeholder</Text>
          <Text style={styles.placeholderSub}>Map module coming soon</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  title: { fontSize: 21, fontWeight: "900", color: "#142033" },
  badge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#e0f2fe",
    color: "#075985",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "900"
  },
  mapCard: {
    flex: 1,
    minHeight: 360,
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#dbe4ee",
    position: "relative"
  },
  aisles: {
    position: "absolute",
    left: 22,
    right: 22,
    top: 22,
    bottom: 22,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center"
  },
  aisle: { width: "16%", height: "58%", borderRadius: 10, backgroundColor: "#e2e8f0" },
  aisleTall: { height: "78%" },
  routeLine: {
    position: "absolute",
    left: "12%",
    right: "14%",
    top: "58%",
    height: 5,
    borderRadius: 999,
    backgroundColor: "#10b981",
    opacity: 0.75
  },
  node: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#047857"
  },
  nodeStart: { left: "9%", top: "52%" },
  nodeEnd: { right: "10%", top: "52%" },
  centerLabel: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: [{ translateX: -110 }, { translateY: -38 }],
    width: 220,
    minHeight: 76,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#dbe4ee"
  },
  placeholderTitle: { color: "#142033", fontSize: 18, fontWeight: "900" },
  placeholderSub: { color: "#64748b", fontSize: 13, fontWeight: "700", marginTop: 5 }
});
