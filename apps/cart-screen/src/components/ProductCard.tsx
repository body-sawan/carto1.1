import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Package2 } from "lucide-react-native";
import type { UiLanguage } from "../store/cartUiStore";
import type { ThemePalette } from "../ui/appUi";
import { formatCurrency, scaleSize, shadowStyle } from "../ui/appUi";

interface ProductCardProps {
  actions?: ReactNode;
  badge?: string;
  language: UiLanguage;
  quantity?: number;
  subtitle?: string;
  textScale: number;
  theme: ThemePalette;
  title: string;
  tone?: "default" | "success" | "warning";
  totalPrice?: number;
  unitPrice?: number;
}

export function ProductCard({
  actions,
  badge,
  language,
  quantity,
  subtitle,
  textScale,
  theme,
  title,
  tone = "default",
  totalPrice,
  unitPrice
}: ProductCardProps) {
  const accent = getTonePalette(tone, theme);

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: theme.card,
        borderColor: theme.border
      },
      shadowStyle(theme, 8)
    ]}>
      <View style={[styles.iconWrap, { backgroundColor: accent.soft }]}>
        <Package2 size={22} color={accent.main} />
      </View>

      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.textPrimary, fontSize: scaleSize(17, textScale) }]} numberOfLines={2}>
            {title}
          </Text>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: accent.soft }]}>
              <Text style={[styles.badgeText, { color: accent.main, fontSize: scaleSize(11, textScale) }]}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>

        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textMuted, fontSize: scaleSize(13, textScale) }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {typeof quantity === "number" ? (
            <MetaPill label={`Qty ${quantity}`} textScale={textScale} theme={theme} />
          ) : null}
          {typeof unitPrice === "number" ? (
            <MetaPill label={`Unit ${formatCurrency(unitPrice, language)}`} textScale={textScale} theme={theme} />
          ) : null}
          {typeof totalPrice === "number" ? (
            <MetaPill label={`Line ${formatCurrency(totalPrice, language)}`} textScale={textScale} theme={theme} />
          ) : null}
        </View>
      </View>

      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

export function ProductActionButton({
  danger,
  label,
  onPress,
  theme,
  textScale
}: {
  danger?: boolean;
  label: string;
  onPress: () => void;
  theme: ThemePalette;
  textScale: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: danger ? theme.errorSoft : theme.accentSoft,
          borderColor: danger ? theme.error : theme.accent,
          transform: [{ scale: pressed ? 0.98 : 1 }]
        }
      ]}
    >
      <Text style={[
        styles.actionButtonText,
        {
          color: danger ? theme.error : theme.accent,
          fontSize: scaleSize(12, textScale)
        }
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function MetaPill({ label, textScale, theme }: { label: string; textScale: number; theme: ThemePalette }) {
  return (
    <View style={[styles.metaPill, { backgroundColor: theme.cardMuted }]}>
      <Text style={[styles.metaPillText, { color: theme.textSecondary, fontSize: scaleSize(12, textScale) }]}>
        {label}
      </Text>
    </View>
  );
}

function getTonePalette(tone: "default" | "success" | "warning", theme: ThemePalette) {
  if (tone === "success") return { main: theme.success, soft: theme.successSoft };
  if (tone === "warning") return { main: theme.warning, soft: theme.warningSoft };
  return { main: theme.accent, soft: theme.accentSoft };
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1,
    gap: 6
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10
  },
  title: {
    flex: 1,
    fontWeight: "800"
  },
  subtitle: {
    fontWeight: "600"
  },
  badge: {
    minHeight: 28,
    borderRadius: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  badgeText: {
    fontWeight: "800"
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  metaPill: {
    minHeight: 28,
    borderRadius: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  metaPillText: {
    fontWeight: "700"
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end"
  },
  actionButton: {
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  actionButtonText: {
    fontWeight: "800"
  }
});
