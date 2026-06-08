import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent
} from "react-native";
import { Minus, Plus, RotateCcw } from "lucide-react-native";
import type { UiLanguage } from "../store/cartUiStore";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { scaleSize, shadowStyle } from "../ui/appUi";

interface Size {
  height: number;
  width: number;
}

interface PanOffset {
  x: number;
  y: number;
}

interface StaticMapViewerProps {
  language: UiLanguage;
  strings: AppStrings;
  textScale: number;
  theme: ThemePalette;
}

interface MarkerDefinition {
  color: "accent" | "success" | "warning";
  id: string;
  x: number;
  y: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;
const DRAG_THRESHOLD = 3;
const FALLBACK_VIEWPORT_HEIGHT = 520;
const MARKERS: MarkerDefinition[] = [
  { id: "entrance", x: 0.26, y: 0.86, color: "accent" },
  { id: "bakery", x: 0.3, y: 0.62, color: "warning" },
  { id: "dairy", x: 0.34, y: 0.34, color: "accent" },
  { id: "frozen", x: 0.56, y: 0.26, color: "success" },
  { id: "snacks", x: 0.57, y: 0.48, color: "warning" },
  { id: "drinks", x: 0.74, y: 0.32, color: "success" },
  { id: "checkout", x: 0.74, y: 0.74, color: "accent" }
];

export function StaticMapViewer({ language, strings, textScale, theme }: StaticMapViewerProps) {
  const resolvedMapSource = useMemo(
    () => Image.resolveAssetSource(require("../../assets/store-map-friendly.png")),
    []
  );
  const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<PanOffset>({ x: 0, y: 0 });
  const dragState = useRef<{
    moved: boolean;
    startPageX: number;
    startPageY: number;
    startPan: PanOffset;
  } | null>(null);

  const mapSize = resolvedMapSource.width && resolvedMapSource.height
    ? { width: resolvedMapSource.width, height: resolvedMapSource.height }
    : null;

  const viewportSize = {
    width: containerSize.width > 0 ? containerSize.width : 820,
    height: containerSize.height > 0 ? containerSize.height : FALLBACK_VIEWPORT_HEIGHT
  };

  const fitScale = !mapSize
    ? 1
    : Math.min(viewportSize.width / mapSize.width, viewportSize.height / mapSize.height);

  const renderedMap = !mapSize
    ? null
    : {
      width: mapSize.width * fitScale * zoom,
      height: mapSize.height * fitScale * zoom,
      left: ((viewportSize.width - (mapSize.width * fitScale * zoom)) / 2) + pan.x,
      top: ((viewportSize.height - (mapSize.height * fitScale * zoom)) / 2) + pan.y
    };

  function handleLayout(event: LayoutChangeEvent) {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    const nextHeight = Math.round(event.nativeEvent.layout.height);

    setContainerSize((current) => (
      current.width === nextWidth && current.height === nextHeight
        ? current
        : { width: nextWidth, height: nextHeight }
    ));
  }

  function handleZoom(delta: number) {
    setZoom((current) => clamp(current + delta, MIN_ZOOM, MAX_ZOOM));
  }

  function handleReset() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function handleResponderGrant(event: GestureResponderEvent) {
    dragState.current = {
      startPageX: event.nativeEvent.pageX,
      startPageY: event.nativeEvent.pageY,
      startPan: pan,
      moved: false
    };
  }

  function handleResponderMove(event: GestureResponderEvent) {
    const drag = dragState.current;
    if (!drag) return;

    const dx = event.nativeEvent.pageX - drag.startPageX;
    const dy = event.nativeEvent.pageY - drag.startPageY;
    const moved = Math.hypot(dx, dy) >= DRAG_THRESHOLD;
    drag.moved = drag.moved || moved;

    if (!drag.moved) return;

    setPan(constrainPan({
      x: drag.startPan.x + dx,
      y: drag.startPan.y + dy
    }, viewportSize, mapSize, fitScale, zoom));
  }

  function handleResponderEnd() {
    dragState.current = null;
  }

  function handleWheel(event: unknown) {
    const wheelEvent = event as { deltaY?: number; preventDefault?: () => void };
    wheelEvent.preventDefault?.();
    handleZoom((wheelEvent.deltaY ?? 0) > 0 ? -ZOOM_STEP : ZOOM_STEP);
  }

  return (
    <View style={[
      styles.panel,
      {
        backgroundColor: theme.surface,
        borderColor: theme.border
      },
      shadowStyle(theme, 10)
    ]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.textPrimary, fontSize: scaleSize(22, textScale) }]}>
            {strings.mapTitle}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted, fontSize: scaleSize(13, textScale) }]}>
            {strings.mapSubtitle}
          </Text>
        </View>
        <View style={styles.controls}>
          <ControlButton
            accessibilityLabel="Zoom out"
            disabled={zoom <= MIN_ZOOM}
            icon={<Minus size={18} color={theme.textPrimary} />}
            onPress={() => handleZoom(-ZOOM_STEP)}
            theme={theme}
          />
          <ControlButton
            accessibilityLabel="Zoom in"
            disabled={zoom >= MAX_ZOOM}
            icon={<Plus size={18} color={theme.textPrimary} />}
            onPress={() => handleZoom(ZOOM_STEP)}
            theme={theme}
          />
          <Pressable
            accessibilityRole="button"
            onPress={handleReset}
            style={({ pressed }) => [
              styles.resetButton,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                transform: [{ scale: pressed ? 0.98 : 1 }]
              }
            ]}
          >
            <RotateCcw size={16} color={theme.textPrimary} />
            <Text style={[styles.resetText, { color: theme.textPrimary, fontSize: scaleSize(12, textScale) }]}>
              {strings.resetView}
            </Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.helper, { color: theme.textMuted, fontSize: scaleSize(12, textScale) }]}>
        {strings.dragHint}
      </Text>

      <View
        style={[
          styles.viewport,
          {
            backgroundColor: theme.cardMuted,
            borderColor: theme.border
          }
        ]}
        onLayout={handleLayout}
        onMoveShouldSetResponder={() => Boolean(renderedMap)}
        onResponderGrant={handleResponderGrant}
        onResponderMove={handleResponderMove}
        onResponderRelease={handleResponderEnd}
        onResponderTerminate={handleResponderEnd}
        onStartShouldSetResponder={() => Boolean(renderedMap)}
        {...(Platform.OS === "web" ? { onWheel: handleWheel } : {})}
      >
        {!mapSize ? (
          <View style={[styles.stateCard, { backgroundColor: theme.errorSoft }]}>
            <Text style={[styles.errorTitle, { color: theme.error, fontSize: scaleSize(18, textScale) }]}>
              {language === "ar" ? "\u0627\u0644\u062e\u0631\u064a\u0637\u0629 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d\u0629" : "Map unavailable"}
            </Text>
            <Text style={[styles.errorText, { color: theme.textSecondary, fontSize: scaleSize(13, textScale) }]}>
              {language === "ar"
                ? "\u0644\u0645 \u064a\u062a\u0645 \u062a\u062d\u0645\u064a\u0644 \u0635\u0648\u0631\u0629 \u0627\u0644\u062e\u0631\u064a\u0637\u0629."
                : "The bundled store map image could not be loaded."}
            </Text>
          </View>
        ) : renderedMap ? (
          <View style={styles.mapCanvas}>
            <View
              pointerEvents="none"
              style={[
                styles.softGlow,
                styles.softGlowTop,
                { backgroundColor: theme.accentSoft }
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.softGlow,
                styles.softGlowBottom,
                { backgroundColor: theme.successSoft }
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.mapPlate,
                {
                  backgroundColor: theme.surface,
                  height: renderedMap.height,
                  left: renderedMap.left,
                  top: renderedMap.top,
                  width: renderedMap.width
                }
              ]}
            />
            <Image
              resizeMode="cover"
              source={require("../../assets/store-map-friendly.png")}
              style={[
                styles.mapImage,
                {
                  height: renderedMap.height,
                  left: renderedMap.left,
                  opacity: 0.94,
                  top: renderedMap.top,
                  width: renderedMap.width
                }
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.mapWash,
                {
                  height: renderedMap.height,
                  left: renderedMap.left,
                  top: renderedMap.top,
                  width: renderedMap.width
                }
              ]}
            />
            {MARKERS.map((marker) => {
              const colors = getMarkerColors(marker.color, theme);
              return (
                <View
                  key={marker.id}
                  style={[
                    styles.markerWrap,
                    {
                      left: renderedMap.left + (renderedMap.width * marker.x),
                      top: renderedMap.top + (renderedMap.height * marker.y)
                    }
                  ]}
                >
                  <View style={[styles.markerHalo, { backgroundColor: colors.soft }]} />
                  <View style={[styles.markerDot, { backgroundColor: colors.main }]} />
                  <View style={[styles.markerLabel, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.markerLabelText, { color: theme.textPrimary, fontSize: scaleSize(11, textScale) }]}>
                      {getMarkerLabel(marker.id, language)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      <Text style={[styles.legendTitle, { color: theme.textMuted, fontSize: scaleSize(11, textScale) }]}>
        {strings.mapLegend}
      </Text>

      <View style={styles.legendItems}>
        {MARKERS.map((marker) => {
          const colors = getMarkerColors(marker.color, theme);
          return (
            <View key={marker.id} style={[styles.legendChip, { backgroundColor: colors.soft }]}>
              <View style={[styles.legendDot, { backgroundColor: colors.main }]} />
              <Text style={[styles.legendText, { color: colors.main, fontSize: scaleSize(12, textScale) }]}>
                {getMarkerLabel(marker.id, language)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ControlButton({
  accessibilityLabel,
  disabled,
  icon,
  onPress,
  theme
}: {
  accessibilityLabel: string;
  disabled: boolean;
  icon: ReactNode;
  onPress: () => void;
  theme: ThemePalette;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.controlButton,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }]
        },
        disabled ? styles.controlButtonDisabled : null
      ]}
    >
      {icon}
    </Pressable>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function constrainPan(
  nextPan: PanOffset,
  viewportSize: Size,
  mapSize: Size | null,
  fitScale: number,
  zoom: number
) {
  if (!mapSize) return nextPan;
  const width = mapSize.width * fitScale * zoom;
  const height = mapSize.height * fitScale * zoom;
  const maxX = Math.max(0, ((width - viewportSize.width) / 2)) + 64;
  const maxY = Math.max(0, ((height - viewportSize.height) / 2)) + 64;
  return {
    x: clamp(nextPan.x, -maxX, maxX),
    y: clamp(nextPan.y, -maxY, maxY)
  };
}

function getMarkerLabel(markerId: string, language: UiLanguage) {
  const labels = {
    entrance: language === "ar" ? "\u0627\u0644\u0645\u062f\u062e\u0644" : "Entrance",
    bakery: language === "ar" ? "\u0627\u0644\u0645\u062e\u0628\u0648\u0632\u0627\u062a" : "Bakery",
    dairy: language === "ar" ? "\u0627\u0644\u0623\u0644\u0628\u0627\u0646" : "Dairy",
    frozen: language === "ar" ? "\u0627\u0644\u0645\u062c\u0645\u062f\u0627\u062a" : "Frozen",
    snacks: language === "ar" ? "\u0627\u0644\u0648\u062c\u0628\u0627\u062a" : "Snacks",
    drinks: language === "ar" ? "\u0627\u0644\u0645\u0634\u0631\u0648\u0628\u0627\u062a" : "Drinks",
    checkout: language === "ar" ? "\u0627\u0644\u062f\u0641\u0639" : "Checkout"
  };

  return labels[markerId as keyof typeof labels] ?? markerId;
}

function getMarkerColors(color: MarkerDefinition["color"], theme: ThemePalette) {
  if (color === "success") return { main: theme.success, soft: theme.successSoft };
  if (color === "warning") return { main: theme.warning, soft: theme.warningSoft };
  return { main: theme.accent, soft: theme.accentSoft };
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    borderRadius: 26,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    minHeight: 0
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap"
  },
  titleBlock: {
    gap: 4,
    flexShrink: 1
  },
  title: {
    fontWeight: "800"
  },
  subtitle: {
    fontWeight: "600"
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  controlButtonDisabled: {
    opacity: 0.45
  },
  resetButton: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  resetText: {
    fontWeight: "700"
  },
  helper: {
    fontWeight: "600"
  },
  viewport: {
    flex: 1,
    minHeight: FALLBACK_VIEWPORT_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative"
  },
  mapCanvas: {
    flex: 1,
    minHeight: FALLBACK_VIEWPORT_HEIGHT,
    position: "relative",
    overflow: "hidden"
  },
  softGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    opacity: 0.62
  },
  softGlowTop: {
    top: 24,
    left: 28
  },
  softGlowBottom: {
    right: 36,
    bottom: 28
  },
  mapPlate: {
    position: "absolute",
    borderRadius: 28
  },
  mapImage: {
    position: "absolute",
    borderRadius: 28
  },
  mapWash: {
    position: "absolute",
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  },
  markerWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
    marginTop: -8
  },
  markerHalo: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 999,
    opacity: 0.78
  },
  markerDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#ffffff"
  },
  markerLabel: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  markerLabelText: {
    fontWeight: "700"
  },
  stateCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8
  },
  stateTitle: {
    fontWeight: "800"
  },
  stateText: {
    fontWeight: "600",
    textAlign: "center"
  },
  errorTitle: {
    fontWeight: "800"
  },
  errorText: {
    fontWeight: "600",
    textAlign: "center"
  },
  legendTitle: {
    fontWeight: "900",
    textTransform: "uppercase"
  },
  legendItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  legendChip: {
    minHeight: 32,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 999
  },
  legendText: {
    fontWeight: "700"
  }
});
