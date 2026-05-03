import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Settings } from "lucide-react-native";
import type { CartSnapshot } from "../store/cartUiStore";
import { AdminPanel } from "./AdminPanel";
import { AdminPasswordModal } from "./AdminPasswordModal";

interface AdminAccessButtonProps {
  connected: boolean;
  snapshot: CartSnapshot | null;
  onResetSession: () => void;
  onStartCheckout: () => void;
}

export function AdminAccessButton({ connected, snapshot, onResetSession, onStartCheckout }: AdminAccessButtonProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);

  function handleUnlock() {
    setPasswordVisible(false);
    setPanelVisible(true);
  }

  return (
    <>
      <View style={styles.anchor} pointerEvents="box-none">
        <Pressable
          accessibilityLabel="Open admin access"
          accessibilityRole="button"
          onPress={() => setPasswordVisible(true)}
          style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
        >
          <Settings color="#334155" size={18} strokeWidth={2.6} />
          <Text style={styles.text}>Admin</Text>
        </Pressable>
      </View>
      <AdminPasswordModal
        visible={passwordVisible}
        onCancel={() => setPasswordVisible(false)}
        onUnlock={handleUnlock}
      />
      <AdminPanel
        connected={connected}
        snapshot={snapshot}
        visible={panelVisible}
        onClose={() => setPanelVisible(false)}
        onResetSession={onResetSession}
        onStartCheckout={onStartCheckout}
      />
    </>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    left: 16,
    bottom: 16,
    zIndex: 20
  },
  button: {
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    shadowColor: "#132033",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  buttonPressed: { backgroundColor: "#e2e8f0" },
  text: { color: "#334155", fontSize: 13, fontWeight: "900" }
});
