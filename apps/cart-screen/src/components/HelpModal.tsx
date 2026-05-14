import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

interface HelpModalProps {
  visible: boolean;
  initialMessage?: string | null;
  onClose: () => void;
}

const HELP_MESSAGES = {
  product: "Product search coming soon.",
  scanner: "Please scan the barcode again or ask staff.",
  payment: "Please try again or ask staff.",
  staff: "Staff assistance requested."
};

export function HelpModal({ visible, initialMessage, onClose }: HelpModalProps) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible && initialMessage) setMessage(initialMessage);
  }, [initialMessage, visible]);

  function close() {
    setMessage(null);
    onClose();
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={close} />
        <View style={styles.modal}>
          <Text style={styles.title}>Need help?</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <Action label="Find a product" onPress={() => setMessage(HELP_MESSAGES.product)} />
            <Action label="Scanner problem" onPress={() => setMessage(HELP_MESSAGES.scanner)} />
            <Action label="Payment problem" onPress={() => setMessage(HELP_MESSAGES.payment)} />
            <Action label="Call staff" onPress={() => setMessage(HELP_MESSAGES.staff)} />
            <Action label="Close" onPress={close} quiet />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Action({ label, onPress, quiet }: { label: string; onPress: () => void; quiet?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, quiet ? styles.quiet : null, pressed ? styles.pressed : null]}>
      <Text style={[styles.buttonText, quiet ? styles.quietText : null]}>{label}</Text>
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
  title: { color: "#142033", fontSize: 30, fontWeight: "900", textAlign: "center" },
  message: {
    color: "#0f766e",
    backgroundColor: "#ccfbf1",
    overflow: "hidden",
    borderRadius: 12,
    padding: 14,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center"
  },
  actions: { gap: 10 },
  button: { minHeight: 56, borderRadius: 12, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  quiet: { backgroundColor: "#f1f5f9" },
  pressed: { opacity: 0.82 },
  buttonText: { color: "#ffffff", fontSize: 17, fontWeight: "900" },
  quietText: { color: "#142033" }
});
