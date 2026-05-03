import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

interface AdminPasswordModalProps {
  visible: boolean;
  onCancel: () => void;
  onUnlock: () => void;
}

export function AdminPasswordModal({ visible, onCancel, onUnlock }: AdminPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setPassword("");
      setError(null);
    }
  }, [visible]);

  function handleUnlock() {
    // Demo-only admin password. Do not use hardcoded passwords in production.
    if (password === "body") {
      setPassword("");
      setError(null);
      onUnlock();
      return;
    }

    setError("Incorrect password.");
  }

  function handleCancel() {
    setPassword("");
    setError(null);
    onCancel();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.scrim} />
        <View style={styles.modal}>
          <Text style={styles.title}>Admin Access</Text>
          <TextInput
            accessibilityLabel="Admin password"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) => {
              setPassword(value);
              if (error) setError(null);
            }}
            onSubmitEditing={handleUnlock}
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            value={password}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={handleCancel} style={({ pressed }) => [styles.secondaryButton, pressed ? styles.secondaryPressed : null]}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={handleUnlock} style={({ pressed }) => [styles.primaryButton, pressed ? styles.primaryPressed : null]}>
              <Text style={styles.primaryText}>Unlock</Text>
            </Pressable>
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
    padding: 28
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.42)"
  },
  modal: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 28,
    gap: 16,
    shadowColor: "#132033",
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8
  },
  title: { color: "#142033", fontSize: 30, fontWeight: "900", textAlign: "center" },
  input: {
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    color: "#142033",
    fontSize: 18,
    fontWeight: "800",
    paddingHorizontal: 16
  },
  error: { color: "#be123c", fontSize: 15, fontWeight: "900", textAlign: "center" },
  actions: { flexDirection: "row", gap: 12, justifyContent: "flex-end" },
  primaryButton: {
    minHeight: 54,
    minWidth: 132,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  primaryPressed: { backgroundColor: "#1d4ed8" },
  primaryText: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  secondaryButton: {
    minHeight: 54,
    minWidth: 120,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  secondaryPressed: { backgroundColor: "#e2e8f0" },
  secondaryText: { color: "#334155", fontSize: 16, fontWeight: "900" }
});
