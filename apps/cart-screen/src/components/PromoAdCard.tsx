import { StyleSheet, Text, View } from "react-native";
import type { DummyAd } from "../data/dummyAds";
import type { ThemePalette } from "../ui/appUi";
import { scaleSize } from "../ui/appUi";

interface PromoAdCardProps {
  ad: DummyAd;
  mode: "header" | "cart";
  textScale: number;
  theme: ThemePalette;
}

export function PromoAdCard({ ad, mode, textScale, theme }: PromoAdCardProps) {
  const palette = getAccentPalette(ad.accent, theme);
  const backgroundColor = getBackgroundColor(ad.background, theme);
  const imageSize = mode === "header" ? 58 : 54;
  const titleLines = mode === "header" ? 1 : 2;
  const descriptionLines = mode === "header" ? 2 : 2;

  return (
    <View style={[styles.root, { backgroundColor, borderColor: theme.border }]}>
      <View style={[styles.accentBar, { backgroundColor: palette.main }]} />

      <View style={styles.content}>
        <View style={styles.copyWrap}>
          {ad.tag ? (
            <View style={[styles.tagPill, { backgroundColor: palette.soft }]}>
              <Text style={[styles.tagText, { color: palette.main, fontSize: scaleSize(10, textScale) }]}>
                {ad.tag}
              </Text>
            </View>
          ) : null}

          <Text
            numberOfLines={titleLines}
            style={[styles.title, { color: theme.textPrimary, fontSize: scaleSize(mode === "header" ? 16 : 14, textScale) }]}
          >
            {ad.title}
          </Text>
          <Text
            numberOfLines={descriptionLines}
            style={[styles.description, { color: theme.textSecondary, fontSize: scaleSize(12, textScale) }]}
          >
            {ad.description}
          </Text>
        </View>

        {ad.type === "image" ? (
          <View
            style={[
              styles.imageBox,
              {
                width: imageSize,
                height: imageSize,
                backgroundColor: ad.image.palette[1],
                borderColor: theme.border
              }
            ]}
          >
            <View style={[styles.imageAccent, { backgroundColor: ad.image.palette[0] }]} />
            <Text style={[styles.imageLabel, { color: "#ffffff", fontSize: scaleSize(11, textScale) }]}>
              {ad.image.label}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function getAccentPalette(accent: DummyAd["accent"], theme: ThemePalette) {
  if (accent === "success") return { main: theme.success, soft: theme.successSoft };
  if (accent === "warning") return { main: theme.warning, soft: theme.warningSoft };
  return { main: theme.accent, soft: theme.accentSoft };
}

function getBackgroundColor(background: DummyAd["background"], theme: ThemePalette) {
  if (background === "surface") return theme.surface;
  if (background === "accentSoft") return theme.accentSoft;
  return theme.cardMuted;
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    minHeight: 78,
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 1
  },
  accentBar: {
    width: 6,
    alignSelf: "stretch",
    borderRadius: 999
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0
  },
  copyWrap: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  tagPill: {
    alignSelf: "flex-start",
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 8,
    justifyContent: "center"
  },
  tagText: {
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    fontWeight: "900"
  },
  description: {
    fontWeight: "700",
    lineHeight: 18
  },
  imageBox: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  imageAccent: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.88
  },
  imageLabel: {
    fontWeight: "900",
    letterSpacing: 0.3
  }
});
