import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { CartSnapshot } from "../store/cartUiStore";
import { CART_EDGE_HTTP_URL } from "../realtime/config";
import { formatMoney } from "./TotalsCard";

interface AdminPanelProps {
  connected: boolean;
  snapshot: CartSnapshot | null;
  visible: boolean;
  onClose: () => void;
  onResetSession: () => void;
  onStartShopping: () => void;
  onStartCheckout: () => void;
  onRetryPayment: () => void;
  onCancelCheckout: () => void;
}

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  run: () => void | Promise<void>;
}

interface DevResponse {
  ok?: boolean;
  error?: string;
  message?: string;
}

const DEMO_PRODUCTS = [
  { id: "p_milk", label: "Milk 1L" },
  { id: "p_bread", label: "Bread" },
  { id: "p_eggs", label: "Eggs 12 Pack" },
  { id: "p_rice", label: "Rice 1kg" },
  { id: "p_apples", label: "Apples 1kg" },
  { id: "p_chicken", label: "Chicken Breast" }
];

const MOVE_TARGETS = [
  { id: "entrance", label: "Entrance" },
  { id: "produce_01", label: "Produce" },
  { id: "bakery_01", label: "Bakery" },
  { id: "grocery_01", label: "Grocery" },
  { id: "dairy_01", label: "Dairy" },
  { id: "meat_01", label: "Meat" },
  { id: "checkout", label: "Checkout" }
];

