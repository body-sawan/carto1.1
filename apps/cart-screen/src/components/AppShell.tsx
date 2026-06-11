import { X } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { CartBackendStatus, CartSnapshot } from "../store/cartUiStore";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { scaleSize, shadowStyle } from "../ui/appUi";
import { CartoLogo } from "./CartoLogo";
import { HeaderAdBanner } from "./HeaderAdBanner";
import { StatusDotIndicator } from "./StatusDotIndicator";

interface AppShellProps {
  backendStatus: CartBackendStatus;
  children: ReactNode;
  connected: boolean;
  onCloseSession: () => void;
  snapshot: CartSnapshot | null;
  strings: AppStrings;
  textScale: number;
  theme: ThemePalette;
}

export function AppShell({
  backendStatus,
  children,
  connected,
  onCloseSession,
  snapshot,
  strings,
  textScale,
  theme
}: AppShellProps) {
  const { width } = useWindowDimensions();
  const compact = width < 1220;
  const closeDisabled = false;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.contentWrap}>
        <View
          style={[
            styles.topBar,
            compact ? styles.topBarCompact : null,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border
            },
            shadowStyle(theme, 12)
          ]}
        >
          <View style={styles.brandGroup}>
            <CartoLogo height={54} radius={18} resizeMode="cover" width={150} />
          </View>

          <View style={[styles.adGroup, compact ? styles.fullWidth : null]}>
            <HeaderAdBanner textScale={textScale} theme={theme} />
          </View>

          <View style={[styles.utilityGroup, compact ? styles.utilityGroupCompact : null]}>
            <View style={styles.statusDots}>
              <StatusDotIndicator active={isBackendHealthy(backendStatus)} theme={theme} />
              <StatusDotIndicator active={connected} theme={theme} />
              <StatusDotIndicator active={isSessionHealthy(snapshot?.state)} theme={theme} />
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={closeDisabled}
              onPress={onCloseSession}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: closeDisabled ? theme.cardMuted : theme.errorSoft,
                  borderColor: closeDisabled ? theme.border : theme.error,
                  opacity: closeDisabled ? 0.7 : 1,
                  transform: [{ scale: pressed && !closeDisabled ? 0.98 : 1 }]
                }
              ]}
            >
              <X size={16} color={closeDisabled ? theme.textMuted : theme.error} />
              <Text style={[styles.closeButtonText, { color: closeDisabled ? theme.textMuted : theme.error, fontSize: scaleSize(12, textScale) }]}>
                {strings.closeSession}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.mainStage}>{children}</View>
      </View>
    </View>
  );
}

function isBackendHealthy(status: CartBackendStatus) {
  return status === "connected" || status === "waiting" || status === "active";
}

function isSessionHealthy(state: CartSnapshot["state"] | undefined) {
  return state === "SHOPPING" || state === "WAITING_PAYMENT" || state === "CHECKOUT_PENDING" || state === "PAID";
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12
  },
  topBar: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14
  },
  topBarCompact: {
    flexDirection: "column",
    alignItems: "stretch"
  },
  brandGroup: {
    width: 150,
    alignItems: "flex-start",
    justifyContent: "center"
  },
  adGroup: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "center"
  },
  fullWidth: {
    width: "100%"
  },
  utilityGroup: {
    minWidth: 126,
    maxWidth: 160,
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 10
  },
  utilityGroupCompact: {
    width: "100%",
    maxWidth: undefined,
    alignItems: "stretch"
  },
  statusDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 7
  },
  closeButton: {
    alignSelf: "flex-end",
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  closeButtonText: {
    fontWeight: "900"
  },
  mainStage: {
    flex: 1,
    minHeight: 0
  }
});
