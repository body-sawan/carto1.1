import { View, Text, StyleSheet } from "react-native";
import { MapPin } from "lucide-react-native";
import type { CartSnapshot } from "../store/cartUiStore";

const nodes = [
  { id: "entrance", label: "Entrance", x: 4, y: 78 },
  { id: "produce_01", label: "Produce", x: 22, y: 58 },
  { id: "bakery_01", label: "Bakery", x: 52, y: 58 },
  { id: "grocery_01", label: "Grocery", x: 52, y: 24 },
  { id: "dairy_01", label: "Dairy", x: 22, y: 24 },
  { id: "meat_01", label: "Meat", x: 82, y: 24 },
  { id: "checkout", label: "Checkout", x: 88, y: 78 }
];

export function StoreMapPanel({ snapshot }: { snapshot: CartSnapshot | null }) {
  const routeNodes = new Set(snapshot?.route.nodes ?? []);
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Store Map</Text>
        <Text style={styles.next}>Next: {snapshot?.route.nextTarget ?? "None"}</Text>
      </View>
      <View style={styles.map}>
        {nodes.map((node) => {
          const active = node.id === snapshot?.position.nodeId;
          const routed = routeNodes.has(node.id);
          return (
            <View key={node.id} style={[styles.node, { left: `${node.x}%`, top: `${node.y}%` }, routed && styles.routed, active && styles.active]}>
              {active ? <MapPin size={15} color="#ffffff" /> : null}
              <Text style={[styles.nodeText, active && styles.activeText]}>{node.label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.path}>Route: {(snapshot?.route.nodes ?? []).join(" -> ") || "Waiting for list"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1.15, backgroundColor: "#ffffff", borderRadius: 8, padding: 16, gap: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: "#152238" },
  next: { fontSize: 13, color: "#12715b", fontWeight: "700" },
  map: { height: 250, backgroundColor: "#f6f8fb", borderRadius: 8, borderWidth: 1, borderColor: "#e3e9f1", position: "relative" },
  node: { position: "absolute", minWidth: 74, minHeight: 34, marginLeft: -37, marginTop: -17, borderRadius: 8, backgroundColor: "#dfe7f1", alignItems: "center", justifyContent: "center", paddingHorizontal: 8, flexDirection: "row", gap: 4 },
  routed: { backgroundColor: "#c9eee2" },
  active: { backgroundColor: "#12715b" },
  nodeText: { fontSize: 11, fontWeight: "800", color: "#33445f" },
  activeText: { color: "#ffffff" },
  path: { color: "#65758b", fontSize: 12 }
});
