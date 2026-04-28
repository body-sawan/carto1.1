import { View, Text, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import type { CartSnapshot } from "../store/cartUiStore";

export function QRCodePanel({ snapshot }: { snapshot: CartSnapshot | null }) {
  const pairing = snapshot?.pairing;
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Pair Shopping List</Text>
      <View style={styles.qrBox}>
        {pairing ? <QRCode value={pairing.qrPayload} size={156} /> : <Text>Starting...</Text>}
      </View>
      <Text style={styles.code}>{pairing?.pairingCode ?? "------"}</Text>
      <Text style={styles.url} numberOfLines={2}>{pairing?.receiveListUrl ?? "Waiting for pairing URL"}</Text>
      <Text style={styles.meta}>State: {snapshot?.state ?? "BOOTING"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: "#ffffff", borderRadius: 8, padding: 16, gap: 12, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: "#152238" },
  qrBox: { width: 180, height: 180, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f7fb", borderRadius: 8 },
  code: { fontSize: 28, fontWeight: "800", letterSpacing: 0, color: "#12715b" },
  url: { fontSize: 11, color: "#5d6b82", textAlign: "center" },
  meta: { fontSize: 13, color: "#5d6b82" }
});
