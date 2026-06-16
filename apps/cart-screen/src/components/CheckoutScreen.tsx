import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  QrCode,
  Receipt,
  ShoppingBag
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import QRCode from "react-native-qrcode-svg";
import type { CartPaymentSession, CartSnapshot, SessionControlMode, UiLanguage } from "../store/cartUiStore";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { formatCurrency, formatStateLabel, scaleSize, shadowStyle } from "../ui/appUi";
import { CartoLogo } from "./CartoLogo";
import { RevealView } from "./RevealView";

interface CheckoutScreenProps {
  connected: boolean;
  language: UiLanguage;
  onCancelCheckout: () => void;
  onConfirmCheckout: () => void;
  onConfirmPayment: () => void;
  onResetSession: () => void;
  onRetryPayment: () => void;
  onReturnToShopping: () => void;
  paymentSession: CartPaymentSession | null;
  sessionControlMode: SessionControlMode;
  snapshot: CartSnapshot | null;
  strings: AppStrings;
  textScale: number;
  theme: ThemePalette;
  usesBackendPaymentQr: boolean;
}

export function CheckoutScreen({
  connected,
  language,
  onCancelCheckout,
  onConfirmCheckout,
  onConfirmPayment,
  onResetSession,
  onRetryPayment,
  onReturnToShopping,
  paymentSession,
  sessionControlMode,
  snapshot,
  strings,
  textScale,
  theme,
  usesBackendPaymentQr
}: CheckoutScreenProps) {
  const { width } = useWindowDimensions();
  const stacked = width < 1180;
  const cartItems = snapshot?.cartItems ?? [];
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const state = snapshot?.state;
  const statusTone = getStatusTone(state, theme);
  const StatusIcon = getStatusIcon(state);
  const receiptId = paymentSession?.receiptId ?? snapshot?.payment.transactionId;
  const paymentAmount = paymentSession?.amount ?? snapshot?.totals.total ?? 0;
  const paymentCurrency = paymentSession?.currency ?? "EGP";
  const paymentAmountDisplay = paymentSession?.amountDisplay ?? formatCurrency(paymentAmount, language, paymentCurrency);
  const paymentQrValue = paymentSession?.qrValue ?? paymentSession?.paymentUrl ?? "";
  const paymentStatusLabel = paymentSession?.paymentStatus ?? snapshot?.payment.status ?? "Unavailable";
  const paymentErrorMessage = paymentSession?.errorMessage;
  const receiptReady = Boolean(receiptId);
  const totalIsZero = paymentAmount <= 0;
  const [now, setNow] = useState(() => Date.now());
  const paymentQrExpired = isExpiredTimestamp(paymentSession?.expiresAt, now);
  const paymentExpiryLabel = formatExpiryCountdown(paymentSession?.expiresAt, now);
  const canStartCheckout = usesBackendPaymentQr
    ? connected && state === "SHOPPING" && cartItems.length > 0 && !totalIsZero
    : connected && state === "SHOPPING" && cartItems.length > 0;
  const showReturn = state !== "PAID" && state !== "WAITING_FOR_LIST" && state !== "SESSION_CLOSED";
  const showDisconnectButton = usesBackendPaymentQr && state !== "PAID";
  const helperText = getCheckoutHelperText({
    paymentQrExpired,
    paymentErrorMessage,
    paymentQrValue,
    state,
    strings,
    totalIsZero,
    usesBackendPaymentQr
  });

  useEffect(() => {
    if (!paymentSession?.expiresAt) {
      return undefined;
    }

    setNow(Date.now());
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [paymentSession?.expiresAt]);

  return (
    <View style={styles.root}>
      <RevealView
        style={[
          styles.headerCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border
          },
          shadowStyle(theme, 10)
        ]}
      >
        <View style={styles.headerLeft}>
          {showReturn ? (
            <Pressable
              accessibilityRole="button"
              onPress={onReturnToShopping}
              style={({ pressed }) => [
                styles.backButton,
                {
                  backgroundColor: theme.cardMuted,
                  borderColor: theme.border,
                  transform: [{ scale: pressed ? 0.98 : 1 }]
                }
              ]}
            >
              <ArrowLeft size={18} color={theme.textPrimary} />
              <Text style={[styles.backButtonText, { color: theme.textPrimary, fontSize: scaleSize(13, textScale) }]}>
                {strings.returnToShopping}
              </Text>
            </Pressable>
          ) : null}

          <CartoLogo height={44} radius={14} resizeMode="cover" width={116} />

          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: theme.textPrimary, fontSize: scaleSize(28, textScale) }]}>
              {strings.smartReceipt}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textMuted, fontSize: scaleSize(14, textScale) }]}>
              {strings.smartReceiptSub}
            </Text>
          </View>
        </View>

        <View style={[styles.statePill, { backgroundColor: statusTone.soft }]}>
          <Text style={[styles.statePillText, { color: statusTone.main, fontSize: scaleSize(12, textScale) }]}>
            {formatStateLabel(state, language)}
          </Text>
        </View>
      </RevealView>

      <View style={[styles.layout, stacked ? styles.layoutStacked : null]}>
        <RevealView
          delay={70}
          style={[
            styles.receiptColumn,
            {
              backgroundColor: theme.card,
              borderColor: theme.border
            },
            shadowStyle(theme, 10)
          ]}
        >
          <View style={styles.receiptHeader}>
            <Text style={[styles.receiptTitle, { color: theme.textPrimary, fontSize: scaleSize(20, textScale) }]}>
              {strings.itemSummary}
            </Text>
            <Text style={[styles.receiptMeta, { color: theme.textMuted, fontSize: scaleSize(12, textScale) }]}>
              {totalQuantity} {strings.cartItems}
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.receiptList} showsVerticalScrollIndicator={false}>
            {cartItems.map((item) => (
              <View
                key={item.lineId}
                style={[
                  styles.receiptItem,
                  {
                    backgroundColor: theme.cardMuted,
                    borderColor: theme.border
                  }
                ]}
              >
                <View style={styles.receiptItemCopy}>
                  <Text style={[styles.itemName, { color: theme.textPrimary, fontSize: scaleSize(15, textScale) }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemMeta, { color: theme.textMuted, fontSize: scaleSize(12, textScale) }]}>
                    {`${item.quantity} x ${formatCurrency(item.unitPrice, language)}`}
                  </Text>
                </View>
                <Text style={[styles.itemTotal, { color: theme.textPrimary, fontSize: scaleSize(15, textScale) }]}>
                  {formatCurrency(item.lineTotal, language)}
                </Text>
              </View>
            ))}

            {!cartItems.length ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
                <ShoppingBag size={26} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textMuted, fontSize: scaleSize(14, textScale) }]}>
                  {strings.emptyCart}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.totalsCard, { borderColor: theme.border }]}>
            <SummaryRow label="Subtotal" value={formatCurrency(snapshot?.totals.subtotal, language)} textScale={textScale} theme={theme} />
            <SummaryRow label="Tax" value={formatCurrency(snapshot?.totals.tax, language)} textScale={textScale} theme={theme} />
            <SummaryRow label={strings.total} value={formatCurrency(snapshot?.totals.total, language)} textScale={textScale} strong theme={theme} />
          </View>
        </RevealView>

        <RevealView
          delay={140}
          style={[
            styles.sideColumn,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border
            },
            shadowStyle(theme, 10)
          ]}
        >
          <View style={[styles.statusCard, { backgroundColor: statusTone.soft, borderColor: statusTone.main }]}>
            <View style={[styles.statusIcon, { backgroundColor: theme.card }]}>
              <StatusIcon size={24} color={statusTone.main} />
            </View>
            <View style={styles.statusCopy}>
              <Text style={[styles.statusTitle, { color: theme.textPrimary, fontSize: scaleSize(18, textScale) }]}>
                {formatStateLabel(state, language)}
              </Text>
              <Text style={[styles.statusText, { color: theme.textSecondary, fontSize: scaleSize(13, textScale) }]}>
                {usesBackendPaymentQr ? helperText : strings.checkoutSubtitle}
              </Text>
            </View>
          </View>

          <View style={[styles.placeholderCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.placeholderHeader}>
              <Receipt size={18} color={theme.textPrimary} />
              <Text style={[styles.placeholderTitle, { color: theme.textPrimary, fontSize: scaleSize(14, textScale) }]}>
                {usesBackendPaymentQr ? "Secure payment QR" : state === "PAID" ? strings.receiptReady : strings.receiptPlaceholder}
              </Text>
            </View>
            <View style={[styles.qrPlaceholder, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
              {usesBackendPaymentQr && paymentQrValue ? (
                <View style={styles.qrCanvas}>
                  <QRCode
                    backgroundColor="#ffffff"
                    color="#111111"
                    key={paymentQrValue}
                    size={220}
                    value={paymentQrValue}
                  />
                </View>
              ) : state === "PAID" ? (
                <CheckCircle2 size={56} color={theme.success} />
              ) : usesBackendPaymentQr && (paymentErrorMessage || paymentQrExpired || state === "PAYMENT_FAILED") ? (
                <View style={styles.placeholderErrorState}>
                  <AlertTriangle size={42} color={theme.error} />
                  <Text style={[styles.placeholderErrorText, { color: theme.error, fontSize: scaleSize(13, textScale) }]}>
                    {paymentErrorMessage || (paymentQrExpired ? "Payment QR expired. Generate a new QR to continue." : strings.paymentQrError)}
                  </Text>
                </View>
              ) : usesBackendPaymentQr ? (
                <View style={styles.placeholderPendingState}>
                  <Text style={[styles.placeholderPendingText, { color: theme.textSecondary, fontSize: scaleSize(13, textScale) }]}>
                    Generating secure payment QR...
                  </Text>
                </View>
              ) : (
                <QrCode size={46} color={theme.accent} />
              )}
            </View>
            <Text style={[styles.placeholderMessage, { color: theme.textSecondary, fontSize: scaleSize(13, textScale) }]}>
              {helperText}
            </Text>
            {usesBackendPaymentQr ? (
              <View style={styles.paymentMetaStack}>
                <Text style={[styles.paymentMetaText, { color: theme.textPrimary, fontSize: scaleSize(15, textScale) }]}>
                  {paymentAmountDisplay}
                </Text>
                <Text style={[styles.paymentMetaText, { color: theme.textSecondary, fontSize: scaleSize(12, textScale) }]}>
                  Status: {paymentStatusLabel}
                </Text>
                {paymentExpiryLabel ? (
                  <Text style={[styles.paymentMetaText, { color: paymentQrExpired ? theme.error : theme.textSecondary, fontSize: scaleSize(12, textScale) }]}>
                    {paymentQrExpired ? "Expired" : `Expires in ${paymentExpiryLabel}`}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.sideSummary}>
            <SummaryRow label={strings.cartItems} value={`${totalQuantity}`} textScale={textScale} theme={theme} />
            <SummaryRow label={strings.paymentStatus} value={paymentStatusLabel} textScale={textScale} theme={theme} />
            <SummaryRow label="Receipt ID" value={receiptId ?? "Unavailable"} textScale={textScale} theme={theme} />
            <SummaryRow label={strings.total} value={paymentAmountDisplay} textScale={textScale} strong theme={theme} />
            {paymentExpiryLabel ? (
              <SummaryRow label="Expires" value={paymentQrExpired ? "Expired" : paymentExpiryLabel} textScale={textScale} theme={theme} />
            ) : null}
          </View>

          <View style={styles.buttonStack}>
            {(state === "SHOPPING" || state === "CHECKOUT_PENDING") ? (
                <PrimaryButton
                  disabled={!canStartCheckout}
                  label={usesBackendPaymentQr && (paymentErrorMessage || paymentQrExpired) ? strings.retryPayment : usesBackendPaymentQr ? strings.generatePaymentQr : strings.confirmCheckout}
                  onPress={onConfirmCheckout}
                  textScale={textScale}
                  theme={theme}
                />
            ) : null}

            {!usesBackendPaymentQr && state === "WAITING_PAYMENT" ? (
              <>
                <PrimaryButton
                  disabled={!connected}
                  label={strings.confirmPayment}
                  onPress={onConfirmPayment}
                  textScale={textScale}
                  theme={theme}
                />
                <SecondaryButton
                  label={strings.cancelCheckout}
                  onPress={onCancelCheckout}
                  textScale={textScale}
                  theme={theme}
                />
              </>
            ) : null}

            {state === "PAYMENT_FAILED" ? (
              <>
                <PrimaryButton
                  disabled={!connected}
                  label={strings.retryPayment}
                  onPress={onRetryPayment}
                  textScale={textScale}
                  theme={theme}
                />
                {!usesBackendPaymentQr ? (
                  <SecondaryButton
                    label={strings.cancelCheckout}
                    onPress={onCancelCheckout}
                    textScale={textScale}
                    theme={theme}
                  />
                ) : null}
              </>
            ) : null}

            {usesBackendPaymentQr && (paymentErrorMessage || paymentQrExpired) && state !== "PAYMENT_FAILED" && state !== "SHOPPING" && state !== "CHECKOUT_PENDING" ? (
              <PrimaryButton
                disabled={!connected}
                label={strings.retryPayment}
                onPress={onRetryPayment}
                textScale={textScale}
                theme={theme}
              />
            ) : null}

            {showDisconnectButton ? (
              <SecondaryButton
                label={strings.disconnectSession}
                onPress={onCancelCheckout}
                textScale={textScale}
                theme={theme}
              />
            ) : null}

            {(state === "PAID" || state === "WAITING_FOR_LIST" || state === "SESSION_CLOSED") ? (
              <PrimaryButton
                disabled={!connected}
                label={strings.startNewSession}
                onPress={onResetSession}
                textScale={textScale}
                theme={theme}
              />
            ) : null}
          </View>
        </RevealView>
      </View>
    </View>
  );
}

function SummaryRow({
  label,
  strong,
  textScale,
  theme,
  value
}: {
  label: string;
  strong?: boolean;
  textScale: number;
  theme: ThemePalette;
  value: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: strong ? theme.textPrimary : theme.textMuted, fontSize: scaleSize(13, textScale) }]}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, { color: theme.textPrimary, fontSize: scaleSize(strong ? 16 : 14, textScale) }]}>
        {value}
      </Text>
    </View>
  );
}

