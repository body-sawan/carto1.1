import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { ShoppingCart } from "lucide-react-native";
import type { ThemePalette } from "../ui/appUi";

interface BrandTransitionScreenProps {
  appName: string;
  onComplete: () => void;
  theme: ThemePalette;
}

export function BrandTransitionScreen({ appName, onComplete, theme }: BrandTransitionScreenProps) {
  const wordX = useRef(new Animated.Value(-240)).current;
  const cartX = useRef(new Animated.Value(240)).current;
  const piecesOpacity = useRef(new Animated.Value(1)).current;
  const finalOpacity = useRef(new Animated.Value(0)).current;
  const finalScale = useRef(new Animated.Value(0.92)).current;
  const stageOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(wordX, {
          toValue: 0,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.timing(cartX, {
          toValue: 0,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        })
      ]),
      Animated.parallel([
        Animated.timing(piecesOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true
        }),
        Animated.timing(finalOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true
        }),
        Animated.spring(finalScale, {
          toValue: 1,
          friction: 6,
          tension: 90,
          useNativeDriver: true
        })
      ]),
      Animated.delay(360),
      Animated.timing(stageOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true
      })
    ]);

    animation.start(({ finished }) => {
      if (finished) onComplete();
    });

    return () => animation.stop();
  }, [cartX, finalOpacity, finalScale, onComplete, piecesOpacity, stageOpacity, wordX]);

  return (
    <Animated.View style={[styles.root, { backgroundColor: theme.background, opacity: stageOpacity }]}>
      <View style={styles.stage}>
        <Animated.Text
          style={[
            styles.word,
            {
              color: theme.textPrimary,
              opacity: piecesOpacity,
              transform: [{ translateX: wordX }]
            }
          ]}
        >
          {appName}
        </Animated.Text>

        <Animated.View
          style={[
            styles.cartBadge,
            {
              backgroundColor: theme.accentSoft,
              opacity: piecesOpacity,
              transform: [{ translateX: cartX }]
            }
          ]}
        >
          <ShoppingCart size={44} color={theme.accent} />
        </Animated.View>

        <Animated.View
          style={[
            styles.finalMark,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: finalOpacity,
              transform: [{ scale: finalScale }]
            }
          ]}
        >
          <View style={[styles.finalIcon, { backgroundColor: theme.accentSoft }]}>
            <ShoppingCart size={32} color={theme.accent} />
          </View>
          <Text style={[styles.finalText, { color: theme.textPrimary }]}>{appName}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  stage: {
    width: "100%",
    maxWidth: 960,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center"
  },
  word: {
    position: "absolute",
    left: "12%",
    fontSize: 72,
    fontWeight: "900",
    letterSpacing: -2
  },
  cartBadge: {
    position: "absolute",
    right: "12%",
    width: 108,
    height: 108,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  finalMark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 32,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 18
  },
  finalIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  finalText: {
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -1
  }
});
