import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { UiLanguage, UiScanMode, UiTextSize } from "../store/cartUiStore";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { scaleSize, shadowStyle } from "../ui/appUi";

interface SettingsScreenProps {
  connected: boolean;
  language: UiLanguage;
  onLanguageChange: (language: UiLanguage) => void;
  onResetCart: () => void;
  onScanModeChange: (scanMode: UiScanMode) => void;
  onTextSizeChange: (textSize: UiTextSize) => void;
  scanMode: UiScanMode;
  strings: AppStrings;
  textScale: number;
  textSize: UiTextSize;
  theme: ThemePalette;
}

export function SettingsScreen({
  connected,
  language,
  onLanguageChange,
  onResetCart,
  onScanModeChange,
  onTextSizeChange,
  scanMode,
  strings,
  textScale,
  textSize,
  theme
}: SettingsScreenProps) {
  const { width } = useWindowDimensions();
  const stacked = width < 1120;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={[styles.layout, stacked ? styles.layoutStacked : null]}>
        <View style={styles.primaryColumn}>
          <SectionCard title={strings.settings} subtitle={strings.settingsSubtitle} theme={theme} textScale={textScale}>
            <ChoiceRow>
              <ChoiceButton
                active={language === "en"}
                label={strings.english}
                onPress={() => onLanguageChange("en")}
                textScale={textScale}
                theme={theme}
              />
              <ChoiceButton
                active={language === "ar"}
                label={strings.arabic}
                onPress={() => onLanguageChange("ar")}
                textScale={textScale}
                theme={theme}
              />
            </ChoiceRow>
          </SectionCard>

          <SectionCard title={strings.textSize} theme={theme} textScale={textScale}>
            <ChoiceRow>
              <ChoiceButton
                active={textSize === "normal"}
                label={strings.normal}
                onPress={() => onTextSizeChange("normal")}
                textScale={textScale}
                theme={theme}
              />
              <ChoiceButton
                active={textSize === "large"}
                label={strings.large}
                onPress={() => onTextSizeChange("large")}
                textScale={textScale}
                theme={theme}
              />
            </ChoiceRow>
          </SectionCard>
        </View>

        <View style={styles.secondaryColumn}>
          <SectionCard title={strings.scanMode} theme={theme} textScale={textScale}>
            <ChoiceRow>
              <ChoiceButton
                active={scanMode === "auto"}
                label={strings.autoScan}
                onPress={() => onScanModeChange("auto")}
                textScale={textScale}
                theme={theme}
              />
              <ChoiceButton
                active={scanMode === "manual"}
                label={strings.manualConfirm}
                onPress={() => onScanModeChange("manual")}
                textScale={textScale}
                theme={theme}
              />
            </ChoiceRow>
          </SectionCard>

          <SectionCard title={strings.resetCart} theme={theme} textScale={textScale}>
            <Text style={[styles.helperText, { color: theme.textMuted, fontSize: scaleSize(14, textScale) }]}>
              {strings.resetCartHint}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={!connected}
              onPress={onResetCart}
              style={({ pressed }) => [
                styles.resetButton,
                {
                  backgroundColor: connected ? theme.error : theme.border,
                  transform: [{ scale: pressed && connected ? 0.98 : 1 }]
                }
              ]}
            >
              <Text style={[styles.resetButtonText, { fontSize: scaleSize(15, textScale) }]}>
                {strings.resetCart}
              </Text>
            </Pressable>
          </SectionCard>

          <SectionCard title={strings.map} theme={theme} textScale={textScale}>
            <Text style={[styles.helperText, { color: theme.textMuted, fontSize: scaleSize(14, textScale) }]}>
              {strings.staticMapOnly}
            </Text>
          </SectionCard>
        </View>
      </View>
    </ScrollView>
  );
}

function SectionCard({
  children,
  subtitle,
  textScale,
  theme,
  title
}: {
  children: ReactNode;
  subtitle?: string;
  textScale: number;
  theme: ThemePalette;
  title: string;
}) {
  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.border
        },
        shadowStyle(theme, 8)
      ]}
    >
      <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontSize: scaleSize(18, textScale) }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.helperText, { color: theme.textMuted, fontSize: scaleSize(13, textScale) }]}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

function ChoiceRow({ children }: { children: ReactNode }) {
  return <View style={styles.choiceRow}>{children}</View>;
}

function ChoiceButton({
  active,
  label,
  onPress,
  textScale,
  theme
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  textScale: number;
  theme: ThemePalette;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceButton,
        {
          backgroundColor: active ? theme.accentSoft : theme.cardMuted,
          borderColor: active ? theme.accent : theme.border,
          transform: [{ scale: pressed ? 0.98 : 1 }]
        }
      ]}
    >
      <Text
        style={[
          styles.choiceButtonText,
          {
            color: active ? theme.accent : theme.textPrimary,
            fontSize: scaleSize(14, textScale)
          }
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1
  },
  layout: {
    flexDirection: "row",
    gap: 16,
    minHeight: "100%"
  },
  layoutStacked: {
    flexDirection: "column"
  },
  primaryColumn: {
    flex: 1.15,
    gap: 16
  },
  secondaryColumn: {
    flex: 0.85,
    gap: 16
  },
  sectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 12
  },
  sectionTitle: {
    fontWeight: "900"
  },
  helperText: {
    fontWeight: "600",
    lineHeight: 20
  },
  choiceRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap"
  },
  choiceButton: {
    flexGrow: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  choiceButtonText: {
    fontWeight: "800"
  },
  resetButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  resetButtonText: {
    color: "#ffffff",
    fontWeight: "900"
  }
});
