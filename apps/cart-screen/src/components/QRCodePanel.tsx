import { Pressable, View, Text, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import type { CartSnapshot } from "../store/cartUiStore";

interface QRCodePanelProps {
  connected: boolean;
  snapshot: CartSnapshot | null;
  onStartShopping: () => void;
}

export function QRCodePanel({ connected, snapshot, onStartShopping }: QRCodePanelProps) {
  const pairing = snapshot?.pairing;
  return (
    <View style={styles.panel}>
      <View style={styles.copy}>
        <Text style={styles.title}>Scan to Start Shopping</Text>
        <Text style={styles.subtitle}>Scan the QR to load your shopping list.</Text>
      </View>
      <View style={styles.qrBox}>
        {pairing ? <QRCode value={pairing.qrPayload} size={236} /> : <Text style={styles.loading}>Starting pairing...</Text>}
      </View>
      <Text style={styles.orText}>or</Text>
      <Pressable
        accessibilityRole="button"
        disabled={!connected}
        onPress={onStartShopping}
        style={({ pressed }) => [
          styles.startButton,
          !connected ? styles.startButtonDisabled : null,
          pressed && connected ? styles.startButtonPressed : null
        ]}
      >
        <Text style={[styles.startButtonText, !connected ? styles.startButtonTextDisabled : null]}>
          Start Shopping
        </Text>
        <Text style={[styles.startButtonSub, !connected ? styles.startButtonTextDisabled : null]}>
          No list needed
        </Text>
      </Pressable>
      <View style={styles.codeBlock}>
        <Text style={styles.codeLabel}>Pairing Code</Text>
        <Text style={styles.code}>{pairing?.pairingCode ?? "------"}</Text>
      </View>
      {pairing?.bluetoothDeviceName ? <Text style={styles.meta}>Bluetooth: {pairing.bluetoothDeviceName}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 34,
    gap: 24,
    alignItems: "center",
    shadowColor: "#132033",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8
  },
  copy: { alignItems: "center", gap: 8 },
  title: { fontSize: 32, fontWeight: "900", color: "#142033", textAlign: "center" },
  subtitle: { maxWidth: 420, fontSize: 16, lineHeight: 23, color: "#64748b", textAlign: "center" },
  qrBox: {
    width: 284,
    height: 284,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  loading: { color: "#64748b", fontWeight: "700" },
  orText: { marginTop: -8, marginBottom: -8, color: "#64748b", fontSize: 13, fontWeight: "900", textTransform: "uppercase" },
  startButton: {
    width: "100%",
    maxWidth: 320,
    minHeight: 68,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 10
  },
  startButtonPressed: { backgroundColor: "#1d4ed8" },
  startButtonDisabled: { backgroundColor: "#cbd5e1" },
  startButtonText: { color: "#ffffff", fontSize: 20, fontWeight: "900" },
  startButtonSub: { color: "#dbeafe", fontSize: 13, fontWeight: "900", marginTop: 3 },
  startButtonTextDisabled: { color: "#64748b" },
  codeBlock: { alignItems: "center", gap: 4 },
  codeLabel: { fontSize: 12, fontWeight: "900", color: "#64748b", textTransform: "uppercase" },
  code: { fontSize: 36, fontWeight: "900", letterSpacing: 0, color: "#047857" },
  meta: { fontSize: 14, color: "#64748b", fontWeight: "700" }
});
