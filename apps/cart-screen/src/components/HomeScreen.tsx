import { StyleSheet, View, useWindowDimensions } from "react-native";
import type { CartSnapshot, UiLanguage } from "../store/cartUiStore";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { CartItemsPanel } from "./CartItemsPanel";
import { RevealView } from "./RevealView";
import { ShoppingListPanel } from "./ShoppingListPanel";
import { StaticMapViewer } from "./StaticMapViewer";

interface HomeScreenProps {
  connected: boolean;
  language: UiLanguage;
  onCheckout: () => void;
  snapshot: CartSnapshot | null;
  strings: AppStrings;
  textScale: number;
  theme: ThemePalette;
}

export function HomeScreen({
  connected,
  language,
  onCheckout,
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
          language={language}
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
