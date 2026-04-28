import { Pressable, Text, View, StyleSheet } from "react-native";
import { CreditCard, XCircle, CheckCircle2 } from "lucide-react-native";
import type { CartSnapshot } from "../store/cartUiStore";
import type { CartSocketClient } from "../realtime/socketClient";

export function CheckoutPanel({ snapshot, client, connected }: { snapshot: CartSnapshot | null; client: CartSocketClient; connected: boolean }) {
  return (
    <View style={styles.panel}>
      <View>
        <Text style={styles.title}>Checkout</Text>
        <Text style={styles.sub}>Payment: {snapshot?.payment.status ?? "NOT_STARTED"}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable disabled={!connected} onPress={() => client.send("command.checkout_start", {})} style={[styles.button, !connected && styles.disabled]}>
          <CreditCard size={18} color="#ffffff" />
          <Text style={styles.buttonText}>Start Checkout</Text>
        </Pressable>
        <Pressable disabled={!connected} onPress={() => client.send("command.payment_confirm", {})} style={[styles.iconButton, !connected && styles.disabled]}>
          <CheckCircle2 size={20} color="#ffffff" />
        </Pressable>
        <Pressable disabled={!connected} onPress={() => client.send("command.cancel_checkout", {})} style={[styles.iconButton, styles.cancel, !connected && styles.disabled]}>
          <XCircle size={20} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: "#ffffff", borderRadius: 8, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 18, fontWeight: "700", color: "#152238" },
  sub: { color: "#65758b", marginTop: 4 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  button: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#12715b", borderRadius: 8, paddingHorizontal: 14 },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", backgroundColor: "#12715b", borderRadius: 8 },
  cancel: { backgroundColor: "#9a3a31" },
  disabled: { opacity: 0.42 },
  buttonText: { color: "#ffffff", fontWeight: "900" }
});
