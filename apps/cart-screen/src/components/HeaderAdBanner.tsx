import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { HEADER_DUMMY_ADS } from "../data/dummyAds";
import type { ThemePalette } from "../ui/appUi";
import { PromoAdCard } from "./PromoAdCard";

interface HeaderAdBannerProps {
  textScale: number;
  theme: ThemePalette;
}

export function HeaderAdBanner({ textScale, theme }: HeaderAdBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const intervalId = setInterval(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true
      }).start(({ finished }) => {
        if (!finished) return;

        setActiveIndex((current) => (current + 1) % HEADER_DUMMY_ADS.length);

        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true
        }).start();
      });
    }, 4200);

    return () => clearInterval(intervalId);
  }, [opacity]);

  const activeAd = HEADER_DUMMY_ADS[activeIndex];

  return (
    <Animated.View style={[styles.root, { opacity }]}>
      <PromoAdCard ad={activeAd} mode="header" textScale={textScale} theme={theme} />
      <View style={[styles.metaPill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.metaPillText, { color: theme.textMuted }]}>Demo promo</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%"
  },
  metaPill: {
    position: "absolute",
    top: 12,
    right: 12,
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  metaPillText: {
    fontSize: 10,
    fontWeight: "800"
  }
});
