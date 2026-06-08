import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { CheckCircle2 } from "lucide-react-native";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { scaleSize } from "../ui/appUi";
import { CartoLogo } from "./CartoLogo";

interface CheckoutSuccessOverlayProps {
  strings: AppStrings;
  textScale: number;
  theme: ThemePalette;
  visible: boolean;
}

export function CheckoutSuccessOverlay({
  strings,
  textScale,
  theme,
  visible
}: CheckoutSuccessOverlayProps) {
  const [rendered, setRendered] = useState(visible);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      opacity.setValue(0);
      scale.setValue(0.94);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 90,
          useNativeDriver: true
        })
      ]).start();
      return;
    }

    if (!rendered) return;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true
      }),
      Animated.timing(scale, {
        toValue: 0.96,
        duration: 180,
        useNativeDriver: true
      })
    ]).start(({ finished }) => {
      if (finished) setRendered(false);
    });
  }, [opacity, rendered, scale, visible]);

  if (!rendered) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity }]}>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.success,
            transform: [{ scale }]
          }
        ]}
      >
        <CartoLogo height={72} radius={22} resizeMode="cover" width={174} />
        <View style={[styles.iconWrap, { backgroundColor: theme.successSoft }]}>
          <CheckCircle2 size={72} color={theme.success} />
        </View>
        <Text style={[styles.title, { color: theme.success, fontSize: scaleSize(30, textScale) }]}>
          {strings.paymentCompleteTitle}
        </Text>
        <Text style={[styles.body, { color: theme.textPrimary, fontSize: scaleSize(18, textScale) }]}>
          {strings.thankYou}
        </Text>
        <Text style={[styles.note, { color: theme.textMuted, fontSize: scaleSize(14, textScale) }]}>
          {strings.returnCountdown}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 20, 35, 0.24)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  card: {
    width: "100%",
    maxWidth: 780,
    minHeight: 340,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    gap: 14
  },
  iconWrap: {
    width: 128,
    height: 128,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    fontWeight: "900",
    textAlign: "center"
  },
  body: {
    fontWeight: "800",
    textAlign: "center"
  },
  note: {
    fontWeight: "700",
    textAlign: "center"
  }
});
