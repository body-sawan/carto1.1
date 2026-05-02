import { Pressable, StyleSheet, Text, View } from "react-native";

interface PaymentFailedModalProps {
  connected: boolean;
  onTryAgain: () => void;
}

export function PaymentFailedModal({ connected, onTryAgain }: PaymentFailedModalProps) {
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.scrim} />
      <View style={styles.modal}>
        <Text style={styles.title}>Payment Failed</Text>
        <Text style={styles.message}>Please try again.</Text>
        <Pressable
          accessibilityRole="button"
          disabled={!connected}
          onPress={onTryAgain}
          style={({ pressed }) => [
            styles.button,
            !connected ? styles.buttonDisabled : null,
            pressed && connected ? styles.buttonPressed : null
          ]}
        >
          <Text style={[styles.buttonText, !connected ? styles.buttonTextDisabled : null]}>Try Again</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.42)"
  },
  modal: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fecdd3",
    padding: 28,
    alignItems: "center",
    gap: 14
  },
  title: { color: "#be123c", fontSize: 30, fontWeight: "900", textAlign: "center" },
  message: { color: "#142033", fontSize: 18, fontWeight: "800", textAlign: "center" },
  button: {
    marginTop: 6,
    minHeight: 56,
    minWidth: 190,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22
  },
  buttonPressed: { backgroundColor: "#1d4ed8" },
  buttonDisabled: { backgroundColor: "#cbd5e1" },
  buttonText: { color: "#ffffff", fontSize: 17, fontWeight: "900" },
  buttonTextDisabled: { color: "#64748b" }
});
