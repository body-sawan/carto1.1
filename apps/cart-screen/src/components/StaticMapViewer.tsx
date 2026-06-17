import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent
} from "react-native";
import type { UiLanguage } from "../store/cartUiStore";
import type { AppStrings, ThemePalette } from "../ui/appUi";
import { scaleSize, shadowStyle } from "../ui/appUi";

interface Size {
  height: number;
  width: number;
}

interface Point {
  x: number;
  y: number;
}

interface StaticMapViewerProps {
  language: UiLanguage;
  strings: AppStrings;
  textScale: number;
  theme: ThemePalette;
}

const FALLBACK_VIEWPORT_HEIGHT = 520;
const FALLBACK_MAP_SIZE: Size = { width: 1000, height: 700 };
const MIN_SCALE = 0.7;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.2;

export function StaticMapViewer({ strings, textScale, theme }: StaticMapViewerProps) {
  const mapImageSource = useMemo(() => {
    try {
      return require("../../assets/store-map.png");
    } catch {
      return null;
    }
  }, []);
  const resolvedMapSource = useMemo(() => {
    if (!mapImageSource || typeof Image.resolveAssetSource !== "function") {
      return null;
    }

    try {
      return Image.resolveAssetSource(mapImageSource);
    } catch {
      return null;
    }
  }, [mapImageSource]);
  const [didImageLoadFail, setDidImageLoadFail] = useState(false);
  const [viewportSize, setViewportSize] = useState<Size>({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const scaleRef = useRef(1);
  const offsetXRef = useRef(0);
  const offsetYRef = useRef(0);
  const lastPointerPositionRef = useRef<Point | null>(null);

  useEffect(() => {
    setDidImageLoadFail(false);
  }, [mapImageSource]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    offsetXRef.current = offsetX;
  }, [offsetX]);

  useEffect(() => {
    offsetYRef.current = offsetY;
  }, [offsetY]);

  const shouldShowMapFallback = !mapImageSource || didImageLoadFail;
  const mapSize = {
    width: resolvedMapSource?.width ?? FALLBACK_MAP_SIZE.width,
    height: resolvedMapSource?.height ?? FALLBACK_MAP_SIZE.height
  };
  const viewportWidth = viewportSize.width > 0 ? viewportSize.width : 820;
  const viewportHeight = viewportSize.height > 0 ? viewportSize.height : FALLBACK_VIEWPORT_HEIGHT;
  const fitScale = Math.min(viewportWidth / mapSize.width, viewportHeight / mapSize.height);
  const baseImageWidth = mapSize.width * fitScale;
  const baseImageHeight = mapSize.height * fitScale;
  const imageLeft = (viewportWidth - baseImageWidth) / 2;
  const imageTop = (viewportHeight - baseImageHeight) / 2;

  useEffect(() => {
    const constrainedOffset = constrainOffsets(offsetX, offsetY, scale, {
      width: baseImageWidth,
      height: baseImageHeight
    }, {
      width: viewportWidth,
      height: viewportHeight
    });

    if (constrainedOffset.x !== offsetX) {
      offsetXRef.current = constrainedOffset.x;
      setOffsetX(constrainedOffset.x);
    }
    if (constrainedOffset.y !== offsetY) {
      offsetYRef.current = constrainedOffset.y;
      setOffsetY(constrainedOffset.y);
    }
  }, [baseImageHeight, baseImageWidth, offsetX, offsetY, scale, viewportHeight, viewportWidth]);

  function handleViewportLayout(event: LayoutChangeEvent) {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    const nextHeight = Math.round(event.nativeEvent.layout.height);

    setViewportSize((current) => (
      current.width === nextWidth && current.height === nextHeight
        ? current
        : { width: nextWidth, height: nextHeight }
    ));
  }

  function handleZoom(delta: number) {
    const nextScale = clamp(scaleRef.current + delta, MIN_SCALE, MAX_SCALE);
    const constrainedOffset = constrainOffsets(offsetXRef.current, offsetYRef.current, nextScale, {
      width: baseImageWidth,
      height: baseImageHeight
    }, {
      width: viewportWidth,
      height: viewportHeight
    });

    scaleRef.current = nextScale;
    offsetXRef.current = constrainedOffset.x;
    offsetYRef.current = constrainedOffset.y;
    setScale(nextScale);
    setOffsetX(constrainedOffset.x);
    setOffsetY(constrainedOffset.y);
  }

  function handleReset() {
    scaleRef.current = 1;
    offsetXRef.current = 0;
    offsetYRef.current = 0;
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
    setIsDragging(false);
    lastPointerPositionRef.current = null;
  }

  function handleResponderGrant(event: GestureResponderEvent) {
    if (shouldShowMapFallback) return;
    lastPointerPositionRef.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY
    };
    setIsDragging(true);
  }

  function handleResponderMove(event: GestureResponderEvent) {
    if (shouldShowMapFallback) return;
    const lastPointerPosition = lastPointerPositionRef.current;
    if (!lastPointerPosition) return;

    const nextPointerPosition = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY
    };
    const deltaX = nextPointerPosition.x - lastPointerPosition.x;
    const deltaY = nextPointerPosition.y - lastPointerPosition.y;
    const constrainedOffset = constrainOffsets(offsetXRef.current + deltaX, offsetYRef.current + deltaY, scaleRef.current, {
      width: baseImageWidth,
      height: baseImageHeight
    }, {
      width: viewportWidth,
      height: viewportHeight
    });

    lastPointerPositionRef.current = nextPointerPosition;
    offsetXRef.current = constrainedOffset.x;
    offsetYRef.current = constrainedOffset.y;
    setOffsetX(constrainedOffset.x);
    setOffsetY(constrainedOffset.y);
  }

  function handleResponderEnd() {
    setIsDragging(false);
    lastPointerPositionRef.current = null;
  }

  function handleWheel(event: unknown) {
    const wheelEvent = event as { deltaY?: number; preventDefault?: () => void };
    wheelEvent.preventDefault?.();
    handleZoom((wheelEvent.deltaY ?? 0) > 0 ? -ZOOM_STEP : ZOOM_STEP);
  }

  const cursorStyle = Platform.OS === "web"
    ? ({ cursor: isDragging ? "grabbing" : "grab" } as any)
    : null;

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
        </View>

        <View style={styles.controls}>
          <MapControlButton
            label="-"
            onPress={() => handleZoom(-ZOOM_STEP)}
            textScale={textScale}
            theme={theme}
          />
          <MapControlButton
            label="+"
            onPress={() => handleZoom(ZOOM_STEP)}
            textScale={textScale}
            theme={theme}
          />
          <MapControlButton
            label="Reset"
            onPress={handleReset}
            textScale={textScale}
            theme={theme}
            wide
          />
        </View>
      </View>

      <View
        style={[
          styles.viewport,
          {
            backgroundColor: theme.cardMuted,
            borderColor: theme.border
          }
        ]}
      >
        {shouldShowMapFallback ? (
          <View style={[styles.stateCard, { backgroundColor: theme.errorSoft }]}>
            <Text style={[styles.errorTitle, { color: theme.error, fontSize: scaleSize(18, textScale) }]}>
              Store map unavailable
            </Text>
          </View>
        ) : (
          <View
            onLayout={handleViewportLayout}
            onMoveShouldSetResponder={() => !shouldShowMapFallback}
            onResponderGrant={handleResponderGrant}
            onResponderMove={handleResponderMove}
            onResponderRelease={handleResponderEnd}
            onResponderTerminate={handleResponderEnd}
            onStartShouldSetResponder={() => !shouldShowMapFallback}
            style={[
              styles.imageFrame,
              { backgroundColor: theme.surface },
              cursorStyle
            ]}
            {...(Platform.OS === "web" ? { onWheel: handleWheel } : {})}
          >
            <Image
              onError={() => setDidImageLoadFail(true)}
              resizeMode="stretch"
              source={mapImageSource}
              style={[
                styles.mapImage,
                {
                  height: baseImageHeight,
                  left: imageLeft,
                  top: imageTop,
                  width: baseImageWidth,
                  transform: [
                    { translateX: offsetX },
                    { translateY: offsetY },
                    { scale }
                  ]
                }
              ]}
            />
          </View>
        )}
      </View>
    </View>
  );
}

