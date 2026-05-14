import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { CartSnapshot } from "../store/cartUiStore";
import { formatMoney } from "./TotalsCard";

interface EndSessionModalProps {
  visible: boolean;
  snapshot: CartSnapshot | null;
  connected: boolean;
  onKeepShopping: () => void;
  onEndSession: () => void;
}

export function EndSessionModal({ visible, snapshot, connected, onKeepShopping, onEndSession }: EndSessionModalProps) {
  const itemCount = (snapshot?.cartItems ?? []).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onKeepShopping}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onKeepShopping} />
        <View style={styles.modal}>
          <Text style={styles.title}>End shopping session?</Text>
          <Text style={styles.message}>Your cart has {itemCount} items.</Text>
          <Text style={styles.total}>Total: {formatMoney(snapshot?.totals.total)}</Text>
          {itemCount > 0 ? <Text style={styles.warning}>Please remove physical items from the cart before ending.</Text> : null}
          <View style={styles.actions}>
            <Action label="Keep Shopping" onPress={onKeepShopping} secondary />
            <Action label="End Session" onPress={onEndSession} disabled={!connected} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Action({ label, onPress, disabled, secondary }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, secondary ? styles.secondary : null, disabled ? styles.disabled : null, pressed && !disabled ? styles.pressed : null]}
    >
      <Text style={[styles.buttonText, secondary ? styles.secondaryText : null, disabled ? styles.disabledText : null]}>{label}</Text>
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
    gap: 12,
    borderWidth: 1,
    borderColor: "#dbe4ee"
  },
  title: { color: "#142033", fontSize: 30, fontWeight: "900", textAlign: "center" },
  message: { color: "#475569", fontSize: 18, fontWeight: "800", textAlign: "center" },
  total: { color: "#047857", fontSize: 22, fontWeight: "900", textAlign: "center" },
  warning: {
    color: "#92400e",
    backgroundColor: "#fef3c7",
    overflow: "hidden",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 23
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  button: { flex: 1, minHeight: 58, borderRadius: 12, backgroundColor: "#be123c", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  secondary: { backgroundColor: "#f1f5f9" },
  disabled: { backgroundColor: "#cbd5e1" },
  pressed: { opacity: 0.82 },
  buttonText: { color: "#ffffff", fontSize: 17, fontWeight: "900", textAlign: "center" },
  secondaryText: { color: "#142033" },
  disabledText: { color: "#64748b" }
});
