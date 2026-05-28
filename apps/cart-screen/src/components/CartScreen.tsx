import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { CartSnapshot, UiLanguage } from "../store/cartUiStore";
import { postDevAction } from "../realtime/httpClient";
import { AnimatedTotal } from "./AnimatedTotal";
import { ProductActionButton, ProductCard } from "./ProductCard";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { scaleSize, shadowStyle } from "../ui/appUi";
import { friendlyMessage, formatLocation } from "./shopperUtils";

interface CartScreenProps {
  connected: boolean;
  language: UiLanguage;
  onCheckout: () => void;
  snapshot: CartSnapshot | null;
  strings: AppStrings;
  textScale: number;
  theme: ThemePalette;
}

export function CartScreen({
  connected,
  language,
  onCheckout,
  snapshot,
  strings,
  textScale,
  theme
}: CartScreenProps) {
  const { width } = useWindowDimensions();
  const stacked = width < 1120;
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const cartItems = snapshot?.cartItems ?? [];
  const cartQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const canCheckout = connected && snapshot?.state === "SHOPPING" && cartItems.length > 0;

  async function addOne(productId: string) {
    setBusyProductId(productId);
    try {
      await postDevAction("/dev/scan", { productId });
      setMessage(null);
    } catch (error) {
      setMessage(friendlyMessage(error instanceof Error ? error.message : "Unable to update cart.", language));
    } finally {
      setBusyProductId(null);
    }
  }

  async function removeOne(productId: string) {
    setBusyProductId(productId);
    try {
      await postDevAction("/dev/remove", { productId });
      setMessage(null);
    } catch (error) {
      setMessage(friendlyMessage(error instanceof Error ? error.message : "Unable to update cart.", language));
    } finally {
      setBusyProductId(null);
    }
  }

  async function removeLine(productId: string, quantity: number) {
    setBusyProductId(productId);
    try {
      for (let index = 0; index < quantity; index += 1) {
        await postDevAction("/dev/remove", { productId });
      }
      setMessage(null);
    } catch (error) {
      setMessage(friendlyMessage(error instanceof Error ? error.message : "Unable to remove the item.", language));
    } finally {
      setBusyProductId(null);
    }
  }

  return (
    <View style={[styles.layout, stacked ? styles.layoutStacked : null]}>
      <View style={styles.listColumn}>
        <View style={[
          styles.sectionCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border
          },
          shadowStyle(theme, 18)
        ]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: theme.textPrimary, fontSize: scaleSize(24, textScale) }]}>
                {strings.cart}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textMuted, fontSize: scaleSize(13, textScale) }]}>
                {cartQuantity} {strings.cartItems}
              </Text>
            </View>
            {message ? (
              <View style={[styles.messagePill, { backgroundColor: theme.warningSoft }]}>
                <Text style={[styles.messageText, { color: theme.warning, fontSize: scaleSize(12, textScale) }]}>
                  {message}
                </Text>
              </View>
            ) : null}
          </View>

          <ScrollView contentContainerStyle={styles.listContent}>
            {cartItems.map((item) => (
              <ProductCard
                key={item.lineId}
                actions={(
                  <View style={styles.actionCluster}>
                    <ProductActionButton
                      label="-1"
                      onPress={() => void removeOne(item.productId)}
                      theme={theme}
                      textScale={textScale}
                    />
                    <ProductActionButton
                      label="+1"
                      onPress={() => void addOne(item.productId)}
                      theme={theme}
                      textScale={textScale}
                    />
                    <ProductActionButton
                      danger
                      label={busyProductId === item.productId ? "..." : "Remove"}
                      onPress={() => void removeLine(item.productId, item.quantity)}
                      theme={theme}
                      textScale={textScale}
                    />
                  </View>
                )}
                badge={busyProductId === item.productId ? "Updating" : item.category ?? strings.cart}
                language={language}
                quantity={item.quantity}
                subtitle={`${formatLocation(item)} | ${item.barcode}`}
                textScale={textScale}
                theme={theme}
                title={item.name}
                totalPrice={item.lineTotal}
                unitPrice={item.unitPrice}
              />
            ))}

            {!cartItems.length ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.cardMuted }]}>
                <Text style={[styles.emptyTitle, { color: theme.textPrimary, fontSize: scaleSize(18, textScale) }]}>
                  {strings.cart}
                </Text>
                <Text style={[styles.emptyText, { color: theme.textMuted, fontSize: scaleSize(14, textScale) }]}>
                  {strings.emptyCart}
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>

      <View style={styles.summaryColumn}>
        <View style={[
          styles.summaryCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border
          },
          shadowStyle(theme, 18)
        ]}>
          <View style={styles.summaryTop}>
            <Text style={[styles.summaryTitle, { color: theme.textPrimary, fontSize: scaleSize(20, textScale) }]}>
              {strings.itemSummary}
            </Text>
            <View style={styles.summaryRows}>
              <SummaryRow label={strings.cartItems} value={`${cartQuantity}`} textScale={textScale} theme={theme} />
              <SummaryRow label={strings.shoppingList} value={`${snapshot?.shoppingList.length ?? 0}`} textScale={textScale} theme={theme} />
            </View>

            <AnimatedTotal
              label={strings.total}
              language={language}
              textScale={textScale}
              theme={theme}
              value={snapshot?.totals.total}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={!canCheckout}
            onPress={onCheckout}
            style={({ pressed }) => [
              styles.checkoutButton,
              {
                backgroundColor: canCheckout ? theme.accent : theme.border,
                transform: [{ scale: pressed && canCheckout ? 0.98 : 1 }]
              }
            ]}
          >
            <Text style={[styles.checkoutText, { fontSize: scaleSize(16, textScale) }]}>
              {strings.confirmCheckout}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  textScale,
  theme
}: {
  label: string;
  value: string;
  textScale: number;
  theme: ThemePalette;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: theme.textMuted, fontSize: scaleSize(13, textScale) }]}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, { color: theme.textPrimary, fontSize: scaleSize(15, textScale) }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: "row",
    gap: 16,
    minHeight: 0
  },
  layoutStacked: {
    flexDirection: "column"
  },
  listColumn: {
    flex: 1.3,
    minHeight: 0
  },
  summaryColumn: {
    flex: 0.8,
    minHeight: 0
  },
  sectionCard: {
    flex: 1,
    minHeight: 0,
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    gap: 16
  },
  summaryCard: {
    flex: 1,
    minHeight: 0,
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    justifyContent: "space-between",
    gap: 16
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap"
  },
  title: {
    fontWeight: "900"
  },
  subtitle: {
    fontWeight: "700"
  },
  messagePill: {
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  messageText: {
    fontWeight: "900"
  },
  listContent: {
    gap: 12,
    paddingBottom: 4
  },
  actionCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  emptyCard: {
    minHeight: 240,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    gap: 8
  },
  emptyTitle: {
    fontWeight: "900"
  },
  emptyText: {
    fontWeight: "700",
    textAlign: "center"
  },
  summaryTop: {
    gap: 16
  },
  summaryTitle: {
    fontWeight: "900"
  },
  summaryRows: {
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
  checkoutButton: {
    minHeight: 62,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  checkoutText: {
    color: "#ffffff",
    fontWeight: "900"
  }
});
