import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { CartSnapshot } from "../store/cartUiStore";
import { formatMoney } from "./TotalsCard";

interface AdminPanelProps {
  connected: boolean;
  snapshot: CartSnapshot | null;
  visible: boolean;
  onClose: () => void;
  onResetSession: () => void;
  onStartCheckout: () => void;
}

export function AdminPanel({ connected, snapshot, visible, onClose, onResetSession, onStartCheckout }: AdminPanelProps) {
  const cartItemCount = snapshot?.cartItems.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const canStartCheckout = connected && snapshot?.state === "SHOPPING" && cartItemCount > 0;

  function handleResetSession() {
    onResetSession();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.scrim} />
        <View style={styles.panel}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Developer Panel</Text>
              <Text style={styles.subtitle}>Local demo controls</Text>
            </View>
            <View style={[styles.connectionPill, connected ? styles.connectedPill : styles.offlinePill]}>
              <Text style={[styles.connectionText, connected ? styles.connectedText : styles.offlineText]}>
                {connected ? "Connected" : "Offline"}
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Snapshot</Text>
              <InfoRow label="Cart ID" value={snapshot?.cartId ?? "not available"} />
              <InfoRow label="Session ID" value={snapshot?.sessionId ?? "not available"} />
              <InfoRow label="State" value={snapshot?.state ?? "BOOTING"} />
              <InfoRow label="Pairing Code" value={snapshot?.pairing?.pairingCode ?? "not available"} />
              <InfoRow label="Item Count" value={String(cartItemCount)} />
              <InfoRow label="Subtotal" value={formatMoney(snapshot?.totals.subtotal ?? 0)} />
              <InfoRow label="Total" value={formatMoney(snapshot?.totals.total ?? 0)} />
              <InfoRow label="Payment" value={snapshot?.payment.status ?? "NOT_STARTED"} />
              <InfoRow label="Connection" value={connected ? "Connected" : "Offline"} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actions</Text>
              <Pressable accessibilityRole="button" disabled={!connected} onPress={handleResetSession} style={({ pressed }) => [styles.actionButton, !connected ? styles.actionDisabled : null, pressed && connected ? styles.actionPressed : null]}>
                <Text style={[styles.actionText, !connected ? styles.actionTextDisabled : null]}>Reset Session</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={!canStartCheckout} onPress={onStartCheckout} style={({ pressed }) => [styles.actionButton, !canStartCheckout ? styles.actionDisabled : null, pressed && canStartCheckout ? styles.actionPressed : null]}>
                <Text style={[styles.actionText, !canStartCheckout ? styles.actionTextDisabled : null]}>Start Checkout</Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Simulation</Text>
              <Text style={styles.instruction}>Payment Success: use CLI command `pay success`.</Text>
              <Text style={styles.instruction}>Payment Fail: use CLI command `pay fail`.</Text>
            </View>
          </ScrollView>

          <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed ? styles.closePressed : null]}>
            <Text style={styles.closeText}>Close Panel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.42)"
  },
  panel: {
    width: "100%",
    maxWidth: 760,
    maxHeight: "92%",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 24,
    gap: 16,
    shadowColor: "#132033",
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8
  },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16 },
  title: { color: "#142033", fontSize: 32, fontWeight: "900" },
  subtitle: { color: "#64748b", fontSize: 15, fontWeight: "800", marginTop: 4 },
  connectionPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  connectedPill: { backgroundColor: "#dcfce7" },
  offlinePill: { backgroundColor: "#fee2e2" },
  connectionText: { fontSize: 12, fontWeight: "900" },
  connectedText: { color: "#047857" },
  offlineText: { color: "#be123c" },
  content: { gap: 14, paddingBottom: 2 },
  section: {
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 10
  },
  sectionTitle: { color: "#142033", fontSize: 18, fontWeight: "900" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 14 },
  infoLabel: { color: "#64748b", fontSize: 13, fontWeight: "800" },
  infoValue: { flex: 1, color: "#142033", fontSize: 13, fontWeight: "900", textAlign: "right" },
  actionButton: {
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  actionPressed: { backgroundColor: "#1d4ed8" },
  actionDisabled: { backgroundColor: "#cbd5e1" },
  actionText: { color: "#ffffff", fontSize: 17, fontWeight: "900" },
  actionTextDisabled: { color: "#64748b" },
  instruction: { color: "#334155", fontSize: 14, fontWeight: "800", lineHeight: 21 },
  closeButton: {
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  closePressed: { backgroundColor: "#e2e8f0" },
  closeText: { color: "#334155", fontSize: 17, fontWeight: "900" }
});
