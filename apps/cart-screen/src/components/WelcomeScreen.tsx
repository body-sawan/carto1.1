import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import QRCode from "react-native-qrcode-svg";
import type { CartBackendStatus, CartSnapshot } from "../store/cartUiStore";
import { CART_SCREEN_BACKEND_MODE } from "../realtime/config";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { scaleSize, shadowStyle } from "../ui/appUi";
import { CartoLogo } from "./CartoLogo";
import { RevealView } from "./RevealView";

interface WelcomeScreenProps {
  backendStatus: CartBackendStatus;
  cartCode: string;
  connected: boolean;
  onContinueWithoutList: () => void;
  onRefreshQr?: () => void;
  snapshot: CartSnapshot | null;
  strings: AppStrings;
  textScale: number;
  theme: ThemePalette;
}

function ensureCartPairingQrValue(rawValue: string): string {
  try {
    const parsed = JSON.parse(rawValue);

    const cartCode = parsed?.cartCode ?? parsed?.cartId;
    const pairingCode = parsed?.pairingCode;

    if (!cartCode || !pairingCode) {
      return rawValue;
    }

    return JSON.stringify({
      type: "cart_pairing",
      cartCode: String(cartCode),
      pairingCode: String(pairingCode),
    });
  } catch {
    return rawValue;
  }
}

export function WelcomeScreen({
  backendStatus,
  cartCode,
  connected,
  onContinueWithoutList,
  onRefreshQr,
  snapshot,
  strings,
  textScale,
  theme
}: WelcomeScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 920;
  const pairing = snapshot?.pairing;
  const backendMode = CART_SCREEN_BACKEND_MODE;
  const isCartoMode = backendMode === "carto";
  const cartCodeLabel = cartCode || pairing?.cartId || "";
  const qrValue = pairing?.qrPayload ?? "";
  const finalQrValue = ensureCartPairingQrValue(qrValue);
  const pairingStatusLabel = getPairingStatusLabel(backendStatus, strings);
  const continueDisabled = !connected;

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
          {finalQrValue ? (
            <QRCode key={finalQrValue} value={finalQrValue} size={compact ? 210 : 260} />
          ) : (
            isCartoMode ? (
              <View style={styles.warningBlock}>
                <Text style={[styles.warningTitle, { color: theme.warning, fontSize: scaleSize(16, textScale) }]}>
                  {cartCodeLabel ? "QR unavailable" : "Cart code missing"}
                </Text>
                <Text style={[styles.qrFallback, { color: theme.textMuted, fontSize: scaleSize(14, textScale) }]}>
                  {cartCodeLabel
                    ? "Backend QR is unavailable. Refresh to try again."
                    : "Set `CART_CODE` or `EXPO_PUBLIC_CART_CODE` to generate the online pairing QR."}
                </Text>
              </View>
            ) : (
              <Text style={[styles.qrFallback, { color: theme.textMuted, fontSize: scaleSize(16, textScale) }]}>
                {strings.qrLoading}
              </Text>
            )
          )}
        </View>

        {finalQrValue ? (
          <View style={styles.debugBlock}>
            <Text style={[styles.debugLabel, { color: theme.textMuted, fontSize: scaleSize(11, textScale) }]}>
              QR Payload:
            </Text>
            <Text style={[styles.debugValue, { color: theme.textSecondary, fontSize: scaleSize(12, textScale) }]}>
              {finalQrValue}
            </Text>
          </View>
        ) : null}

        {isCartoMode ? (
          <Pressable
            accessibilityRole="button"
            disabled={!connected}
            onPress={onRefreshQr}
            style={({ pressed }) => [
              styles.refreshButton,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                opacity: connected ? 1 : 0.6,
                transform: [{ scale: pressed && connected ? 0.98 : 1 }]
              }
            ]}
          >
            <Text style={[styles.refreshButtonText, { color: theme.textPrimary, fontSize: scaleSize(14, textScale) }]}>
              Refresh QR
            </Text>
          </Pressable>
        ) : null}

        {pairing?.pairingCode ? (
          <View style={styles.codeBlock}>
            <Text style={[styles.codeLabel, { color: theme.textMuted, fontSize: scaleSize(11, textScale) }]}>
              {strings.pairingCode}
            </Text>
            <Text style={[styles.codeValue, { color: theme.success, fontSize: scaleSize(34, textScale) }]}>
              {pairing.pairingCode}
            </Text>
          </View>
        ) : null}

        <View style={styles.codeBlock}>
          <Text style={[styles.codeLabel, { color: theme.textMuted, fontSize: scaleSize(11, textScale) }]}>
            Cart code
          </Text>
          <Text style={[styles.cartCodeValue, { color: theme.textPrimary, fontSize: scaleSize(20, textScale) }]}>
            {cartCodeLabel || "------"}
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
      </RevealView>
    </View>
  );
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
  debugBlock: {
    width: "100%",
    maxWidth: 560,
    gap: 6,
    alignItems: "center"
  },
  debugLabel: {
    fontWeight: "900",
    textTransform: "uppercase"
  },
  debugValue: {
    textAlign: "center",
    lineHeight: 18
  },
  qrFallback: {
    fontWeight: "700",
    textAlign: "center"
  },
  warningBlock: {
    gap: 8,
    alignItems: "center"
  },
  warningTitle: {
    fontWeight: "900",
    textAlign: "center"
  },
  refreshButton: {
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  refreshButtonText: {
    fontWeight: "900"
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
  }
});
