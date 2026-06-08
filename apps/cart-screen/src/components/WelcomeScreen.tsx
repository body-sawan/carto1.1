import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import QRCode from "react-native-qrcode-svg";
import type { CartBackendStatus, CartSnapshot, UiThemeName } from "../store/cartUiStore";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { scaleSize, shadowStyle } from "../ui/appUi";
import { CartoLogo } from "./CartoLogo";
import { RevealView } from "./RevealView";

interface WelcomeScreenProps {
  backendStatus: CartBackendStatus;
  cartCode: string;
  connected: boolean;
  onContinueWithoutList: () => void;
  onThemeChange: (theme: UiThemeName) => void;
  snapshot: CartSnapshot | null;
  strings: AppStrings;
  textScale: number;
  theme: ThemePalette;
  themeName: UiThemeName;
}

export function WelcomeScreen({
  backendStatus,
  cartCode,
  connected,
  onContinueWithoutList,
  onThemeChange,
  snapshot,
  strings,
  textScale,
  theme,
  themeName
}: WelcomeScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 920;
  const pairing = snapshot?.pairing;
  const themeOptions: UiThemeName[] = ["premium_light", "friendly_supermarket", "carto_blue_green"];
  const pairingStatusLabel = getPairingStatusLabel(backendStatus, strings);
  const continueDisabled = !connected || backendStatus === "offline";

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <RevealView
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border
          },
          shadowStyle(theme, 18)
        ]}
      >
        <CartoLogo
          height={compact ? 112 : 136}
          radius={26}
          resizeMode="cover"
          width={compact ? 236 : 300}
        />

        <Text style={[styles.eyebrow, { color: theme.accent, fontSize: scaleSize(12, textScale) }]}>
          {strings.welcomeEyebrow}
        </Text>
        <Text style={[styles.title, { color: theme.textPrimary, fontSize: scaleSize(compact ? 30 : 38, textScale) }]}>
          {strings.welcomeTitle}
        </Text>
        <Text style={[styles.message, { color: theme.textSecondary, fontSize: scaleSize(16, textScale) }]}>
          {strings.welcomeMessage}
        </Text>

        <View style={styles.badges}>
          <StatusBadge
            label={connected ? strings.screenConnected : strings.screenDisconnected}
            tone={connected ? "success" : "error"}
            textScale={textScale}
            theme={theme}
          />
          <StatusBadge
            label={pairingStatusLabel}
            tone={backendStatus === "offline" ? "error" : backendStatus === "active" ? "success" : pairing ? "accent" : "warning"}
            textScale={textScale}
            theme={theme}
          />
        </View>

        <Text style={[styles.qrTitle, { color: theme.textPrimary, fontSize: scaleSize(22, textScale) }]}>
          {strings.qrPrompt}
        </Text>

        <View style={[styles.qrFrame, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {pairing ? (
            <QRCode value={pairing.qrPayload} size={compact ? 210 : 260} />
          ) : (
            <Text style={[styles.qrFallback, { color: theme.textMuted, fontSize: scaleSize(16, textScale) }]}>
              {strings.qrLoading}
            </Text>
          )}
        </View>

        <View style={styles.codeBlock}>
          <Text style={[styles.codeLabel, { color: theme.textMuted, fontSize: scaleSize(11, textScale) }]}>
            {strings.pairingCode}
          </Text>
          <Text style={[styles.codeValue, { color: theme.success, fontSize: scaleSize(34, textScale) }]}>
            {pairing?.pairingCode ?? "------"}
          </Text>
        </View>

        <View style={styles.codeBlock}>
          <Text style={[styles.codeLabel, { color: theme.textMuted, fontSize: scaleSize(11, textScale) }]}>
            Cart code
          </Text>
          <Text style={[styles.cartCodeValue, { color: theme.textPrimary, fontSize: scaleSize(20, textScale) }]}>
            {cartCode || pairing?.cartId || "------"}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={continueDisabled}
          onPress={onContinueWithoutList}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: continueDisabled ? theme.border : theme.accent,
              transform: [{ scale: pressed && !continueDisabled ? 0.98 : 1 }]
            }
          ]}
        >
          <Text style={[styles.primaryButtonText, { fontSize: scaleSize(16, textScale) }]}>
            {strings.continueWithoutList}
          </Text>
        </Pressable>

        <Text style={[styles.helper, { color: theme.textMuted, fontSize: scaleSize(13, textScale) }]}>
          {strings.noListExperience}
        </Text>

        <View style={styles.themeSection}>
          <Text style={[styles.themeLabel, { color: theme.textMuted, fontSize: scaleSize(12, textScale) }]}>
            {strings.theme}
          </Text>
          <View style={styles.themeOptions}>
            {themeOptions.map((option) => {
              const selected = option === themeName;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  onPress={() => onThemeChange(option)}
                  style={({ pressed }) => [
                    styles.themeButton,
                    {
                      backgroundColor: selected ? theme.accentSoft : theme.card,
                      borderColor: selected ? theme.accent : theme.border,
                      transform: [{ scale: pressed ? 0.98 : 1 }]
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.themeButtonText,
                      {
                        color: selected ? theme.accent : theme.textSecondary,
                        fontSize: scaleSize(12, textScale)
                      }
                    ]}
                  >
                    {getThemeLabel(option, strings)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </RevealView>
    </View>
  );
}

function getThemeLabel(themeName: UiThemeName, strings: AppStrings) {
  if (themeName === "premium_light") return strings.themePremiumLight;
  if (themeName === "friendly_supermarket") return strings.themeFriendlySupermarket;
  return strings.themeCartoBlueGreen;
}

function getPairingStatusLabel(status: CartBackendStatus, strings: AppStrings) {
  if (status === "waiting") return "Waiting for shopping list";
  if (status === "active") return "Active session";
  if (status === "offline") return "Backend unavailable";
  if (status === "connected") return strings.pairingReady;
  return strings.qrLoading;
}

function StatusBadge({
  label,
  textScale,
  theme,
  tone
}: {
  label: string;
  textScale: number;
  theme: ThemePalette;
  tone: "accent" | "success" | "warning" | "error";
}) {
  const palette = tone === "success"
    ? { main: theme.success, soft: theme.successSoft }
    : tone === "warning"
      ? { main: theme.warning, soft: theme.warningSoft }
      : tone === "error"
        ? { main: theme.error, soft: theme.errorSoft }
        : { main: theme.accent, soft: theme.accentSoft };

  return (
    <View style={[styles.badge, { backgroundColor: palette.soft }]}>
      <Text style={[styles.badgeText, { color: palette.main, fontSize: scaleSize(12, textScale) }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 24,
    justifyContent: "center"
  },
  card: {
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
    borderRadius: 34,
    borderWidth: 1,
    paddingHorizontal: 28,
    paddingVertical: 30,
    gap: 16,
    alignItems: "center"
  },
  eyebrow: {
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    fontWeight: "900",
    textAlign: "center"
  },
  message: {
    fontWeight: "700",
    lineHeight: 24,
    maxWidth: 640,
    textAlign: "center"
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 4,
    justifyContent: "center"
  },
  badge: {
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  badgeText: {
    fontWeight: "900"
  },
  primaryButton: {
    minHeight: 62,
    borderRadius: 20,
    minWidth: 280,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "900"
  },
  helper: {
    fontWeight: "700",
    lineHeight: 20,
    maxWidth: 520,
    textAlign: "center"
  },
  qrTitle: {
    textAlign: "center",
    fontWeight: "800",
    maxWidth: 600
  },
  qrFrame: {
    width: "100%",
    maxWidth: 360,
    aspectRatio: 1,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  qrFallback: {
    fontWeight: "700",
    textAlign: "center"
  },
  codeBlock: {
    alignItems: "center",
    gap: 4
  },
  codeLabel: {
    fontWeight: "900",
    textTransform: "uppercase"
  },
  codeValue: {
    fontWeight: "900"
  },
  cartCodeValue: {
    fontWeight: "900",
    letterSpacing: 0.6
  },
  themeSection: {
    width: "100%",
    maxWidth: 760,
    gap: 10
  },
  themeLabel: {
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase"
  },
  themeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10
  },
  themeButton: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  themeButtonText: {
    fontWeight: "800"
  }
});
