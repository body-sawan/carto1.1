import { useEffect, useRef, type ReactNode } from "react";
import { Animated, StyleSheet, type ViewStyle } from "react-native";

interface RevealViewProps {
  children: ReactNode;
  delay?: number;
  style?: ViewStyle | ViewStyle[];
}

export function RevealView({ children, delay = 0, style }: RevealViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true
        })
      ])
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={[styles.base, style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 0
  }
});