export function AdminPanel({
  connected,
  snapshot,
  visible,
  onClose,
  onResetSession,
  onStartShopping,
  onStartCheckout,
  onRetryPayment,
  onCancelCheckout
}: AdminPanelProps) {
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const cartItemCount = snapshot?.cartItems.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const shoppingListCount = snapshot?.shoppingList.length ?? 0;
  const canStartCheckout = connected && snapshot?.state === "SHOPPING" && cartItemCount > 0;
  const canStartShopping = connected && (snapshot?.state === "WAITING_FOR_LIST" || (snapshot?.state === "SHOPPING" && snapshot.shoppingMode === "GUEST"));
  const canRetryPayment = connected && snapshot?.state === "PAYMENT_FAILED";
  const canCancelCheckout = connected && (snapshot?.state === "CHECKOUT_PENDING" || snapshot?.state === "WAITING_PAYMENT");
  const canForcePayment = snapshot?.state === "WAITING_PAYMENT";
  const missingItems = snapshot?.shoppingList.filter((item) => item.inCartQuantity < item.quantity) ?? [];
  const rawSnapshot = useMemo(() => JSON.stringify(snapshot ?? {}, null, 2), [snapshot]);

  function setSuccess(text: string) {
    setFeedback({ kind: "success", text });
  }

  function setError(text: string) {
    setFeedback({ kind: "error", text });
  }

  async function runAction(label: string, action: () => void | Promise<void>) {
    try {
      await action();
      setSuccess(`${label} complete.`);
    } catch (error) {
      setError(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function postDev(path: string, body: unknown = {}): Promise<void> {
    let response: Response;
    try {
      response = await fetch(`${CART_EDGE_HTTP_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    } catch {
      throw new Error("Cart edge backend is not reachable.");
    }

    const data = await response.json().catch(() => null) as DevResponse | null;
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.message ?? data?.error ?? `HTTP ${response.status}`);
    }
  }

  function ask(confirmState: ConfirmState) {
    setConfirm(confirmState);
  }

  async function handleConfirm() {
    const next = confirm;
    if (!next) return;
    setConfirm(null);
    await runAction(next.confirmLabel, next.run);
  }

  function resetAndClose() {
    onResetSession();
    onClose();
  }

  function endSessionMessage() {
    return cartItemCount > 0
      ? "Please remove physical items from the cart before ending the session. This will reset the backend session."
      : "This will reset the backend session and return to the QR/start screen.";
  }

  async function scanProduct(productId: string, label: string) {
    await runAction(`Scan ${label}`, () => postDev("/dev/scan", { productId }));
  }

  async function removeProduct(productId: string, label: string) {
    await runAction(`Remove ${label}`, () => postDev("/dev/remove", { productId }));
  }

  async function moveCart(nodeId: string, label: string) {
    await runAction(`Move to ${label}`, () => postDev("/dev/move", { nodeId }));
  }

  function loadDemoShoppingList() {
    const run = () => postDev("/dev/bluetooth/list", {
      listId: "demo-list-admin",
      source: "admin-panel",
      createdAt: new Date().toISOString(),
      items: [
        { productId: "p_milk", name: "Milk 1L", quantity: 1 },
        { productId: "p_bread", name: "Bread", quantity: 2 },
        { productId: "p_apples", name: "Apples 1kg", quantity: 1 }
      ]
    });

    if (cartItemCount > 0 || shoppingListCount > 0) {
      ask({
        title: "Load Demo Shopping List",
        message: "This session already has cart items or a shopping list. Loading the demo list may be rejected unless the cart is waiting for a list.",
        confirmLabel: "Load Demo List",
        run
      });
      return;
    }

    void runAction("Load Demo List", run);
  }

  async function copyText(label: string, value: string | null | undefined) {
    if (!value) {
      setError(`${label} is not available.`);
      return;
    }

    const clipboard = typeof navigator !== "undefined"
      ? (navigator as Navigator & { clipboard?: { writeText: (text: string) => Promise<void> } }).clipboard
      : undefined;

    if (!clipboard) {
      setError("Copy is not supported in this environment.");
      return;
    }

    try {
      await clipboard.writeText(value);
      setSuccess(`${label} copied.`);
    } catch {
      setError(`Could not copy ${label}.`);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.scrim} />
        <View style={styles.panel}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Developer Panel</Text>
              <Text style={styles.subtitle}>Admin-only local demo controls</Text>
            </View>
            <View style={[styles.connectionPill, connected ? styles.connectedPill : styles.offlinePill]}>
              <Text style={[styles.connectionText, connected ? styles.connectedText : styles.offlineText]}>
                {connected ? "Connected" : "Offline"}
              </Text>
            </View>
          </View>

          {feedback ? (
            <View style={[styles.feedback, feedback.kind === "error" ? styles.feedbackError : styles.feedbackSuccess]}>
              <Text style={[styles.feedbackText, feedback.kind === "error" ? styles.feedbackTextError : styles.feedbackTextSuccess]}>
                {feedback.text}
              </Text>
            </View>
          ) : null}

          <ScrollView contentContainerStyle={styles.content}>
            <Section title="Session">
              <InfoRow label="cartId" value={snapshot?.cartId ?? "not available"} />
              <InfoRow label="sessionId" value={snapshot?.sessionId ?? "not available"} />
              <InfoRow label="pairingCode" value={snapshot?.pairing?.pairingCode ?? "not available"} />
              <InfoRow label="cart state" value={snapshot?.state ?? "BOOTING"} />
              <InfoRow label="shopping mode" value={snapshot?.shoppingMode ?? "not set"} />
              <View style={styles.buttonGrid}>
                <ActionButton label="Copy cartId" variant="secondary" onPress={() => void copyText("cartId", snapshot?.cartId)} />
                <ActionButton label="Copy sessionId" variant="secondary" onPress={() => void copyText("sessionId", snapshot?.sessionId)} />
                <ActionButton label="Copy pairingCode" variant="secondary" onPress={() => void copyText("pairingCode", snapshot?.pairing?.pairingCode)} />
              </View>
              <View style={styles.buttonGrid}>
                <ActionButton
                  label="Reset Session"
                  danger
                  disabled={!connected}
                  onPress={() => ask({
                    title: "Reset Session",
                    message: "Reset the backend session and return to the QR/start screen?",
                    confirmLabel: "Reset Session",
                    danger: true,
                    run: resetAndClose
                  })}
                />
                <ActionButton
                  label="End Current Session"
                  danger
                  disabled={!connected}
                  onPress={() => ask({
                    title: "End Current Session",
                    message: endSessionMessage(),
                    confirmLabel: "End Session",
                    danger: true,
                    run: resetAndClose
                  })}
                />
                <ActionButton
                  label="Start Shopping Without List"
                  disabled={!canStartShopping}
                  disabledReason={!connected ? "Offline" : "Only available from waiting/guest state"}
                  onPress={() => runAction("Start Shopping", onStartShopping)}
                />
              </View>
            </Section>

            <Section title="Cart">
              <InfoRow label="cart item lines" value={String(snapshot?.cartItems.length ?? 0)} />
              <InfoRow label="subtotal" value={formatMoney(snapshot?.totals.subtotal ?? 0)} />
              <InfoRow label="total" value={formatMoney(snapshot?.totals.total ?? 0)} />
              <Text style={styles.instruction}>Totals are recalculated automatically.</Text>
              <ActionButton label="Clear Cart Items" disabled disabledReason="Not available yet" />
              <Text style={styles.subheading}>Cart Items</Text>
              {!snapshot?.cartItems.length ? <Text style={styles.muted}>Cart is empty.</Text> : snapshot.cartItems.map((item) => (
                <View key={item.lineId} style={styles.listRow}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>{item.name}</Text>
                    <Text style={styles.listMeta}>Qty {item.quantity} | Unit {formatMoney(item.unitPrice)} | Line {formatMoney(item.lineTotal)}</Text>
                  </View>
                  <ActionButton label="Remove One" compact variant="secondary" onPress={() => void removeProduct(item.productId, item.name)} />
                </View>
              ))}
              <Text style={styles.subheading}>Manual Add Product</Text>
              <View style={styles.buttonGrid}>
                {DEMO_PRODUCTS.map((product) => (
                  <ActionButton key={product.id} label={product.label} compact onPress={() => void scanProduct(product.id, product.label)} />
                ))}
              </View>
            </Section>

            <Section title="Shopping List">
              {!snapshot?.shoppingList.length ? <Text style={styles.muted}>No shopping list loaded.</Text> : snapshot.shoppingList.map((item) => (
                <View key={item.productId} style={styles.listRow}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>{item.name}</Text>
                    <Text style={styles.listMeta}>Required {item.quantity} | Collected {item.inCartQuantity} | {item.status}</Text>
                  </View>
                </View>
              ))}
              <View style={styles.buttonGrid}>
                <ActionButton label="Load Demo Shopping List" onPress={loadDemoShoppingList} />
                <ActionButton label="Clear Shopping List" disabled disabledReason="Not available yet" />
              </View>
              <Text style={styles.subheading}>Missing Items Summary</Text>
              {!missingItems.length ? <Text style={styles.muted}>No missing list items.</Text> : missingItems.map((item) => (
                <Text key={item.productId} style={styles.instruction}>{item.name}: {item.inCartQuantity}/{item.quantity}</Text>
              ))}
            </Section>

            <Section title="Scanner / Dev Scan">
              <InfoRow label="Scanner Status" value="Simulator mode" />
              <Text style={styles.instruction}>Last scan not tracked yet.</Text>
              <View style={styles.buttonGrid}>
                {DEMO_PRODUCTS.map((product) => (
                  <ActionButton key={product.id} label={`Scan ${product.label}`} compact onPress={() => void scanProduct(product.id, product.label)} />
                ))}
                <ActionButton label="Simulate Unknown Barcode" compact danger onPress={() => void runAction("Unknown Barcode", () => postDev("/dev/scan", { barcode: "000000000000" }))} />
              </View>
            </Section>

            <Section title="Checkout & Payment">
              <InfoRow label="payment status" value={snapshot?.payment.status ?? "NOT_STARTED"} />
              <InfoRow label="payment amount" value={formatMoney(snapshot?.payment.amount ?? 0)} />
              <View style={styles.buttonGrid}>
                <ActionButton label="Start Checkout" disabled={!canStartCheckout} disabledReason="Needs SHOPPING state and cart items" onPress={() => runAction("Start Checkout", onStartCheckout)} />
                <ActionButton
                  label="Force Payment Success"
                  danger
                  disabled={!canForcePayment}
                  disabledReason="Requires WAITING_PAYMENT"
                  onPress={() => ask({
                    title: "Force Payment Success",
                    message: "Mark this simulated payment as successful?",
                    confirmLabel: "Payment Success",
                    danger: true,
                    run: () => postDev("/dev/payment/success")
                  })}
                />
                <ActionButton
                  label="Force Payment Fail"
                  danger
                  disabled={!canForcePayment}
                  disabledReason="Requires WAITING_PAYMENT"
                  onPress={() => ask({
                    title: "Force Payment Fail",
                    message: "Mark this simulated payment as failed?",
                    confirmLabel: "Payment Fail",
                    danger: true,
                    run: () => postDev("/dev/payment/failure")
                  })}
                />
                <ActionButton label="Retry Payment" disabled={!canRetryPayment} disabledReason="Requires PAYMENT_FAILED" onPress={() => runAction("Retry Payment", onRetryPayment)} />
                <ActionButton label="Cancel Checkout" disabled={!canCancelCheckout} disabledReason="Requires checkout/payment pending" onPress={() => runAction("Cancel Checkout", onCancelCheckout)} />
              </View>
            </Section>

            <Section title="Location / Route">
              <InfoRow label="current nodeId" value={snapshot?.position.nodeId ?? "not available"} />
              <InfoRow label="x / y" value={snapshot ? `${snapshot.position.x}, ${snapshot.position.y}` : "not available"} />
              <InfoRow label="next target" value={snapshot?.route.nextTarget ?? "none"} />
              <InfoRow label="route distance" value={String(snapshot?.route.distance ?? 0)} />
              <Text style={styles.instruction}>Route recalculates automatically.</Text>
              <Text style={styles.subheading}>Move Cart</Text>
              <View style={styles.buttonGrid}>
                {MOVE_TARGETS.map((target) => (
                  <ActionButton key={target.id} label={target.label} compact onPress={() => void moveCart(target.id, target.label)} />
                ))}
              </View>
              <Text style={styles.subheading}>Route Debug</Text>
              <Text style={styles.muted}>{snapshot?.route.nodes.length ? snapshot.route.nodes.join(" -> ") : "No route nodes."}</Text>
            </Section>

            <Section title="Debug">
              <InfoRow label="connected" value={connected ? "connected" : "disconnected"} />
              <InfoRow label="cartId" value={snapshot?.cartId ?? "not available"} />
              <InfoRow label="sessionId" value={snapshot?.sessionId ?? "not available"} />
              <InfoRow label="state" value={snapshot?.state ?? "BOOTING"} />
              <InfoRow label="pairingCode" value={snapshot?.pairing?.pairingCode ?? "not available"} />
              <InfoRow label="item count" value={String(cartItemCount)} />
              <InfoRow label="subtotal" value={formatMoney(snapshot?.totals.subtotal ?? 0)} />
              <InfoRow label="total" value={formatMoney(snapshot?.totals.total ?? 0)} />
              <InfoRow label="payment status" value={snapshot?.payment.status ?? "NOT_STARTED"} />
              <InfoRow label="current position" value={snapshot?.position.nodeId ?? "not available"} />
              <View style={styles.buttonGrid}>
                <ActionButton label="Copy Snapshot JSON" variant="secondary" onPress={() => void copyText("Snapshot JSON", rawSnapshot)} />
                <ActionButton label="Clear Alerts" disabled disabledReason="Not available yet" />
              </View>
              <Text style={styles.subheading}>Recent Alerts</Text>
              {!snapshot?.alerts.length ? <Text style={styles.muted}>No alerts.</Text> : snapshot.alerts.map((alert) => (
                <Text key={alert.id} style={styles.instruction}>{alert.level}: {alert.message}</Text>
              ))}
              <Text style={styles.subheading}>Raw Snapshot JSON</Text>
              <ScrollView style={styles.rawBox}>
                <Text style={styles.rawText}>{rawSnapshot}</Text>
              </ScrollView>
            </Section>
          </ScrollView>

          <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed ? styles.closePressed : null]}>
            <Text style={styles.closeText}>Close Panel</Text>
          </Pressable>
        </View>
      </View>
      <ConfirmModal state={confirm} onCancel={() => setConfirm(null)} onConfirm={() => void handleConfirm()} />
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={3}>{value}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  disabledReason,
  danger,
  compact,
  variant = "primary"
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  danger?: boolean;
  compact?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        compact ? styles.actionButtonCompact : null,
        variant === "secondary" ? styles.secondaryButton : null,
        danger ? styles.dangerButton : null,
        disabled ? styles.actionDisabled : null,
        pressed && !disabled ? styles.actionPressed : null
      ]}
    >
      <Text style={[styles.actionText, variant === "secondary" ? styles.secondaryButtonText : null, disabled ? styles.actionTextDisabled : null]}>
        {label}
      </Text>
      {disabled && disabledReason ? <Text style={styles.disabledReason}>{disabledReason}</Text> : null}
    </Pressable>
  );
}

function ConfirmModal({ state, onCancel, onConfirm }: { state: ConfirmState | null; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal visible={Boolean(state)} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.confirmOverlay}>
        <View style={styles.scrim} />
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>{state?.title ?? "Confirm"}</Text>
          <Text style={styles.confirmMessage}>{state?.message ?? ""}</Text>
          <View style={styles.confirmActions}>
            <ActionButton label="Cancel" variant="secondary" onPress={onCancel} />
            <ActionButton label={state?.confirmLabel ?? "Confirm"} danger={state?.danger} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 22
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.42)"
  },
  panel: {
    width: "100%",
    maxWidth: 980,
    maxHeight: "94%",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 22,
    gap: 14,
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
  feedback: { borderRadius: 12, borderWidth: 1, padding: 12 },
  feedbackSuccess: { backgroundColor: "#ecfdf5", borderColor: "#bbf7d0" },
  feedbackError: { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
  feedbackText: { fontSize: 14, fontWeight: "900" },
  feedbackTextSuccess: { color: "#047857" },
  feedbackTextError: { color: "#be123c" },
  content: { gap: 14, paddingBottom: 2 },
  section: {
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 10
  },
  sectionTitle: { color: "#142033", fontSize: 20, fontWeight: "900" },
  subheading: { color: "#142033", fontSize: 15, fontWeight: "900", marginTop: 4 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 14 },
  infoLabel: { color: "#64748b", fontSize: 13, fontWeight: "800" },
  infoValue: { flex: 1, color: "#142033", fontSize: 13, fontWeight: "900", textAlign: "right" },
  buttonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionButton: {
    minHeight: 56,
    minWidth: 170,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 9
  },
  actionButtonCompact: { minWidth: 140, minHeight: 50 },
  actionPressed: { opacity: 0.84 },
  actionDisabled: { backgroundColor: "#cbd5e1", borderColor: "#cbd5e1" },
  actionText: { color: "#ffffff", fontSize: 15, fontWeight: "900", textAlign: "center" },
  actionTextDisabled: { color: "#64748b" },
  disabledReason: { color: "#64748b", fontSize: 11, fontWeight: "800", textAlign: "center", marginTop: 3 },
  secondaryButton: { backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  secondaryButtonText: { color: "#334155" },
  dangerButton: { backgroundColor: "#be123c" },
  instruction: { color: "#334155", fontSize: 14, fontWeight: "800", lineHeight: 21 },
  muted: { color: "#64748b", fontSize: 14, fontWeight: "800", lineHeight: 20 },
  listRow: {
    minHeight: 58,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  listCopy: { flex: 1, minWidth: 0, gap: 4 },
  listTitle: { color: "#142033", fontSize: 15, fontWeight: "900" },
  listMeta: { color: "#64748b", fontSize: 12, fontWeight: "800" },
  rawBox: {
    maxHeight: 260,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    padding: 12
  },
  rawText: { color: "#dbeafe", fontSize: 12, fontWeight: "700", lineHeight: 18 },
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
  closeText: { color: "#334155", fontSize: 17, fontWeight: "900" },
  confirmOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  confirmBox: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 24,
    gap: 14
  },
  confirmTitle: { color: "#142033", fontSize: 26, fontWeight: "900", textAlign: "center" },
  confirmMessage: { color: "#475569", fontSize: 16, fontWeight: "800", lineHeight: 23, textAlign: "center" },
  confirmActions: { flexDirection: "row", justifyContent: "center", gap: 12, flexWrap: "wrap" }
});
