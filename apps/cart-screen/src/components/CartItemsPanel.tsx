import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Package2 } from "lucide-react-native";
import type { CartSnapshot, UiLanguage } from "../store/cartUiStore";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { formatCurrency, scaleSize, shadowStyle } from "../ui/appUi";
import { ProductPromoPanel } from "./ProductPromoPanel";

interface CartItemsPanelProps {
  connected: boolean;
  language: UiLanguage;
  onCheckout: () => void;
  snapshot: CartSnapshot | null;
  strings: AppStrings;
  textScale: number;
  theme: ThemePalette;
}

interface DisplayCartItem {
  exiting: boolean;
  item: CartSnapshot["cartItems"][number];
  opacity: Animated.Value;
  scale: Animated.Value;
  translateX: Animated.Value;
  translateY: Animated.Value;
}

const ENTER_DURATION = 240;
const EXIT_DURATION = 220;

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
  const checkoutDisabled = !connected || !cartItems.length || snapshot?.state !== "SHOPPING";
  const [displayItems, setDisplayItems] = useState<DisplayCartItem[]>(() => cartItems.map((item) => createDisplayCartItem(item)));
  const lineCount = displayItems.length;
  const itemCount = displayItems.reduce((sum, entry) => sum + entry.item.quantity, 0);
  const totalPulse = useRef(new Animated.Value(1)).current;
  const totalGlow = useRef(new Animated.Value(0)).current;
  const previousTotal = useRef<number | undefined>(snapshot?.totals.total);

  useEffect(() => {
    const currentById = new Map(displayItems.map((entry) => [entry.item.lineId, entry]));
    const incomingById = new Map(cartItems.map((item) => [item.lineId, item]));
    const nextDisplayItems: DisplayCartItem[] = [];
    let changed = false;

    for (const entry of displayItems) {
      const incoming = incomingById.get(entry.item.lineId);

      if (incoming) {
        incomingById.delete(entry.item.lineId);
        if (entry.exiting || !sameCartItem(entry.item, incoming)) {
          changed = true;
          nextDisplayItems.push({ ...entry, exiting: false, item: incoming });
        } else {
          nextDisplayItems.push(entry);
        }
        continue;
      }

      if (!entry.exiting) {
        changed = true;
        nextDisplayItems.push({ ...entry, exiting: true });
        animateCartItemOut(entry, () => {
          setDisplayItems((current) => current.filter((item) => item.item.lineId !== entry.item.lineId));
        });
      } else {
        nextDisplayItems.push(entry);
      }
    }

    for (const item of cartItems) {
      if (currentById.has(item.lineId)) continue;
      changed = true;
      const entry = createDisplayCartItem(item, true);
      nextDisplayItems.push(entry);
      animateCartItemIn(entry);
    }

    if (changed) {
      setDisplayItems(nextDisplayItems);
    }
  }, [cartItems, displayItems]);

  useEffect(() => {
    const currentTotal = snapshot?.totals.total;
    if (previousTotal.current === undefined || previousTotal.current === currentTotal) {
      previousTotal.current = currentTotal;
      return;
    }

    previousTotal.current = currentTotal;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(totalPulse, {
          toValue: 1.04,
          duration: 160,
          useNativeDriver: true
        }),
        Animated.spring(totalPulse, {
          toValue: 1,
          friction: 5,
          tension: 90,
          useNativeDriver: true
        })
      ]),
      Animated.sequence([
        Animated.timing(totalGlow, {
          toValue: 1,
          duration: 180,
          useNativeDriver: false
        }),
        Animated.timing(totalGlow, {
          toValue: 0,
          duration: 280,
          useNativeDriver: false
        })
      ])
    ]).start();
  }, [snapshot?.totals.total, totalGlow, totalPulse]);

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
        {displayItems.map((entry) => (
          <Animated.View
            key={entry.item.lineId}
            style={[
              styles.itemMotion,
              {
                opacity: entry.opacity,
                transform: [
                  { translateX: entry.translateX },
                  { translateY: entry.translateY },
                  { scale: entry.scale }
                ]
              }
            ]}
          >
            <View
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
                  {entry.item.name}
                </Text>
                <Text style={[styles.meta, { color: theme.textMuted, fontSize: scaleSize(12, textScale) }]}>
                  {`${entry.item.quantity} x ${formatCurrency(entry.item.unitPrice, language)}`}
                </Text>
              </View>
              <Text style={[styles.lineTotal, { color: theme.textPrimary, fontSize: scaleSize(14, textScale) }]}>
                {formatCurrency(entry.item.lineTotal, language)}
              </Text>
            </View>
          </Animated.View>
        ))}

        {!displayItems.length ? (
          <View style={[styles.emptyState, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary, fontSize: scaleSize(17, textScale) }]}>
              {strings.emptyCart}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <ProductPromoPanel textScale={textScale} theme={theme} />

      <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Animated.View
          style={[
            styles.totalRow,
            {
              backgroundColor: totalGlow.interpolate({
                inputRange: [0, 1],
                outputRange: [theme.surface, theme.accentSoft]
              }) as unknown as string,
              borderColor: theme.border,
              transform: [{ scale: totalPulse }]
            }
          ]}
        >
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textMuted, fontSize: scaleSize(11, textScale) }]}>
              {strings.total}
            </Text>
            <Text style={[styles.summaryValue, { color: theme.textPrimary, fontSize: scaleSize(22, textScale) }]}>
              {formatCurrency(snapshot?.totals.total, language)}
            </Text>
          </View>
        </Animated.View>

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

function createDisplayCartItem(item: CartSnapshot["cartItems"][number], entering = false): DisplayCartItem {
  return {
    exiting: false,
    item,
    opacity: new Animated.Value(entering ? 0 : 1),
    scale: new Animated.Value(entering ? 0.98 : 1),
    translateX: new Animated.Value(0),
    translateY: new Animated.Value(entering ? 12 : 0)
  };
}

function animateCartItemIn(entry: DisplayCartItem) {
  entry.opacity.setValue(0);
  entry.scale.setValue(0.98);
  entry.translateY.setValue(12);
  entry.translateX.setValue(0);

  Animated.parallel([
    Animated.timing(entry.opacity, {
      toValue: 1,
      duration: ENTER_DURATION,
      useNativeDriver: true
    }),
    Animated.spring(entry.scale, {
      toValue: 1,
      friction: 6,
      tension: 90,
      useNativeDriver: true
    }),
    Animated.timing(entry.translateY, {
      toValue: 0,
      duration: ENTER_DURATION,
      useNativeDriver: true
    })
  ]).start();
}

function animateCartItemOut(entry: DisplayCartItem, onDone: () => void) {
  Animated.parallel([
    Animated.timing(entry.opacity, {
      toValue: 0,
      duration: EXIT_DURATION,
      useNativeDriver: true
    }),
    Animated.timing(entry.scale, {
      toValue: 0.94,
      duration: EXIT_DURATION,
      useNativeDriver: true
    }),
    Animated.timing(entry.translateX, {
      toValue: 46,
      duration: EXIT_DURATION,
      useNativeDriver: true
    })
  ]).start(({ finished }) => {
    if (finished) onDone();
  });
}

function sameCartItem(a: CartSnapshot["cartItems"][number], b: CartSnapshot["cartItems"][number]) {
  return a.lineId === b.lineId
    && a.quantity === b.quantity
    && a.lineTotal === b.lineTotal
    && a.unitPrice === b.unitPrice
    && a.name === b.name;
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
  itemMotion: {
    minHeight: 0
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
  totalRow: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
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
