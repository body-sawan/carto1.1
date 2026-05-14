import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { ShoppingListItem } from "@carto/shared";

interface CantFindItemModalProps {
  item: ShoppingListItem | null;
  connected: boolean;
  onClose: () => void;
  onShowLocation: () => void;
  onSkipItem: (item: ShoppingListItem) => void;
  onAskStaff: () => void;
}

export function CantFindItemModal({ item, connected, onClose, onShowLocation, onSkipItem, onAskStaff }: CantFindItemModalProps) {
  return (
    <Modal transparent visible={Boolean(item)} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.modal}>
          <Text style={styles.title}>Can't find this item?</Text>
          <Text style={styles.message}>Need help finding {item?.name ?? "this item"}?</Text>
          <View style={styles.actions}>
            <Action label="Show Location" onPress={onShowLocation} />
            <Action label="Skip Item" disabled={!connected || !item} onPress={() => item ? onSkipItem(item) : undefined} secondary />
            <Action label="Ask Staff" onPress={onAskStaff} secondary />
            <Action label="Cancel" onPress={onClose} quiet />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Action({ label, onPress, disabled, secondary, quiet }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; quiet?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.secondary : null,
        quiet ? styles.quiet : null,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null
      ]}
    >
      <Text style={[styles.buttonText, secondary || quiet ? styles.secondaryText : null, disabled ? styles.disabledText : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15, 23, 42, 0.45)" },
  modal: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: "#dbe4ee"
  },
  title: { color: "#142033", fontSize: 28, fontWeight: "900", textAlign: "center" },
  message: { color: "#475569", fontSize: 18, fontWeight: "800", textAlign: "center", lineHeight: 25 },
  actions: { gap: 10 },
  button: { minHeight: 56, borderRadius: 12, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  secondary: { backgroundColor: "#e0f2fe" },
  quiet: { backgroundColor: "#f1f5f9" },
  pressed: { opacity: 0.82 },
  disabled: { backgroundColor: "#cbd5e1" },
  buttonText: { color: "#ffffff", fontSize: 17, fontWeight: "900" },
  secondaryText: { color: "#142033" },
  disabledText: { color: "#64748b" }
});
