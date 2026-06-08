import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react-native";
import type { ThemePalette } from "../ui/appUi";
import { scaleSize } from "../ui/appUi";

export interface ProductFeedback {
  icon?: "check" | "remove" | "alert";
  id: string;
  message: string;
  status: "success" | "error";
  tone?: "success" | "warning" | "error";
  title: string;
}

interface ProductFeedbackOverlayProps {
  feedback: ProductFeedback | null;
  textScale: number;
  theme: ThemePalette;
}

export function ProductFeedbackOverlay({ feedback, textScale, theme }: ProductFeedbackOverlayProps) {
  const [visibleFeedback, setVisibleFeedback] = useState<ProductFeedback | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (feedback) {
      setVisibleFeedback(feedback);
      opacity.setValue(0);
      scale.setValue(0.96);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
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

    if (!visibleFeedback) return;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true
      }),
      Animated.timing(scale, {
        toValue: 0.98,
        duration: 180,
        useNativeDriver: true
      })
    ]).start(({ finished }) => {
      if (finished) setVisibleFeedback(null);
    });
  }, [feedback, opacity, scale, visibleFeedback]);

  if (!visibleFeedback) return null;

  const tone = visibleFeedback.tone ?? (visibleFeedback.status === "success" ? "success" : "error");
  const Icon = visibleFeedback.icon === "remove"
    ? Trash2
    : visibleFeedback.icon === "alert"
      ? AlertTriangle
      : visibleFeedback.status === "success"
        ? CheckCircle2
        : AlertTriangle;
  const colors = tone === "warning"
    ? { main: theme.warning, soft: theme.warningSoft }
    : tone === "error"
      ? { main: theme.error, soft: theme.errorSoft }
      : { main: theme.success, soft: theme.successSoft };

  return (
    <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity }]}>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: colors.main,
            transform: [{ scale }]
          }
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.soft }]}>
          <Icon size={42} color={colors.main} />
        </View>
        <Text style={[styles.title, { color: theme.textPrimary, fontSize: scaleSize(32, textScale) }]}>
          {visibleFeedback.title}
        </Text>
        <Text style={[styles.message, { color: colors.main, fontSize: scaleSize(20, textScale) }]}>
          {visibleFeedback.message}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 20, 35, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  card: {
    width: "100%",
    maxWidth: 760,
    minHeight: 280,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 14
  },
  iconWrap: {
    width: 92,
    height: 92,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    fontWeight: "900",
    textAlign: "center"
  },
  message: {
    fontWeight: "800",
    textAlign: "center"
  }
});
