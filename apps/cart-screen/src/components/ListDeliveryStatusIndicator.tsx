import { AlertCircle, CheckCircle2, Clock3 } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ListDeliveryStatus } from "../store/cartUiStore";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { scaleSize } from "../ui/appUi";

interface ListDeliveryStatusIndicatorProps {
  listStatus: ListDeliveryStatus;
  onRetry?: () => void;
  receivedItemCount: number;
  strings: AppStrings;
  textScale: number;
  theme: ThemePalette;
}

export function ListDeliveryStatusIndicator({
  listStatus,
  onRetry,
  receivedItemCount,
  strings,
  textScale,
  theme
}: ListDeliveryStatusIndicatorProps) {
  const tone = getTone(listStatus, theme);
  const label = getLabel(listStatus, receivedItemCount, strings);
  const showRetry = (
    listStatus === "failed"
    || listStatus === "offline"
    || listStatus === "auth_error"
    || listStatus === "cart_not_found"
    || listStatus === "cors_error"
  ) && Boolean(onRetry);
  const Icon = listStatus === "received"
    ? CheckCircle2
    : listStatus === "failed" || listStatus === "offline" || listStatus === "auth_error" || listStatus === "cart_not_found" || listStatus === "cors_error"
      ? AlertCircle
      : Clock3;

  return (
    <View style={[styles.container, { backgroundColor: tone.soft, borderColor: tone.border }]}>
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: tone.main }]} />
        <Icon color={tone.main} size={scaleSize(16, textScale)} strokeWidth={2.3} />
        <View style={styles.copy}>
          <Text style={[styles.title, { color: tone.main, fontSize: scaleSize(11, textScale) }]}>
            {strings.listDeliveryTitle}
          </Text>
          <Text style={[styles.label, { color: theme.textPrimary, fontSize: scaleSize(14, textScale) }]}>
            {label}
          </Text>
        </View>
      </View>

      {showRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            {
              backgroundColor: theme.card,
              borderColor: tone.border,
              transform: [{ scale: pressed ? 0.98 : 1 }]
            }
          ]}
        >
          <Text style={[styles.retryText, { color: theme.textPrimary, fontSize: scaleSize(12, textScale) }]}>
            {strings.retry}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function getTone(listStatus: ListDeliveryStatus, theme: ThemePalette) {
  if (listStatus === "received") {
    return { main: theme.success, soft: theme.successSoft, border: theme.border };
  }

  if (listStatus === "failed" || listStatus === "offline" || listStatus === "auth_error" || listStatus === "cart_not_found" || listStatus === "cors_error") {
    return { main: theme.error, soft: theme.errorSoft, border: theme.error };
  }

  if (listStatus === "checking" || listStatus === "fetching_qr" || listStatus === "refreshing_qr") {
    return { main: theme.accent, soft: theme.accentSoft, border: theme.border };
  }

  return { main: theme.warning, soft: theme.warningSoft, border: theme.border };
}

function getLabel(listStatus: ListDeliveryStatus, receivedItemCount: number, strings: AppStrings) {
  if (listStatus === "received") {
    return `${strings.listReceived} - ${receivedItemCount} ${strings.itemsLabel}`;
  }

  if (listStatus === "fetching_qr") {
    return strings.listFetchingQr;
  }

  if (listStatus === "refreshing_qr") {
    return strings.listRefreshingQr;
  }

  if (listStatus === "failed") {
    return strings.listFailed;
  }

  if (listStatus === "offline") {
    return strings.listOffline;
  }

  if (listStatus === "auth_error") {
    return strings.listAuthError;
  }

  if (listStatus === "cart_not_found") {
    return strings.listCartNotFound;
  }

  if (listStatus === "cors_error") {
    return strings.listCorsError;
  }

  if (listStatus === "checking") {
    return strings.listChecking;
  }

  return strings.listWaitingForPairing;
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999
  },
  copy: {
    flex: 1,
    gap: 4
  },
  title: {
    fontWeight: "900",
    textTransform: "uppercase"
  },
  label: {
    fontWeight: "800"
  },
  retryButton: {
    alignSelf: "flex-start",
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  retryText: {
    fontWeight: "900"
  }
});
