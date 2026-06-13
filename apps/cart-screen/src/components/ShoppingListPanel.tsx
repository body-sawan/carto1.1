import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { CartSnapshot, ListDeliveryStatus, UiLanguage } from "../store/cartUiStore";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { scaleSize, shadowStyle } from "../ui/appUi";
import { ListDeliveryStatusIndicator } from "./ListDeliveryStatusIndicator";

interface ShoppingListPanelProps {
  language: UiLanguage;
  listStatus: ListDeliveryStatus;
  onRetryListStatus?: () => void;
  receivedItemCount: number;
  showDeliveryStatus?: boolean;
  snapshot: CartSnapshot | null;
  strings: AppStrings;
  textScale: number;
  theme: ThemePalette;
}

export function ShoppingListPanel({
  language,
  listStatus,
  onRetryListStatus,
  receivedItemCount,
  showDeliveryStatus = true,
  snapshot,
  strings,
  textScale,
  theme
}: ShoppingListPanelProps) {
  const items = snapshot?.shoppingList ?? [];
  const isGuestMode = snapshot?.shoppingMode === "GUEST" || (snapshot?.state === "SHOPPING" && items.length === 0);

  return (
    <View style={[
      styles.panel,
      {
        backgroundColor: theme.card,
        borderColor: theme.border
      },
      shadowStyle(theme, 8)
    ]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.textPrimary, fontSize: scaleSize(20, textScale) }]}>
            {strings.shoppingList}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted, fontSize: scaleSize(12, textScale) }]}>
            {items.length ? `${items.length} ${strings.cartItems}` : strings.shoppingListHint}
          </Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: theme.cardMuted }]}>
          <Text style={[styles.countBadgeText, { color: theme.textSecondary, fontSize: scaleSize(11, textScale) }]}>
            {items.length}
          </Text>
        </View>
      </View>

      {showDeliveryStatus ? (
        <ListDeliveryStatusIndicator
          listStatus={listStatus}
          onRetry={onRetryListStatus}
          receivedItemCount={receivedItemCount}
          strings={strings}
          textScale={textScale}
          theme={theme}
        />
      ) : null}

      <ScrollView contentContainerStyle={styles.list}>
        {items.map((item) => {
          const tone = getStatusTone(item.status, theme);
          return (
            <View
              key={item.productId}
              style={[
                styles.row,
                {
                  backgroundColor: theme.cardMuted,
                  borderColor: theme.border
                }
              ]}
            >
              <View style={styles.itemCopy}>
                <Text style={[styles.name, { color: theme.textPrimary, fontSize: scaleSize(15, textScale) }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.sub, { color: theme.textMuted, fontSize: scaleSize(12, textScale) }]}>
                  {language === "ar" ? `المطلوب ${item.quantity} | تم جمع ${item.inCartQuantity}` : `Wanted ${item.quantity} | In cart ${item.inCartQuantity}`}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: tone.soft }]}>
                <Text style={[styles.badgeText, { color: tone.main, fontSize: scaleSize(10, textScale) }]}>
                  {formatStatusLabel(item.status, language)}
                </Text>
              </View>
            </View>
          );
        })}

        {!items.length ? (
          isGuestMode ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary, fontSize: scaleSize(18, textScale) }]}>
                {strings.noList}
              </Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontSize: scaleSize(14, textScale) }]}>
                {strings.openWebsiteList}
              </Text>
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary, fontSize: scaleSize(18, textScale) }]}>
                {strings.noList}
              </Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontSize: scaleSize(14, textScale) }]}>
                {strings.shoppingListHint}
              </Text>
            </View>
          )
        ) : null}
      </ScrollView>
    </View>
  );
}

function getStatusTone(status: string, theme: ThemePalette) {
  if (status === "IN_CART") return { main: theme.success, soft: theme.successSoft };
  if (status === "PARTIAL") return { main: theme.warning, soft: theme.warningSoft };
  if (status === "REMOVED") return { main: theme.error, soft: theme.errorSoft };
  return { main: theme.accent, soft: theme.accentSoft };
}

function formatStatusLabel(status: string, language: UiLanguage) {
  if (language === "ar") {
    if (status === "IN_CART") return "تم الجمع";
    if (status === "PARTIAL") return "جزئي";
    if (status === "REMOVED") return "غير متاح";
    if (status === "SKIPPED") return "تم التخطي";
    return "قيد الانتظار";
  }

  if (status === "IN_CART") return "Collected";
  if (status === "PARTIAL") return "Partial";
  if (status === "REMOVED") return "Unavailable";
  if (status === "SKIPPED") return "Skipped";
  return "Pending";
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    minHeight: 0
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  titleBlock: {
    flex: 1,
    gap: 4
  },
  title: {
    fontWeight: "900"
  },
  subtitle: {
    fontWeight: "700"
  },
  countBadge: {
    minWidth: 38,
    minHeight: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"
  },
  countBadgeText: {
    fontWeight: "900"
  },
  list: {
    gap: 10,
    paddingBottom: 2
  },
  row: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  itemCopy: {
    flex: 1,
    gap: 6
  },
  name: {
    fontWeight: "800"
  },
  sub: {
    fontWeight: "600"
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  badgeText: {
    fontWeight: "900"
  },
  emptyCard: {
    minHeight: 260,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  emptyTitle: {
    fontWeight: "900",
    textAlign: "center"
  },
  emptyText: {
    fontWeight: "700",
    lineHeight: 22,
    textAlign: "center"
  }
});
