import { StyleSheet, View } from "react-native";
import type { ThemePalette } from "../ui/appUi";

interface StatusDotIndicatorProps {
  theme: ThemePalette;
  active?: boolean;
}

export function StatusDotIndicator({ active = true, theme }: StatusDotIndicatorProps) {
  return (
    <View
      style={[
        styles.dot,
        {
          backgroundColor: theme.success,
          opacity: active ? 1 : 0.32
        }
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 9,
    height: 9,
    borderRadius: 999
  }
});
