import { CreditCard, House, Map, ScanLine, Settings2, ShoppingCart } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { TabletTab } from "../store/cartUiStore";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { scaleSize, shadowStyle } from "../ui/appUi";

interface BottomNavProps {
  activeTab: TabletTab;
  onSelect: (tab: TabletTab) => void;
  strings: AppStrings;
  textScale: number;
  theme: ThemePalette;
}

const navItems = [
  { key: "home", icon: House },
  { key: "scan", icon: ScanLine },
  { key: "cart", icon: ShoppingCart },
  { key: "map", icon: Map },
  { key: "checkout", icon: CreditCard },
  { key: "settings", icon: Settings2 }
] as const satisfies ReadonlyArray<{ key: TabletTab; icon: typeof House }>;

export function BottomNav({ activeTab, onSelect, strings, textScale, theme }: BottomNavProps) {
  const labels: Record<TabletTab, string> = {
    home: strings.home,
    scan: strings.scan,
    cart: strings.cart,
    map: strings.map,
    checkout: strings.checkout,
    settings: strings.settings
  };

  return (
    <View
      style={[
        styles.navBar,
        {
          backgroundColor: theme.nav,
          borderColor: theme.border
        },
        shadowStyle(theme, 8)
      ]}
    >
      {navItems.map((item) => {
        const active = item.key === activeTab;
        const Icon = item.icon;

        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            onPress={() => onSelect(item.key)}
            style={({ pressed }) => [
              styles.navItem,
              {
                backgroundColor: active ? theme.accentSoft : "transparent",
                borderColor: active ? theme.accent : "transparent",
                transform: [{ scale: pressed ? 0.98 : 1 }]
              }
            ]}
          >
            <Icon size={20} color={active ? theme.accent : theme.textSecondary} />
            <Text
              style={[
                styles.navLabel,
                {
                  color: active ? theme.accent : theme.textSecondary,
                  fontSize: scaleSize(12, textScale)
                }
              ]}
            >
              {labels[item.key]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    minHeight: 82,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  navItem: {
    flex: 1,
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8
  },
  navLabel: {
    fontWeight: "800"
  }
});
