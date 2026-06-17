import { StyleSheet, View, useWindowDimensions } from "react-native";
import type { ReceiptLine } from "@carto/shared";
import type { CartSnapshot, ListDeliveryStatus, UiLanguage } from "../store/cartUiStore";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { CartItemsPanel } from "./CartItemsPanel";
import { RevealView } from "./RevealView";
import { ShoppingListPanel } from "./ShoppingListPanel";
import { StaticMapViewer } from "./StaticMapViewer";

interface HomeScreenProps {
  cartItems: ReceiptLine[];
  connected: boolean;
  language: UiLanguage;
  listStatus: ListDeliveryStatus;
  onCheckout: () => void;
  onRetryListStatus?: () => void;
  receivedItemCount: number;
  showDeliveryStatus?: boolean;
  snapshot: CartSnapshot | null;
  strings: AppStrings;
  textScale: number;
  theme: ThemePalette;
}

export function HomeScreen({
  cartItems,
  connected,
  language,
  listStatus,
  onCheckout,
  onRetryListStatus,
  receivedItemCount,
  showDeliveryStatus = true,
  snapshot,
  strings,
  textScale,
  theme
}: HomeScreenProps) {
  const { width } = useWindowDimensions();
  const stacked = width < 1220;

  return (
    <View style={[styles.layout, stacked ? styles.layoutStacked : null]}>
      <RevealView style={stacked ? [styles.leftColumn, styles.fullWidth] : styles.leftColumn}>
        <ShoppingListPanel
          cartItems={cartItems}
          language={language}
          listStatus={listStatus}
          onRetryListStatus={onRetryListStatus}
          receivedItemCount={receivedItemCount}
          showDeliveryStatus={showDeliveryStatus}
          snapshot={snapshot}
          strings={strings}
          textScale={textScale}
          theme={theme}
        />
      </RevealView>

      <RevealView delay={80} style={stacked ? [styles.centerColumn, styles.fullWidth] : styles.centerColumn}>
        <StaticMapViewer
          language={language}
          strings={strings}
          textScale={textScale}
          theme={theme}
        />
      </RevealView>

      <RevealView delay={160} style={stacked ? [styles.rightColumn, styles.fullWidth] : styles.rightColumn}>
        <CartItemsPanel
          cartItems={cartItems}
          connected={connected}
          language={language}
          onCheckout={onCheckout}
          snapshot={snapshot}
          strings={strings}
          textScale={textScale}
          theme={theme}
        />
      </RevealView>
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
  leftColumn: {
    flex: 1.05,
    minHeight: 0
  },
  centerColumn: {
    flex: 2.1,
    minHeight: 0
  },
  rightColumn: {
    flex: 1.05,
    minHeight: 0
  },
  fullWidth: {
    width: "100%"
  }
});
