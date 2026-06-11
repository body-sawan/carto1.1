import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { CART_DUMMY_ADS } from "../data/dummyAds";
import type { ThemePalette } from "../ui/appUi";
import { PromoAdCard } from "./PromoAdCard";

interface ProductPromoPanelProps {
  textScale: number;
  theme: ThemePalette;
}

export function ProductPromoPanel({ textScale, theme }: ProductPromoPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setActiveIndex((current) => (current + 1) % CART_DUMMY_ADS.length);
    }, 5200);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <View style={styles.root}>
      <PromoAdCard ad={CART_DUMMY_ADS[activeIndex]} mode="cart" textScale={textScale} theme={theme} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {}
});
