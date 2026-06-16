import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import QRCode from "react-native-qrcode-svg";
import type { CartBackendStatus, CartSnapshot, ListDeliveryStatus } from "../store/cartUiStore";
import { CART_SCREEN_BACKEND_MODE } from "../realtime/config";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { scaleSize, shadowStyle } from "../ui/appUi";
import { CartoLogo } from "./CartoLogo";
import { RevealView } from "./RevealView";

interface WelcomeScreenProps {
  backendStatus: CartBackendStatus;
  cartCode: string;
  connected: boolean;
  listStatus: ListDeliveryStatus;
  receivedItemCount: number;
  onContinueWithoutList: () => void;
  onRefreshQr?: () => void;
  onRetryListStatus?: () => void;
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
  listStatus,
  receivedItemCount,
  onContinueWithoutList,
  onRefreshQr,
  onRetryListStatus,
  snapshot,
  strings,
  textScale,
  theme
}: WelcomeScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 920;
  const ultraCompact = width < 720;
  const pairing = snapshot?.pairing;
  const backendMode = CART_SCREEN_BACKEND_MODE;
  const isCartoMode = backendMode === "carto";
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
          ...(compact ? [styles.cardCompact] : []),
          shadowStyle(theme, 18)
        ]}
      >
        <CartoLogo
          height={ultraCompact ? 92 : compact ? 104 : 128}
          radius={26}
          resizeMode="cover"
          width={ultraCompact ? 196 : compact ? 224 : 280}
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

        <View style={[
          styles.qrFrame,
          ...(compact ? [styles.qrFrameCompact] : []),
          { backgroundColor: theme.card, borderColor: theme.border }
        ]}>
          {finalQrValue ? (
            <QRCode key={finalQrValue} value={finalQrValue} size={ultraCompact ? 180 : compact ? 204 : 240} />
          ) : (
            isCartoMode ? (
              <View style={styles.warningBlock}>
                <Text style={[styles.warningTitle, { color: theme.warning, fontSize: scaleSize(16, textScale) }]}>
                  {cartCode || pairing?.cartId ? "QR unavailable" : "Cart code missing"}
                </Text>
                <Text style={[styles.qrFallback, { color: theme.textMuted, fontSize: scaleSize(14, textScale) }]}>
                  {cartCode || pairing?.cartId
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
  if (status === "waiting") return strings.listWaitingForPairing;
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "center"
  },
  card: {
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
    borderRadius: 34,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 12,
    alignItems: "center"
  },
  cardCompact: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 10
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
    lineHeight: 22,
    maxWidth: 620,
    textAlign: "center"
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center"
  },
  badge: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
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
    maxWidth: 332,
    aspectRatio: 1,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18
  },
  qrFrameCompact: {
    maxWidth: 292,
    padding: 16
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
  }
});
