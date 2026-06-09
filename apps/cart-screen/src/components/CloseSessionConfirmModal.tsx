import { AlertTriangle } from "lucide-react-native";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { ThemePalette } from "../ui/appUi";
import { scaleSize, shadowStyle } from "../ui/appUi";

interface CloseSessionConfirmModalProps {
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  textScale: number;
  theme: ThemePalette;
  visible: boolean;
  isClosing: boolean;
}

export function CloseSessionConfirmModal({
  errorMessage,
  onCancel,
  onConfirm,
  textScale,
  theme,
  visible,
  isClosing
}: CloseSessionConfirmModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={isClosing ? undefined : onCancel}
    >
      <View style={styles.overlay}>
        <Pressable
          disabled={isClosing}
          onPress={onCancel}
          style={styles.scrim}
        />
        <View
          style={[
            styles.modal,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border
            },
            shadowStyle(theme, 18)
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: theme.errorSoft }]}>
            <AlertTriangle size={24} color={theme.error} />
          </View>

          <Text style={[styles.title, { color: theme.textPrimary, fontSize: scaleSize(28, textScale) }]}>
            Close shopping session?
          </Text>

          <Text style={[styles.message, { color: theme.textSecondary, fontSize: scaleSize(16, textScale) }]}>
            This will end the current cart session and clear the shopping list and cart items from this screen.
          </Text>

          {errorMessage ? (
            <View style={[styles.errorCard, { backgroundColor: theme.errorSoft, borderColor: theme.error }]}>
              <Text style={[styles.errorText, { color: theme.error, fontSize: scaleSize(13, textScale) }]}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isClosing}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  opacity: isClosing ? 0.6 : 1,
                  transform: [{ scale: pressed && !isClosing ? 0.98 : 1 }]
                }
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.textPrimary, fontSize: scaleSize(15, textScale) }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isClosing}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: theme.error,
                  opacity: isClosing ? 0.75 : 1,
                  transform: [{ scale: pressed && !isClosing ? 0.98 : 1 }]
                }
              ]}
            >
              <Text style={[styles.primaryButtonText, { fontSize: scaleSize(15, textScale) }]}>
                {isClosing ? "Closing session..." : "Yes, close session"}
              </Text>
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
    backgroundColor: "rgba(15, 23, 42, 0.5)"
  },
  modal: {
    width: "100%",
    maxWidth: 560,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 26,
    paddingVertical: 28,
    alignItems: "center",
    gap: 18
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    fontWeight: "900",
    textAlign: "center"
  },
  message: {
    fontWeight: "700",
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 460
  },
  errorCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  errorText: {
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 20
  },
  actions: {
    width: "100%",
    flexDirection: "row",
    gap: 12
  },
  secondaryButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  secondaryButtonText: {
    fontWeight: "900"
  },
  primaryButton: {
    flex: 1.15,
    minHeight: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    textAlign: "center"
  }
});
