import { StyleSheet, Text, View } from "react-native";
import type { DimensionValue } from "react-native";
import { ListChecks, ScanBarcode } from "lucide-react-native";
import type { CartSnapshot } from "../store/cartUiStore";
import { getProgress, isGuestShopping } from "./shopperUtils";

export function ShoppingProgressBar({ snapshot }: { snapshot: CartSnapshot | null }) {
  const guestMode = isGuestShopping(snapshot);
  const progress = getProgress(snapshot);
  const width: DimensionValue = `${Math.max(0, Math.min(100, progress.ratio * 100))}%`;

  return (
    <View style={styles.card}>
      {guestMode ? (
        <View style={styles.guestRow}>
          <View style={styles.iconCircle}>
            <ScanBarcode size={24} color="#1d4ed8" />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>Guest shopping</Text>
            <Text style={styles.sub}>Scan items to add them to your cart.</Text>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.row}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <ListChecks size={24} color="#1d4ed8" />
              </View>
              <Text style={styles.title}>Shopping progress</Text>
            </View>
            <Text style={styles.count}>{progress.collected} of {progress.required} collected</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width }]} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 98,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7dee8",
    padding: 18,
    justifyContent: "center",
    gap: 12
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  guestRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  copy: { flex: 1, gap: 4 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center"
  },
  title: { color: "#0f172a", fontSize: 20, fontWeight: "900" },
  sub: { color: "#64748b", fontSize: 15, fontWeight: "800" },
  count: { color: "#1d4ed8", fontSize: 16, fontWeight: "900" },
  track: { height: 12, borderRadius: 999, overflow: "hidden", backgroundColor: "#e2e8f0" },
  fill: { height: "100%", borderRadius: 999, backgroundColor: "#1d4ed8" }
});