function PrimaryButton({
  disabled,
  label,
  onPress,
  textScale,
  theme
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  textScale: number;
  theme: ThemePalette;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        {
          backgroundColor: disabled ? theme.border : theme.accent,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }]
        }
      ]}
    >
      <Text style={[styles.primaryButtonText, { fontSize: scaleSize(15, textScale) }]}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
  textScale,
  theme
}: {
  label: string;
  onPress: () => void;
  textScale: number;
  theme: ThemePalette;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          transform: [{ scale: pressed ? 0.98 : 1 }]
        }
      ]}
    >
      <Text style={[styles.secondaryButtonText, { color: theme.textPrimary, fontSize: scaleSize(14, textScale) }]}>{label}</Text>
    </Pressable>
  );
}

function getStatusTone(state: string | undefined, theme: ThemePalette) {
  if (state === "PAID") return { main: theme.success, soft: theme.successSoft };
  if (state === "PAYMENT_FAILED") return { main: theme.error, soft: theme.errorSoft };
  if (state === "WAITING_PAYMENT" || state === "CHECKOUT_PENDING") return { main: theme.warning, soft: theme.warningSoft };
  return { main: theme.accent, soft: theme.accentSoft };
}

function getStatusIcon(state: string | undefined) {
  if (state === "PAID") return CheckCircle2;
  if (state === "PAYMENT_FAILED") return AlertTriangle;
  return Clock3;
}

