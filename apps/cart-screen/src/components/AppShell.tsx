import { ShoppingCart, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CartSnapshot } from "../store/cartUiStore";
import type { UiLanguage } from "../store/cartUiStore";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import {
  formatStateLabel,
  scaleSize,
  shadowStyle
} from "../ui/appUi";

interface AppShellProps {
  backendStatus: "checking" | "online" | "offline";
  children: ReactNode;
  connected: boolean;
  language: UiLanguage;
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
  language,
  onCloseSession,
  snapshot,
  strings,
  textScale,
  theme
}: AppShellProps) {
  const backendLabel = backendStatus === "online"
    ? strings.backendActive
    : backendStatus === "offline"
      ? strings.backendOffline
      : strings.backendChecking;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.contentWrap}>
        <View
          style={[
            styles.topBar,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border
            },
            shadowStyle(theme, 12)
          ]}
        >
          <View style={styles.brandGroup}>
            <View style={[styles.brandIconWrap, { backgroundColor: theme.accentSoft }]}>
              <ShoppingCart size={22} color={theme.accent} />
            </View>
            <View style={styles.brandCopy}>
              <Text style={[styles.brand, { color: theme.textPrimary, fontSize: scaleSize(24, textScale) }]}>
                {strings.appName}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textMuted, fontSize: scaleSize(13, textScale) }]}>
                {strings.appSubtitle}
              </Text>
            </View>
          </View>

          <View style={styles.summaryGroup}>
            <StatusPill
              label={`${strings.backendStatus}: ${backendLabel}`}
              textScale={textScale}
              theme={theme}
              tone={backendStatus === "online" ? "success" : backendStatus === "offline" ? "error" : "warning"}
            />
            <StatusPill
              label={`${strings.screenStatus}: ${connected ? strings.screenConnected : strings.screenDisconnected}`}
              textScale={textScale}
              theme={theme}
              tone={connected ? "accent" : "error"}
            />
            <StatusPill
              label={`${strings.sessionStatus}: ${formatStateLabel(snapshot?.state, language)}`}
              textScale={textScale}
              theme={theme}
              tone="neutral"
            />

            <Pressable
              accessibilityRole="button"
              onPress={onCloseSession}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: theme.errorSoft,
                  borderColor: theme.error,
                  transform: [{ scale: pressed ? 0.98 : 1 }]
                }
              ]}
            >
              <X size={16} color={theme.error} />
              <Text style={[styles.closeButtonText, { color: theme.error, fontSize: scaleSize(12, textScale) }]}>
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

function StatusPill({
  label,
  textScale,
  theme,
  tone
}: {
  label: string;
  textScale: number;
  theme: ThemePalette;
  tone: "accent" | "success" | "warning" | "error" | "neutral";
}) {
  const palette = tone === "success"
    ? { main: theme.success, soft: theme.successSoft }
    : tone === "warning"
      ? { main: theme.warning, soft: theme.warningSoft }
      : tone === "error"
        ? { main: theme.error, soft: theme.errorSoft }
        : tone === "neutral"
          ? { main: theme.textSecondary, soft: theme.cardMuted }
          : { main: theme.accent, soft: theme.accentSoft };

  return (
    <View style={[styles.pill, { backgroundColor: palette.soft }]}>
      <Text style={[styles.pillText, { color: palette.main, fontSize: scaleSize(12, textScale) }]}>
        {label}
      </Text>
    </View>
  );
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
    gap: 16,
    flexWrap: "wrap"
  },
  brandGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 240
  },
  brandIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  brandCopy: {
    gap: 4
  },
  brand: {
    fontWeight: "900"
  },
  subtitle: {
    fontWeight: "600"
  },
  summaryGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
    flex: 1
  },
  pill: {
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  pillText: {
    fontWeight: "800"
  },
  closeButton: {
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
