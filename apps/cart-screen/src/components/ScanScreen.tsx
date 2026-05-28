import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";
import { AlertTriangle, Check, Search, ShoppingBasket, Trash2 } from "lucide-react-native";
import type { Product } from "@carto/shared";
import type { CartSnapshot, UiLanguage, UiScanMode } from "../store/cartUiStore";
import { fetchCatalog, postDevAction } from "../realtime/httpClient";
import { ProductActionButton, ProductCard } from "./ProductCard";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { scaleSize, shadowStyle } from "../ui/appUi";
import { friendlyMessage, formatLocation } from "./shopperUtils";

interface ScanScreenProps {
  language: UiLanguage;
  onProductFailure?: (payload: { message: string; productName: string }) => void;
  scanMode: UiScanMode;
  snapshot: CartSnapshot | null;
  strings: AppStrings;
  textScale: number;
  theme: ThemePalette;
}

interface ScanResultState {
  action: "add" | "remove";
  message: string;
  product: Product | null;
  status: "success" | "error";
}

export function ScanScreen({
  language,
  onProductFailure,
  scanMode,
  snapshot: _snapshot,
  strings,
  textScale,
  theme
}: ScanScreenProps) {
  const { width } = useWindowDimensions();
  const stacked = width < 1100;
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<"add" | "remove">("add");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResultState | null>(null);
  const scanLineProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void loadCatalog();
  }, []);

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(scanLineProgress, {
        toValue: 1,
        duration: 1700,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(scanLineProgress, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true
      })
    ]));

    animation.start();
    return () => animation.stop();
  }, [scanLineProgress]);

  const scanLineTranslate = scanLineProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 210]
  });

  const filteredCatalog = catalog.filter((product) => (
    product.name.toLowerCase().includes(query.trim().toLowerCase())
    || product.category.toLowerCase().includes(query.trim().toLowerCase())
  ));
  const visibleCatalog = searchOpen ? filteredCatalog : catalog;
  const selectedProduct = catalog.find((product) => product.id === selectedProductId) ?? null;

  async function loadCatalog() {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const response = await fetchCatalog();
      setCatalog(response.products);
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "Unable to load products.");
    } finally {
      setCatalogLoading(false);
    }
  }

  async function submitProduct(product: Product) {
    const endpoint = actionMode === "add" ? "/dev/scan" : "/dev/remove";
    setPendingProductId(product.id);
    try {
      await postDevAction(endpoint, { productId: product.id });
      setResult({
        action: actionMode,
        message: actionMode === "add" ? `${product.name} added to cart.` : `${product.name} removed from cart.`,
        product,
        status: "success"
      });
      if (scanMode === "manual") setSelectedProductId(null);
    } catch (error) {
      const message = friendlyMessage(error instanceof Error ? error.message : "Scan failed.", language);
      setResult({
        action: actionMode,
        message,
        product,
        status: "error"
      });
      onProductFailure?.({
        message,
        productName: product.name
      });
    } finally {
      setPendingProductId(null);
    }
  }

  function handleProductTap(product: Product) {
    if (scanMode === "manual") {
      setSelectedProductId(product.id);
      return;
    }

    void submitProduct(product);
  }

  return (
    <View style={[styles.layout, stacked ? styles.layoutStacked : null]}>
      <View style={styles.previewColumn}>
        <View style={[
          styles.previewCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border
          },
          shadowStyle(theme, 10)
        ]}>
          <View style={styles.previewHeader}>
            <View>
              <Text style={[styles.previewTitle, { color: theme.textPrimary, fontSize: scaleSize(22, textScale) }]}>
                {strings.cameraPlaceholder}
              </Text>
              <Text style={[styles.previewSubtitle, { color: theme.textMuted, fontSize: scaleSize(13, textScale) }]}>
                {strings.cameraSub}
              </Text>
            </View>
            <View style={[styles.stateBadge, { backgroundColor: theme.successSoft }]}>
              <Text style={[styles.stateBadgeText, { color: theme.success, fontSize: scaleSize(12, textScale) }]}>
                {strings.scanReady}
              </Text>
            </View>
          </View>

          <View style={[styles.cameraStage, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
            <View style={[styles.corner, styles.cornerTopLeft, { borderColor: theme.accent }]} />
            <View style={[styles.corner, styles.cornerTopRight, { borderColor: theme.accent }]} />
            <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: theme.accent }]} />
            <View style={[styles.corner, styles.cornerBottomRight, { borderColor: theme.accent }]} />
            <Animated.View
              style={[
                styles.scanGuide,
                {
                  backgroundColor: theme.success,
                  transform: [{ translateY: scanLineTranslate }]
                }
              ]}
            />
            <Text style={[styles.cameraHint, { color: theme.textMuted, fontSize: scaleSize(14, textScale) }]}>
              {strings.rearCameraNote}
            </Text>
          </View>

          <View style={styles.toggleRow}>
            <ModeToggle
              active={actionMode === "add"}
              icon={<ShoppingBasket size={18} color={actionMode === "add" ? "#ffffff" : theme.accent} />}
              label={strings.addMode}
              onPress={() => setActionMode("add")}
              textScale={textScale}
              theme={theme}
            />
            <ModeToggle
              active={actionMode === "remove"}
              danger
              icon={<Trash2 size={18} color={actionMode === "remove" ? "#ffffff" : theme.error} />}
              label={strings.removeMode}
              onPress={() => setActionMode("remove")}
              textScale={textScale}
              theme={theme}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setSearchOpen((current) => !current)}
            style={({ pressed }) => [
              styles.searchToggle,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                transform: [{ scale: pressed ? 0.98 : 1 }]
              }
            ]}
          >
            <Search size={18} color={theme.textPrimary} />
            <Text style={[styles.searchToggleText, { color: theme.textPrimary, fontSize: scaleSize(13, textScale) }]}>
              {strings.searchProducts}
            </Text>
          </Pressable>
        </View>

        <View style={[
          styles.feedbackCard,
          {
            backgroundColor: result?.status === "error" ? theme.errorSoft : theme.card,
            borderColor: result?.status === "success" ? theme.success : result?.status === "error" ? theme.error : theme.border
          }
        ]}>
          <View style={styles.feedbackRow}>
            <View style={[
              styles.feedbackIcon,
              {
                backgroundColor: result?.status === "error" ? theme.errorSoft : theme.successSoft
              }
            ]}>
              {result?.status === "error"
                ? <AlertTriangle size={18} color={theme.error} />
                : <Check size={18} color={theme.success} />}
            </View>
            <View style={styles.feedbackCopy}>
              <Text style={[styles.feedbackTitle, { color: theme.textPrimary, fontSize: scaleSize(17, textScale) }]}>
                {strings.lastScan}
              </Text>
              <Text style={[styles.feedbackText, { color: theme.textSecondary, fontSize: scaleSize(13, textScale) }]}>
                {result?.message ?? strings.scanFallback}
              </Text>
            </View>
          </View>

          {result?.product ? (
            <ProductCard
              badge={result.action === "add" ? strings.addMode : strings.removeMode}
              language={language}
              quantity={1}
              subtitle={`${result.product.category} | ${formatLocation(result.product)}`}
              textScale={textScale}
              theme={theme}
              title={result.product.name}
              tone={result.status === "error" ? "warning" : "success"}
              unitPrice={result.product.price}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.catalogColumn}>
        <View style={[
          styles.catalogCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border
          },
          shadowStyle(theme, 10)
        ]}>
          <View style={styles.catalogHeader}>
            <View>
              <Text style={[styles.catalogTitle, { color: theme.textPrimary, fontSize: scaleSize(20, textScale) }]}>
                {strings.searchProducts}
              </Text>
              <Text style={[styles.catalogSubtitle, { color: theme.textMuted, fontSize: scaleSize(13, textScale) }]}>
                {scanMode === "manual" ? strings.manualConfirm : strings.autoScan}
              </Text>
            </View>
            {catalogLoading ? <ActivityIndicator size="small" color={theme.accent} /> : null}
          </View>

          {searchOpen ? (
            <TextInput
              placeholder={strings.searchPlaceholder}
              placeholderTextColor={theme.textMuted}
              value={query}
              onChangeText={setQuery}
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.cardMuted,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                  fontSize: scaleSize(14, textScale)
                }
              ]}
            />
          ) : null}

          {catalogError ? (
            <Text style={[styles.errorText, { color: theme.error, fontSize: scaleSize(13, textScale) }]}>
              {catalogError}
            </Text>
          ) : null}

          <ScrollView contentContainerStyle={styles.catalogList}>
            {visibleCatalog.map((product) => (
              <ProductCard
                key={product.id}
                actions={(
                  <ProductActionButton
                    label={scanMode === "manual" ? strings.confirmAction : strings.scan}
                    onPress={() => handleProductTap(product)}
                    theme={theme}
                    textScale={textScale}
                  />
                )}
                badge={selectedProductId === product.id ? strings.confirmAction : product.category}
                language={language}
                subtitle={`${formatLocation(product)} | ${product.barcode}`}
                textScale={textScale}
                theme={theme}
                title={product.name}
                tone={selectedProductId === product.id ? "success" : "default"}
                unitPrice={product.price}
              />
            ))}

            {!catalogLoading && !visibleCatalog.length ? (
              <Text style={[styles.emptyText, { color: theme.textMuted, fontSize: scaleSize(14, textScale) }]}>
                {strings.noProductMatch}
              </Text>
            ) : null}
          </ScrollView>

          {scanMode === "manual" && selectedProduct ? (
            <View style={[styles.confirmBar, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
              <View style={styles.confirmCopy}>
                <Text style={[styles.confirmTitle, { color: theme.textPrimary, fontSize: scaleSize(15, textScale) }]}>
                  {selectedProduct.name}
                </Text>
                <Text style={[styles.confirmSub, { color: theme.textMuted, fontSize: scaleSize(12, textScale) }]}>
                  {strings.confirmAction}
                </Text>
              </View>
              <ProductActionButton
                label={pendingProductId === selectedProduct.id ? "..." : strings.confirmAction}
                onPress={() => void submitProduct(selectedProduct)}
                theme={theme}
                textScale={textScale}
              />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ModeToggle({
  active,
  danger,
  icon,
  label,
  onPress,
  textScale,
  theme
}: {
  active: boolean;
  danger?: boolean;
  icon: ReactNode;
  label: string;
  onPress: () => void;
  textScale: number;
  theme: ThemePalette;
}) {
  const activeBackground = danger ? theme.error : theme.accent;
  const inactiveBackground = theme.card;
  const inactiveBorder = danger ? theme.error : theme.accent;
  const inactiveColor = danger ? theme.error : theme.accent;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeButton,
        {
          backgroundColor: active ? activeBackground : inactiveBackground,
          borderColor: active ? activeBackground : inactiveBorder,
          transform: [{ scale: pressed ? 0.98 : 1 }]
        }
      ]}
    >
      {icon}
      <Text style={[
        styles.modeButtonText,
        {
          color: active ? "#ffffff" : inactiveColor,
          fontSize: scaleSize(13, textScale)
        }
      ]}>
        {label}
      </Text>
    </Pressable>
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
  previewColumn: {
    flex: 1,
    gap: 16
  },
  catalogColumn: {
    flex: 1,
    minHeight: 0
  },
  previewCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 14
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  previewTitle: {
    fontWeight: "800"
  },
  previewSubtitle: {
    fontWeight: "600"
  },
  stateBadge: {
    minHeight: 32,
    borderRadius: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  stateBadgeText: {
    fontWeight: "800"
  },
  cameraStage: {
    height: 280,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: 18,
    position: "relative"
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderWidth: 3
  },
  cornerTopLeft: {
    top: 16,
    left: 16,
    borderRightWidth: 0,
    borderBottomWidth: 0
  },
  cornerTopRight: {
    top: 16,
    right: 16,
    borderLeftWidth: 0,
    borderBottomWidth: 0
  },
  cornerBottomLeft: {
    bottom: 16,
    left: 16,
    borderRightWidth: 0,
    borderTopWidth: 0
  },
  cornerBottomRight: {
    bottom: 16,
    right: 16,
    borderLeftWidth: 0,
    borderTopWidth: 0
  },
  scanGuide: {
    position: "absolute",
    left: 22,
    right: 22,
    height: 3,
    borderRadius: 999,
    top: 16
  },
  cameraHint: {
    fontWeight: "600",
    textAlign: "center"
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10
  },
  modeButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  modeButtonText: {
    fontWeight: "800"
  },
  searchToggle: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  searchToggleText: {
    fontWeight: "700"
  },
  feedbackCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 12
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  feedbackIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  feedbackCopy: {
    flex: 1,
    gap: 4
  },
  feedbackTitle: {
    fontWeight: "800"
  },
  feedbackText: {
    fontWeight: "600"
  },
  catalogCard: {
    flex: 1,
    minHeight: 0,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 12
  },
  catalogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  catalogTitle: {
    fontWeight: "800"
  },
  catalogSubtitle: {
    fontWeight: "600"
  },
  searchInput: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14
  },
  errorText: {
    fontWeight: "700"
  },
  catalogList: {
    gap: 12,
    paddingBottom: 4
  },
  emptyText: {
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 18
  },
  confirmBar: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  confirmCopy: {
    flex: 1,
    gap: 3
  },
  confirmTitle: {
    fontWeight: "800"
  },
  confirmSub: {
    fontWeight: "600"
  }
});
