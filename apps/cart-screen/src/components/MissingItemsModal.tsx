import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ShoppingListItem } from "@carto/shared";

interface MissingItemsModalProps {
  visible: boolean;
  items: ShoppingListItem[];
  onKeepShopping: () => void;
  onCheckoutAnyway: () => void;
}

export function MissingItemsModal({ visible, items, onKeepShopping, onCheckoutAnyway }: MissingItemsModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onKeepShopping}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onKeepShopping} />
        <View style={styles.modal}>
          <Text style={styles.title}>Some items are still missing</Text>
          <ScrollView style={styles.scroller} contentContainerStyle={styles.list}>
            {items.map((item) => (
              <View key={item.productId} style={styles.row}>
                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.quantity}>{item.inCartQuantity} / {item.quantity}</Text>
              </View>
            ))}
          </ScrollView>
          <Text style={styles.message}>You can keep shopping or checkout anyway.</Text>
          <View style={styles.actions}>
            <Action label="Keep Shopping" onPress={onKeepShopping} secondary />
            <Action label="Checkout Anyway" onPress={onCheckoutAnyway} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Action({ label, onPress, secondary }: { label: string; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, secondary ? styles.secondary : null, pressed ? styles.pressed : null]}
    >
      <Text style={[styles.buttonText, secondary ? styles.secondaryText : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15, 23, 42, 0.45)" },
  modal: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "86%",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: "#dbe4ee"
  },
  title: { color: "#142033", fontSize: 28, fontWeight: "900", textAlign: "center" },
  scroller: { maxHeight: 260 },
  list: { gap: 10 },
  row: {
    minHeight: 64,
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
  name: { flex: 1, color: "#142033", fontSize: 16, fontWeight: "900" },
  quantity: { color: "#b45309", fontSize: 16, fontWeight: "900" },
  message: { color: "#475569", fontSize: 17, fontWeight: "800", textAlign: "center" },
  actions: { flexDirection: "row", gap: 10 },
  button: { flex: 1, minHeight: 58, borderRadius: 12, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  secondary: { backgroundColor: "#f1f5f9" },
  pressed: { opacity: 0.82 },
  buttonText: { color: "#ffffff", fontSize: 17, fontWeight: "900", textAlign: "center" },
  secondaryText: { color: "#142033" }
});
