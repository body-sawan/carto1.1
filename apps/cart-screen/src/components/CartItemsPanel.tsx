import { Package2 } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { CartSnapshot, UiLanguage } from "../store/cartUiStore";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { formatCurrency, scaleSize, shadowStyle } from "../ui/appUi";

interface CartItemsPanelProps {
  connected: boolean;
  language: UiLanguage;
  onCheckout: () => void;
  snapshot: CartSnapshot | null;
  strings: AppStrings;
  textScale: number;
  theme: ThemePalette;
}

export function CartItemsPanel({
  connected,
  language,
  onCheckout,
  snapshot,
  strings,
  textScale,
  theme
}: CartItemsPanelProps) {
  const cartItems = snapshot?.cartItems ?? [];
  const lineCount = cartItems.length;
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const checkoutDisabled = !connected || !cartItems.length || snapshot?.state !== "SHOPPING";

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
            {strings.cart}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted, fontSize: scaleSize(12, textScale) }]}>
            {lineCount} {lineCount === 1 ? "line" : "lines"} | {itemCount} {strings.cartItems}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} style={styles.listScroll}>
        {cartItems.map((item) => (
          <View
            key={item.lineId}
            style={[
              styles.itemCard,
              {
                backgroundColor: theme.cardMuted,
                borderColor: theme.border
              }
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: theme.card }]}>
              <Package2 size={20} color={theme.accent} />
            </View>
            <View style={styles.itemCopy}>
              <Text style={[styles.name, { color: theme.textPrimary, fontSize: scaleSize(15, textScale) }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={[styles.meta, { color: theme.textMuted, fontSize: scaleSize(12, textScale) }]}>
                {`${item.quantity} x ${formatCurrency(item.unitPrice, language)}`}
              </Text>
            </View>
            <Text style={[styles.lineTotal, { color: theme.textPrimary, fontSize: scaleSize(14, textScale) }]}>
              {formatCurrency(item.lineTotal, language)}
            </Text>
          </View>
        ))}

        {!cartItems.length ? (
          <View style={[styles.emptyState, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary, fontSize: scaleSize(17, textScale) }]}>
              {strings.emptyCart}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.textMuted, fontSize: scaleSize(11, textScale) }]}>
            {strings.total}
          </Text>
          <Text style={[styles.summaryValue, { color: theme.textPrimary, fontSize: scaleSize(22, textScale) }]}>
            {formatCurrency(snapshot?.totals.total, language)}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={checkoutDisabled}
          onPress={onCheckout}
          style={({ pressed }) => [
            styles.checkoutButton,
            {
              backgroundColor: checkoutDisabled ? theme.border : theme.accent,
              transform: [{ scale: pressed && !checkoutDisabled ? 0.98 : 1 }]
            }
          ]}
        >
          <Text style={[styles.checkoutButtonText, { fontSize: scaleSize(15, textScale) }]}>
            {strings.confirmCheckout}
          </Text>
        </Pressable>
      </View>
    </View>
  );
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  titleBlock: {
    gap: 4
  },
  title: {
    fontWeight: "900"
  },
  subtitle: {
    fontWeight: "700"
  },
  listScroll: {
    flex: 1
  },
  list: {
    gap: 10,
    paddingBottom: 2,
    flexGrow: 1
  },
  itemCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  itemCopy: {
    flex: 1,
    gap: 4
  },
  name: {
    fontWeight: "800"
  },
  meta: {
    fontWeight: "700"
  },
  lineTotal: {
    fontWeight: "900",
    textAlign: "right"
  },
  emptyState: {
    minHeight: 220,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  emptyTitle: {
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 24
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  summaryLabel: {
    fontWeight: "900",
    textTransform: "uppercase"
  },
  summaryValue: {
    fontWeight: "900"
  },
  checkoutButton: {
    minHeight: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  checkoutButtonText: {
    color: "#ffffff",
    fontWeight: "900"
  }
});
