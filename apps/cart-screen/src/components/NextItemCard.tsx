import { Pressable, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, MapPin, Search } from "lucide-react-native";
import type { ShoppingListItem } from "@carto/shared";
import type { CartSnapshot } from "../store/cartUiStore";
import { formatLocation, getNextListItem, isGuestShopping } from "./shopperUtils";

interface NextItemCardProps {
  snapshot: CartSnapshot | null;
  onCantFind: (item: ShoppingListItem) => void;
}

export function NextItemCard({ snapshot, onCantFind }: NextItemCardProps) {
  const guestMode = isGuestShopping(snapshot);
  const nextItem = getNextListItem(snapshot);

  return (
    <View style={styles.card}>
      {guestMode ? (
        <>
          <Text style={styles.eyebrow}>No list active</Text>
          <Text style={styles.name}>Scan products to add them to your cart.</Text>
          <Text style={styles.support}>Your cart total will update as items are scanned.</Text>
        </>
      ) : nextItem ? (
        <>
          <View style={styles.topLine}>
            <Text style={styles.eyebrow}>Next item</Text>
            <Text style={styles.qtyPill}>{nextItem.inCartQuantity} / {nextItem.quantity}</Text>
          </View>
          <Text style={styles.name} numberOfLines={2}>{nextItem.name}</Text>
          <View style={styles.locationRow}>
            <View style={styles.locationIcon}>
              <MapPin size={24} color="#064e3b" />
            </View>
            <View style={styles.locationCopy}>
              <Text style={styles.location}>Go to {formatLocation(nextItem)}</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={() => onCantFind(nextItem)} style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}>
            <Search size={21} color="#ffffff" />
            <Text style={styles.buttonText}>Can't find it</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.doneIcon}>
            <CheckCircle2 size={32} color="#064e3b" />
          </View>
          <Text style={styles.eyebrow}>All listed items collected</Text>
          <Text style={styles.name}>You can continue shopping or checkout.</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 230,
    borderRadius: 18,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    padding: 22,
    gap: 14,
    justifyContent: "center"
  },
  topLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  eyebrow: { color: "#047857", fontSize: 15, fontWeight: "900", textTransform: "uppercase" },
  qtyPill: {
    minWidth: 74,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#ffffff",
    color: "#064e3b",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900"
  },
  name: { color: "#0f172a", fontSize: 34, fontWeight: "900", lineHeight: 40 },
  support: { color: "#475569", fontSize: 17, fontWeight: "800", lineHeight: 24 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  locationIcon: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    alignItems: "center",
    justifyContent: "center"
  },
  locationCopy: { flex: 1, gap: 4 },
  location: { color: "#064e3b", fontSize: 18, fontWeight: "900" },
  button: {
    marginTop: 4,
    minHeight: 58,
    borderRadius: 12,
    backgroundColor: "#047857",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 18
  },
  buttonPressed: { backgroundColor: "#065f46" },
  buttonText: { color: "#ffffff", fontSize: 18, fontWeight: "900" },
  doneIcon: {
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bbf7d0"
  }
});
