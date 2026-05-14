import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { ShoppingListItem } from "@carto/shared";
import { formatMoney } from "./TotalsCard";
import { formatItemStatus, formatLocation, isPendingListItem, type ShopperItemDetails } from "./shopperUtils";

interface ItemDetailsModalProps {
  details: ShopperItemDetails | null;
  onClose: () => void;
  onCantFind: (item: ShoppingListItem) => void;
}

export function ItemDetailsModal({ details, onClose, onCantFind }: ItemDetailsModalProps) {
  const listItem = details?.kind === "shopping-list" ? details.item : details?.listItem;
  const name = details?.kind === "cart" ? details.item.name : details?.item.name;
  const needed = listItem?.quantity;
  const inCart = details?.kind === "shopping-list" ? details.cartQuantity : details?.item.quantity;
  const price = details?.kind === "cart" ? details.item.unitPrice : details?.item.price;
  const status = formatItemStatus(listItem?.status);
  const locationSource = details?.kind === "cart" ? (details.listItem ?? details.item) : details?.item;
  const showCantFind = details?.kind === "shopping-list" && isPendingListItem(details.item);

  return (
    <Modal transparent visible={Boolean(details)} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.modal}>
          <Text style={styles.title} numberOfLines={2}>{name ?? "Item details"}</Text>
          <View style={styles.grid}>
            <Detail label="Quantity needed" value={needed === undefined ? "Not on list" : String(needed)} />
            <Detail label="Quantity in cart" value={String(inCart ?? 0)} />
            <Detail label="Price" value={price === undefined ? "Not available" : formatMoney(price)} />
            <Detail label="Category / section" value={locationSource?.category ?? "Not available"} />
            <Detail label="Location" value={formatLocation(locationSource)} />
            <Detail label="Map node" value={locationSource?.mapNodeId ?? "Not available"} />
            <Detail label="Status" value={status} />
          </View>
          <View style={styles.actions}>
            {showCantFind ? (
              <Pressable accessibilityRole="button" onPress={() => onCantFind(details.item)} style={({ pressed }) => [styles.primary, pressed ? styles.pressed : null]}>
                <Text style={styles.primaryText}>Can't find it</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.secondary, pressed ? styles.pressed : null]}>
              <Text style={styles.secondaryText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15, 23, 42, 0.45)" },
  modal: {
    width: "100%",
    maxWidth: 560,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: "#dbe4ee"
  },
  title: { color: "#142033", fontSize: 28, fontWeight: "900", textAlign: "center" },
  grid: { gap: 10 },
  detail: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12
  },
  label: { flex: 1, color: "#64748b", fontSize: 14, fontWeight: "900" },
  value: { flex: 1, color: "#142033", fontSize: 15, fontWeight: "900", textAlign: "right" },
  actions: { gap: 10 },
  primary: { minHeight: 56, borderRadius: 12, backgroundColor: "#0f766e", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  secondary: { minHeight: 56, borderRadius: 12, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  pressed: { opacity: 0.82 },
  primaryText: { color: "#ffffff", fontSize: 17, fontWeight: "900" },
  secondaryText: { color: "#142033", fontSize: 17, fontWeight: "900" }
});