function MapControlButton({
  label,
  onPress,
  textScale,
  theme,
  wide = false
}: {
  label: string;
  onPress: () => void;
  textScale: number;
  theme: ThemePalette;
  wide?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.controlButton,
        wide ? styles.controlButtonWide : null,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          transform: [{ scale: pressed ? 0.98 : 1 }]
        }
      ]}
    >
      <Text style={[styles.controlButtonText, { color: theme.textPrimary, fontSize: scaleSize(14, textScale) }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function constrainOffsets(offsetX: number, offsetY: number, scale: number, imageSize: Size, viewportSize: Size) {
  const scaledWidth = imageSize.width * scale;
  const scaledHeight = imageSize.height * scale;
  const maxOffsetX = Math.max(0, (scaledWidth - viewportSize.width) / 2);
  const maxOffsetY = Math.max(0, (scaledHeight - viewportSize.height) / 2);

  return {
    x: clamp(offsetX, -maxOffsetX, maxOffsetX),
    y: clamp(offsetY, -maxOffsetY, maxOffsetY)
  };
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
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  controlButton: {
    minWidth: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  controlButtonWide: {
    minWidth: 88
  },
  controlButtonText: {
    fontWeight: "800"
  },
  viewport: {
    flex: 1,
    minHeight: FALLBACK_VIEWPORT_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    padding: 12
  },
  imageFrame: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden"
  },
  mapImage: {
    position: "absolute"
  },
  stateCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24
  },
  errorTitle: {
    fontWeight: "800",
    textAlign: "center"
  }
});