function getCheckoutHelperText({
  paymentQrExpired,
  paymentErrorMessage,
  paymentQrValue,
  state,
  strings,
  totalIsZero,
  usesBackendPaymentQr
}: {
  paymentQrExpired: boolean;
  paymentErrorMessage: string | null | undefined;
  paymentQrValue: string;
  state: string | undefined;
  strings: AppStrings;
  totalIsZero: boolean;
  usesBackendPaymentQr: boolean;
}) {
  if (!usesBackendPaymentQr) {
    return strings.checkoutSubtitle;
  }

  if (state === "PAID") {
    return strings.checkoutSuccess;
  }

  if (state === "PAYMENT_FAILED") {
    return paymentErrorMessage || strings.paymentQrError;
  }

  if (paymentQrExpired) {
    return "Payment QR expired. Generate a new QR to continue.";
  }

  if (paymentQrValue) {
    return "Scan this QR with your phone to continue checkout.";
  }

  if (totalIsZero) {
    return "Receipt total must be greater than 0 before generating payment QR.";
  }

  return paymentErrorMessage || strings.checkoutSubtitle;
}

function formatExpiryCountdown(expiresAt: string | null | undefined, now: number) {
  if (!expiresAt) {
    return null;
  }

  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs)) {
    return null;
  }

  const remainingMs = Math.max(0, expiresAtMs - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isExpiredTimestamp(expiresAt: string | null | undefined, now: number) {
  if (!expiresAt) {
    return false;
  }

  const expiresAtMs = Date.parse(expiresAt);
  return Number.isFinite(expiresAtMs) && expiresAtMs <= now;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 16
  },
  headerCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap"
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap"
  },
  backButton: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  backButtonText: {
    fontWeight: "800"
  },
  headerCopy: {
    gap: 4
  },
  title: {
    fontWeight: "900"
  },
  subtitle: {
    fontWeight: "700"
  },
  statePill: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  statePillText: {
    fontWeight: "900"
  },
  layout: {
    flex: 1,
    flexDirection: "row",
    gap: 16,
    minHeight: 0
  },
  layoutStacked: {
    flexDirection: "column"
  },
  receiptColumn: {
    flex: 1.4,
    minHeight: 0,
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    gap: 14
  },
  sideColumn: {
    flex: 0.9,
    minHeight: 0,
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    gap: 14
  },
  receiptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  receiptTitle: {
    fontWeight: "900"
  },
  receiptMeta: {
    fontWeight: "800"
  },
  receiptList: {
    gap: 10,
    paddingBottom: 2
  },
  receiptItem: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center"
  },
  receiptItemCopy: {
    flex: 1,
    gap: 4
  },
  itemName: {
    fontWeight: "800"
  },
  itemMeta: {
    fontWeight: "700"
  },
  itemTotal: {
    fontWeight: "900",
    textAlign: "right"
  },
  emptyCard: {
    minHeight: 220,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    gap: 10
  },
  emptyText: {
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 22
  },
  totalsCard: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 10
  },
  statusCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },
  statusIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  statusCopy: {
    flex: 1,
    gap: 4
  },
  statusTitle: {
    fontWeight: "900"
  },
  statusText: {
    fontWeight: "700",
    lineHeight: 20
  },
  placeholderCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 12
  },
  placeholderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  placeholderTitle: {
    fontWeight: "800"
  },
  qrPlaceholder: {
    minHeight: 244,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  qrCanvas: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14
  },
  placeholderErrorState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16
  },
  placeholderPendingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  placeholderPendingText: {
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center"
  },
  placeholderErrorText: {
    fontWeight: "800",
    lineHeight: 20,
    textAlign: "center"
  },
  placeholderMessage: {
    fontWeight: "700",
    lineHeight: 20
  },
  paymentMetaStack: {
    gap: 4
  },
  paymentMetaText: {
    fontWeight: "800"
  },
  sideSummary: {
    gap: 10
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  summaryLabel: {
    fontWeight: "800"
  },
  summaryValue: {
    fontWeight: "900"
  },
  buttonStack: {
    gap: 10,
    marginTop: "auto"
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "900"
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryButtonText: {
    fontWeight: "800"
  }
});
