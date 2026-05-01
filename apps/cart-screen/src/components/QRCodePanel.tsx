import { View, Text, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import type { CartSnapshot } from "../store/cartUiStore";

export function QRCodePanel({ snapshot }: { snapshot: CartSnapshot | null }) {
  const pairing = snapshot?.pairing;
  return (
    <View style={styles.panel}>
      <View style={styles.copy}>
        <Text style={styles.title}>Scan to Start Shopping</Text>
        <Text style={styles.subtitle}>Scan this QR code from your phone to send your shopping list.</Text>
      </View>
      <View style={styles.qrBox}>
        {pairing ? <QRCode value={pairing.qrPayload} size={236} /> : <Text style={styles.loading}>Starting pairing...</Text>}
      </View>
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
  codeBlock: { alignItems: "center", gap: 4 },
  codeLabel: { fontSize: 12, fontWeight: "900", color: "#64748b", textTransform: "uppercase" },
  code: { fontSize: 36, fontWeight: "900", letterSpacing: 0, color: "#047857" },
  meta: { fontSize: 14, color: "#64748b", fontWeight: "700" }
});
