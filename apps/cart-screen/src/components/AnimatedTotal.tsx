import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { UiLanguage } from "../store/cartUiStore";
import type { ThemePalette } from "../ui/appUi";
import { formatCurrency, scaleSize } from "../ui/appUi";

interface AnimatedTotalProps {
  label: string;
  language: UiLanguage;
  textScale: number;
  theme: ThemePalette;
  value: number | undefined;
}

export function AnimatedTotal({ label, language, textScale, theme, value }: AnimatedTotalProps) {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const previousValue = useRef<number | undefined>(value);

  useEffect(() => {
    if (previousValue.current === undefined || previousValue.current === value) {
      previousValue.current = value;
      return;
    }

    previousValue.current = value;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 180, useNativeDriver: true }),
        Animated.spring(pulse, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true })
      ]),
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 180, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 280, useNativeDriver: false })
      ])
    ]).start();
  }, [glow, pulse, value]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: glow.interpolate({
            inputRange: [0, 1],
            outputRange: [theme.card, theme.accentSoft]
          }) as unknown as string,
          borderColor: theme.border,
          transform: [{ scale: pulse }]
        }
      ]}
    >
      <Text style={[styles.label, { color: theme.textMuted, fontSize: scaleSize(12, textScale) }]}>
        {label}
      </Text>
      <Text style={[styles.value, { color: theme.textPrimary, fontSize: scaleSize(28, textScale) }]}>
        {formatCurrency(value, language)}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4
  },
  label: {
    fontWeight: "800",
    textTransform: "uppercase"
  },
  value: {
    fontWeight: "900"
  }
});
