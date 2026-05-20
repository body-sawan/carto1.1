import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ImageErrorEventData,
  type NativeSyntheticEvent
} from "react-native";
import { Navigation } from "lucide-react-native";
import { CART_EDGE_HTTP_URL, IS_DEV, MAP_DEBUG_ENABLED } from "../realtime/config";
import type { CartSnapshot } from "../store/cartUiStore";

interface StoreMapAssetMetadata {
  imageUrl: string;
  resolution: number;
  origin: [number, number, number];
  width: number;
  height: number;
}

interface StoreZone {
  id: string;
  label: string;
  pixelX: number;
  pixelY: number;
  kind?: "zone" | "waypoint";
  showLabel?: boolean;
}

interface FallbackNode {
  id: string;
  label: string;
  xPercent: number;
  yPercent: number;
}

interface FocusPoint {
  pixelX: number;
  pixelY: number;
  mode: "live" | "fallback";
  label: string;
}

interface ViewportSize {
  width: number;
  height: number;
}

interface TransformMetrics {
  focus: FocusPoint;
  scale: number;
  mapWidth: number;
  mapHeight: number;
  rotationRad: number;
  translateX: number;
  translateY: number;
  containerCenterX: number;
  containerCenterY: number;
}

interface RealStoreMapPanelProps {
  snapshot: CartSnapshot | null;
  centerOnUser?: boolean;
  rotateMapWithHeading?: boolean;
  zoom?: number;
}

const DEFAULT_MAP_ZOOM = 2.1;
const MAP_METADATA_PATH = "/maps/store.json";
const MAP_IMAGE_FALLBACK_PATH = "/maps/store.png";
const MAP_ZONES_PATH = "/maps/store-zones.json";

const FALLBACK_NODES: FallbackNode[] = [
  { id: "entrance", label: "Entrance", xPercent: 50, yPercent: 88 },
  { id: "produce_01", label: "Produce", xPercent: 18, yPercent: 73 },
  { id: "bakery_01", label: "Bakery", xPercent: 16, yPercent: 20 },
  { id: "grocery_01", label: "Center Aisles", xPercent: 48, yPercent: 51 },
  { id: "dairy_01", label: "Dairy", xPercent: 77, yPercent: 17 },
  { id: "meat_01", label: "Meat & Frozen", xPercent: 77, yPercent: 50 },
  { id: "checkout", label: "Checkout", xPercent: 81, yPercent: 84 }
];

export function RealStoreMapPanel({
  snapshot,
  centerOnUser = true,
  rotateMapWithHeading = true,
  zoom = DEFAULT_MAP_ZOOM
}: RealStoreMapPanelProps) {
  const [metadata, setMetadata] = useState<StoreMapAssetMetadata | null>(null);
  const [zones, setZones] = useState<StoreZone[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });

  const metadataUrl = resolveMapAssetUrl(CART_EDGE_HTTP_URL, MAP_METADATA_PATH);
  const zonesUrl = resolveMapAssetUrl(CART_EDGE_HTTP_URL, MAP_ZONES_PATH);
  const imageUrl = resolveMapAssetUrl(CART_EDGE_HTTP_URL, metadata?.imageUrl ?? MAP_IMAGE_FALLBACK_PATH);

  useEffect(() => {
    let cancelled = false;

    async function loadMetadata() {
      setMetadataLoading(true);
      setMetadataError(null);
      setImageError(null);
      logDebug("[RealStoreMapPanel] metadata url", metadataUrl);

      try {
        const response = await fetch(metadataUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (!isStoreMapAssetMetadata(payload)) {
          throw new Error("Invalid store map metadata shape.");
        }

        if (!cancelled) {
          setMetadata(payload);
          setMetadataLoading(false);
          setMetadataError(null);
          setImageError(null);
          logDebug("[RealStoreMapPanel] metadata loaded", `${payload.width}x${payload.height}`);
        }
      } catch (error) {
        if (!cancelled) {
          setMetadata(null);
          setMetadataLoading(false);
          setMetadataError(error instanceof Error ? error.message : "Unable to load store map metadata.");
          setImageError(null);
        }
      }
    }

    void loadMetadata();

    return () => {
      cancelled = true;
    };
  }, [metadataUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadZones() {
      try {
        const response = await fetch(zonesUrl);
        if (!response.ok) {
          if (response.status === 404) {
            if (!cancelled) setZones([]);
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (!isStoreZoneArray(payload)) {
          throw new Error("Invalid store zone metadata shape.");
        }

        if (!cancelled) {
          setZones(payload);
          logDebug("[RealStoreMapPanel] zone labels loaded", payload.length);
        }
      } catch (error) {
        if (!cancelled) {
          setZones([]);
          logDebug("[RealStoreMapPanel] zone labels unavailable", error instanceof Error ? error.message : String(error));
        }
      }
    }

    void loadZones();

    return () => {
      cancelled = true;
    };
  }, [zonesUrl]);

  useEffect(() => {
    logDebug("[RealStoreMapPanel] image url", imageUrl);
  }, [imageUrl]);

  const handleViewportLayout = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    const height = Math.round(event.nativeEvent.layout.height);
    setViewportSize((current) => (
      current.width === width && current.height === height
        ? current
        : { width, height }
    ));
  };

  const routeSteps = snapshot?.route.path ?? snapshot?.route.nodes ?? [];
  const routeNodeIds = useMemo(() => new Set(routeSteps), [routeSteps]);
  const nextTargetLabel = fallbackNodeLabel(snapshot?.route.nextTarget, zones);
  const nextItem = snapshot?.shoppingList.find((item) => item.status === "PENDING" || item.status === "PARTIAL") ?? null;
  const sourceLabel = formatSourceLabel(snapshot?.position.source);
  const updatedLabel = formatTime(snapshot?.position.updatedAt);
  const yawDegrees = formatYawDegrees(snapshot?.position.yawRad);
  const hasMeterPose = isFiniteNumber(snapshot?.position.xMeters) && isFiniteNumber(snapshot?.position.yMeters);
  const positionX = snapshot?.position.xMeters ?? snapshot?.position.x;
  const positionY = snapshot?.position.yMeters ?? snapshot?.position.y;
  const transformMetrics = useMemo(
    () => getTransformMetrics({
      centerOnUser,
      metadata,
      rotateMapWithHeading,
      snapshot,
      viewportSize,
      zoom,
      zones
    }),
    [centerOnUser, metadata, rotateMapWithHeading, snapshot, viewportSize, zoom, zones]
  );
  const usingFallbackMarker = transformMetrics?.focus.mode === "fallback";
  const canShowRealMap = Boolean(metadata);
  const routeSummary = routeSteps.length > 0
    ? routeSteps.map((nodeId) => fallbackNodeLabel(nodeId, zones)).join(" -> ")
    : "Waiting for shopping list";
  const statusText = metadataError
    ? "Map unavailable"
    : imageError
      ? "Image unavailable"
      : transformMetrics?.focus.mode === "live"
        ? (snapshot?.position.source === "lidar" ? "Live position" : "Centered preview")
        : snapshot?.position.source === "lidar"
          ? "Waiting for projected pose"
          : "Centered preview";
  const overlayZones = zones.filter((zone) => zone.kind !== "waypoint" && zone.showLabel !== false);
  const debugLines = transformMetrics ? [
    `container ${viewportSize.width} x ${viewportSize.height}`,
    `map ${metadata?.width ?? 0} x ${metadata?.height ?? 0}`,
    `pixel ${roundNumber(transformMetrics.focus.pixelX, 1)}, ${roundNumber(transformMetrics.focus.pixelY, 1)}`,
    `scale ${roundNumber(transformMetrics.scale, 3)}`,
    `yaw ${yawDegrees}`,
    `image ${imageUrl}`,
    `metadata ${metadataUrl}`
  ] : [];

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Store Map</Text>
          <Text style={styles.subtitle}>{canShowRealMap ? "You are here" : "Route overview"}</Text>
        </View>
        <View style={styles.headerBadges}>
          <View style={[styles.badge, snapshot?.position.source === "lidar" ? styles.badgeSuccess : styles.badgeNeutral]}>
            <Text style={[styles.badgeText, snapshot?.position.source === "lidar" ? styles.badgeSuccessText : styles.badgeNeutralText]}>
              {sourceLabel}
            </Text>
          </View>
          {updatedLabel ? (
            <View style={[styles.badge, styles.badgeSlate]}>
              <Text style={[styles.badgeText, styles.badgeSlateText]}>Updated {updatedLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Next item</Text>
          <Text style={styles.summaryValue} numberOfLines={1}>
            {nextItem?.name ?? "Keep shopping"}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Heading to</Text>
          <Text style={styles.summaryValue} numberOfLines={1}>
            {nextTargetLabel}
          </Text>
        </View>
      </View>

      <View style={styles.mapCard}>
        {metadataError ? (
          <View style={styles.fallbackMap}>
            <View style={styles.errorCard}>
              <Text style={styles.errorCardTitle}>Unable to load store map metadata.</Text>
              <Text style={styles.errorCardBody}>{metadataError}</Text>
              <Text style={styles.errorCardUrl}>Tried: {metadataUrl}</Text>
            </View>
            <View style={styles.fallbackBadgeRow}>
              <View style={[styles.badge, styles.badgeSlate]}>
                <Text style={[styles.badgeText, styles.badgeSlateText]}>Map offline</Text>
              </View>
            </View>
            {FALLBACK_NODES.map((node) => {
              const isActive = node.id === snapshot?.position.nodeId;
              const isOnRoute = routeNodeIds.has(node.id);
              return (
                <View
                  key={node.id}
                  style={[
                    styles.node,
                    { left: `${node.xPercent}%`, top: `${node.yPercent}%` },
                    isOnRoute && styles.nodeRouted,
                    isActive && styles.nodeActive
                  ]}
                >
                  <Text style={[styles.nodeText, isActive && styles.nodeActiveText]}>{node.label}</Text>
                </View>
              );
            })}
            <Text style={styles.fallbackHint}>
              Check /maps/store.json and /maps/store.png. Run npm run map:simulate or npm run map:convert after placing store.yaml and store.pgm.
            </Text>
          </View>
        ) : canShowRealMap && metadata ? (
          <View style={styles.mapViewport} onLayout={handleViewportLayout}>
            <View style={styles.viewportGlowTop} pointerEvents="none" />
            <View style={styles.viewportGlowBottom} pointerEvents="none" />
            {!imageError ? (
              <>
                {transformMetrics ? (
                  <View style={styles.mapTransformLayer} pointerEvents="none">
                    <View
                      style={[
                        styles.mapAnchor,
                        {
                          left: transformMetrics.containerCenterX,
                          top: transformMetrics.containerCenterY,
                          transform: [{ rotate: `${transformMetrics.rotationRad}rad` }]
                        }
                      ]}
                    >
                      <View
                        style={[
                          styles.mapLayer,
                          {
                            left: transformMetrics.translateX,
                            top: transformMetrics.translateY,
                            width: transformMetrics.mapWidth,
                            height: transformMetrics.mapHeight
                          }
                        ]}
                      >
                        <Image
                          key={imageUrl}
                          source={{ uri: imageUrl }}
                          style={styles.mapImage}
                          resizeMode="stretch"
                          onLoad={() => setImageError(null)}
                          onError={(event) => {
                            const message = readImageErrorMessage(event);
                            setImageError(message);
                            logDebug("[RealStoreMapPanel] image load error", `${imageUrl} (${message})`);
                          }}
                        />
                        {overlayZones.map((zone) => (
                          <View
                            key={zone.id}
                            style={[
                              styles.zoneTag,
                              {
                                left: zone.pixelX * transformMetrics.scale,
                                top: zone.pixelY * transformMetrics.scale
                              }
                            ]}
                          >
                            <Text style={styles.zoneTagText}>{zone.label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                ) : null}

                <View style={styles.markerHud} pointerEvents="none">
                  <View style={styles.markerLabelWrap}>
                    <Text style={styles.markerLabel}>{usingFallbackMarker ? "Centered preview" : "You are here"}</Text>
                  </View>
                  <View style={styles.markerRing}>
                    <View style={styles.markerCore}>
                      <Navigation size={20} color="#ffffff" strokeWidth={2.7} />
                    </View>
                  </View>
                  <View style={styles.markerCrosshairHorizontal} />
                  <View style={styles.markerCrosshairVertical} />
                </View>

                <View style={styles.overlayCard}>
                  <View style={styles.overlayTopLine}>
                    <Text style={styles.overlayTitle}>Navigation view</Text>
                    <Text style={styles.overlayStatus}>{statusText}</Text>
                  </View>
                  <Text style={styles.overlayValue}>{nextTargetLabel}</Text>
                  <View style={styles.detailPillRow}>
                    <View style={styles.detailPill}>
                      <Text style={styles.detailPillText}>source {sourceLabel}</Text>
                    </View>
                    {updatedLabel ? (
                      <View style={styles.detailPill}>
                        <Text style={styles.detailPillText}>updated {updatedLabel}</Text>
                      </View>
                    ) : null}
                    {positionX !== undefined ? (
                      <View style={styles.detailPill}>
                        <Text style={styles.detailPillText}>x {roundNumber(positionX, 2)}{hasMeterPose ? " m" : ""}</Text>
                      </View>
                    ) : null}
                    {positionY !== undefined ? (
                      <View style={styles.detailPill}>
                        <Text style={styles.detailPillText}>y {roundNumber(positionY, 2)}{hasMeterPose ? " m" : ""}</Text>
                      </View>
                    ) : null}
                    <View style={styles.detailPill}>
                      <Text style={styles.detailPillText}>yaw {yawDegrees}</Text>
                    </View>
                  </View>
                  <View style={styles.routeChipRow}>
                    {routeSteps.slice(0, 5).map((nodeId) => (
                      <View key={nodeId} style={styles.routeChip}>
                        <Text style={styles.routeChipText}>{fallbackNodeLabel(nodeId, zones)}</Text>
                      </View>
                    ))}
                  </View>
                  {usingFallbackMarker ? (
                    <Text style={styles.overlayHint}>
                      {snapshot?.position.source === "lidar"
                        ? "The cart marker is centered already. The view will switch to the true projected pose as soon as cart-edge receives fresh pixel coordinates."
                        : "The marker stays centered while the map previews the next aisle until live LiDAR pose updates arrive."}
                    </Text>
                  ) : !transformMetrics ? (
                    <Text style={styles.overlayHint}>Sizing the map viewport...</Text>
                  ) : null}
                </View>

                {MAP_DEBUG_ENABLED && debugLines.length > 0 ? (
                  <View style={styles.debugCard}>
                    {debugLines.map((line) => (
                      <Text key={line} style={styles.debugText}>{line}</Text>
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.imageErrorState}>
                <Text style={styles.errorCardTitle}>Unable to load store map image.</Text>
                <Text style={styles.errorCardBody}>{imageError}</Text>
                <Text style={styles.errorCardUrl}>Tried: {imageUrl}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color="#155eef" />
            <Text style={styles.loadingTitle}>Loading store map...</Text>
            <Text style={styles.loadingText}>{metadataLoading ? metadataUrl : "Waiting for map metadata."}</Text>
          </View>
        )}
      </View>

      <Text style={styles.routeSummary}>{routeSummary}</Text>
    </View>
  );
}

function resolveFallbackNode(snapshot: CartSnapshot | null, zones: StoreZone[] = []) {
  const candidateIds = [
    snapshot?.position.nodeId,
    snapshot?.route.nextTarget,
    snapshot?.route.path?.[0],
    snapshot?.route.nodes?.[0],
    "entrance"
  ];

  for (const candidateId of candidateIds) {
    if (!candidateId) continue;
    const zone = zones.find((entry) => entry.id === candidateId);
    if (zone) {
      return {
        id: zone.id,
        label: zone.label,
        pixelX: zone.pixelX,
        pixelY: zone.pixelY
      };
    }

    const node = FALLBACK_NODES.find((entry) => entry.id === candidateId);
    if (node) return node;
  }

  return null;
}

function resolveMapAssetUrl(baseUrl: string, assetPath: string) {
  try {
    return new URL(assetPath, `${baseUrl}/`).toString();
  } catch {
    return `${baseUrl}${MAP_IMAGE_FALLBACK_PATH}`;
  }
}

function fallbackNodeLabel(nodeId: string | null | undefined, zones: StoreZone[] = []) {
  if (!nodeId) return "Next aisle";
  return zones.find((zone) => zone.id === nodeId)?.label
    ?? FALLBACK_NODES.find((node) => node.id === nodeId)?.label
    ?? nodeId.replace(/_/gu, " ").replace(/\b\w/gu, (character) => character.toUpperCase());
}

function formatTime(value: string | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStoreMapAssetMetadata(value: unknown): value is StoreMapAssetMetadata {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<StoreMapAssetMetadata>;
  return typeof candidate.imageUrl === "string"
    && isFiniteNumber(candidate.resolution)
    && Array.isArray(candidate.origin)
    && candidate.origin.length === 3
    && candidate.origin.every((entry) => isFiniteNumber(entry))
    && isFiniteNumber(candidate.width)
    && isFiniteNumber(candidate.height);
}

function isStoreZoneArray(value: unknown): value is StoreZone[] {
  return Array.isArray(value) && value.every(isStoreZone);
}

function isStoreZone(value: unknown): value is StoreZone {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<StoreZone>;
  return typeof candidate.id === "string"
    && typeof candidate.label === "string"
    && isFiniteNumber(candidate.pixelX)
    && isFiniteNumber(candidate.pixelY)
    && (candidate.kind === undefined || candidate.kind === "zone" || candidate.kind === "waypoint")
    && (candidate.showLabel === undefined || typeof candidate.showLabel === "boolean");
}

function getTransformMetrics({
  centerOnUser,
  metadata,
  rotateMapWithHeading,
  snapshot,
  viewportSize,
  zoom,
  zones
}: {
  centerOnUser: boolean;
  metadata: StoreMapAssetMetadata | null;
  rotateMapWithHeading: boolean;
  snapshot: CartSnapshot | null;
  viewportSize: ViewportSize;
  zoom: number;
  zones: StoreZone[];
}): TransformMetrics | null {
  if (!metadata || viewportSize.width <= 0 || viewportSize.height <= 0) return null;

  const focus = resolveFocusPoint(snapshot, metadata, zones);
  const rotationRad = rotateMapWithHeading ? ((snapshot?.position.yawRad ?? 0) - (Math.PI / 2)) : 0;
  const scale = computeMapScale({
    containerHeight: viewportSize.height,
    containerWidth: viewportSize.width,
    mapHeight: metadata.height,
    mapWidth: metadata.width,
    rotationRad,
    zoom
  });
  const focusPixelX = centerOnUser ? focus.pixelX : metadata.width / 2;
  const focusPixelY = centerOnUser ? focus.pixelY : metadata.height / 2;

  return {
    focus,
    scale,
    mapWidth: metadata.width * scale,
    mapHeight: metadata.height * scale,
    rotationRad,
    translateX: -focusPixelX * scale,
    translateY: -focusPixelY * scale,
    containerCenterX: viewportSize.width / 2,
    containerCenterY: viewportSize.height / 2
  };
}

function resolveFocusPoint(
  snapshot: CartSnapshot | null,
  metadata: StoreMapAssetMetadata,
  zones: StoreZone[]
): FocusPoint {
  if (
    snapshot
    && isFiniteNumber(snapshot.position.pixelX)
    && isFiniteNumber(snapshot.position.pixelY)
  ) {
    return {
      pixelX: clamp(snapshot.position.pixelX, 0, metadata.width),
      pixelY: clamp(snapshot.position.pixelY, 0, metadata.height),
      mode: "live",
      label: "You are here"
    };
  }

  const fallbackNode = resolveFallbackNode(snapshot, zones);
  if (fallbackNode && "pixelX" in fallbackNode && "pixelY" in fallbackNode) {
    return {
      pixelX: clamp(fallbackNode.pixelX, 0, metadata.width),
      pixelY: clamp(fallbackNode.pixelY, 0, metadata.height),
      mode: "fallback",
      label: fallbackNode.label
    };
  }

  if (fallbackNode) {
    return {
      pixelX: (fallbackNode.xPercent / 100) * metadata.width,
      pixelY: (fallbackNode.yPercent / 100) * metadata.height,
      mode: "fallback",
      label: fallbackNode.label
    };
  }

  return {
    pixelX: metadata.width / 2,
    pixelY: metadata.height / 2,
    mode: "fallback",
    label: "Store center"
  };
}

function computeMapScale({
  containerHeight,
  containerWidth,
  mapHeight,
  mapWidth,
  rotationRad,
  zoom
}: {
  containerHeight: number;
  containerWidth: number;
  mapHeight: number;
  mapWidth: number;
  rotationRad: number;
  zoom: number;
}) {
  const normalizedZoom = Math.max(1, zoom);
  const coverScale = Math.max(containerWidth / mapWidth, containerHeight / mapHeight);
  const cos = Math.abs(Math.cos(rotationRad));
  const sin = Math.abs(Math.sin(rotationRad));
  const rotatedWidth = (mapWidth * cos) + (mapHeight * sin);
  const rotatedHeight = (mapWidth * sin) + (mapHeight * cos);
  const rotationCoverScale = Math.max(containerWidth / rotatedWidth, containerHeight / rotatedHeight);

  return Math.max(coverScale, rotationCoverScale) * normalizedZoom;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readImageErrorMessage(event: NativeSyntheticEvent<ImageErrorEventData>) {
  return event.nativeEvent.error || "Unable to load store map image.";
}

function formatSourceLabel(source: CartSnapshot["position"]["source"]) {
  if (source === "lidar") return "LiDAR";
  if (source === "simulator") return "Simulator";
  return "Awaiting pose";
}

function formatYawDegrees(value: number | undefined) {
  if (!isFiniteNumber(value)) return "0 deg";

  const degrees = ((value * 180) / Math.PI) % 360;
  const normalized = degrees < 0 ? degrees + 360 : degrees;
  return `${Math.round(normalized)} deg`;
}

function roundNumber(value: number, digits: number) {
  if (!Number.isFinite(value)) return "0";
  return value.toFixed(digits);
}

function logDebug(...args: unknown[]) {
  if (!IS_DEV) return;
  console.log(...args);
}

const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: "#ffffff", borderRadius: 18, padding: 16, gap: 14, minHeight: 0 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  titleBlock: { gap: 4, flexShrink: 1 },
  title: { fontSize: 21, fontWeight: "900", color: "#142033" },
  subtitle: { fontSize: 12, fontWeight: "800", color: "#64748b" },
  headerBadges: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: 11, fontWeight: "900" },
  badgeSuccess: { backgroundColor: "#dcfce7" },
  badgeSuccessText: { color: "#166534" },
  badgeNeutral: { backgroundColor: "#e0e7ff" },
  badgeNeutralText: { color: "#3730a3" },
  badgeSlate: { backgroundColor: "#e2e8f0" },
  badgeSlateText: { color: "#334155", textTransform: "none" },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4
  },
  summaryLabel: { color: "#64748b", fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  summaryValue: { color: "#0f172a", fontSize: 16, fontWeight: "900" },
  mapCard: {
    flex: 1,
    minHeight: 360,
    overflow: "hidden",
    borderRadius: 18,
    backgroundColor: "#eef5f1",
    borderWidth: 1,
    borderColor: "#d7e5dc"
  },
  mapViewport: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#edf7ef"
  },
  viewportGlowTop: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 999,
    top: -110,
    left: -70,
    backgroundColor: "rgba(182, 232, 196, 0.5)"
  },
  viewportGlowBottom: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 999,
    right: -140,
    bottom: -140,
    backgroundColor: "rgba(255, 216, 164, 0.42)"
  },
  mapTransformLayer: {
    ...StyleSheet.absoluteFillObject
  },
  mapAnchor: {
    position: "absolute",
    width: 0,
    height: 0
  },
  mapLayer: {
    position: "absolute",
    overflow: "visible"
  },
  mapImage: { width: "100%", height: "100%", borderRadius: 22 },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 10 },
  loadingTitle: { color: "#142033", fontSize: 17, fontWeight: "900" },
  loadingText: { color: "#64748b", fontSize: 12, fontWeight: "700", textAlign: "center" },
  imageErrorState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 20
  },
  markerHud: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "center"
  },
  markerLabelWrap: {
    position: "absolute",
    top: -86,
    transform: [{ translateX: -58 }]
  },
  markerLabel: {
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    color: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "900",
    minWidth: 116,
    textAlign: "center"
  },
  markerRing: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 999,
    marginLeft: -36,
    marginTop: -36,
    backgroundColor: "rgba(239, 68, 68, 0.18)",
    borderWidth: 2,
    borderColor: "rgba(239, 68, 68, 0.32)",
    alignItems: "center",
    justifyContent: "center"
  },
  markerCore: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#0f6dff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3.5,
    borderColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6
  },
  markerCrosshairHorizontal: {
    position: "absolute",
    width: 108,
    height: 2,
    marginLeft: -54,
    marginTop: -1,
    backgroundColor: "rgba(15, 23, 42, 0.18)"
  },
  markerCrosshairVertical: {
    position: "absolute",
    width: 2,
    height: 108,
    marginLeft: -1,
    marginTop: -54,
    backgroundColor: "rgba(15, 23, 42, 0.18)"
  },
  overlayCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderWidth: 1,
    borderColor: "#d9e7dd",
    padding: 14,
    gap: 10,
    shadowColor: "#132033",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
  },
  overlayTopLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  overlayTitle: { color: "#64748b", fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  overlayStatus: { color: "#0f766e", fontSize: 11, fontWeight: "900" },
  overlayValue: { color: "#0f172a", fontSize: 17, fontWeight: "900" },
  overlayHint: { color: "#475569", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  detailPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  detailPill: {
    borderRadius: 999,
    backgroundColor: "#eef6f1",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  detailPillText: { color: "#274457", fontSize: 11, fontWeight: "900" },
  routeChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  routeChip: { borderRadius: 999, backgroundColor: "#dbeafe", paddingHorizontal: 10, paddingVertical: 6 },
  routeChipText: { color: "#1d4ed8", fontSize: 11, fontWeight: "900" },
  zoneTag: {
    position: "absolute",
    minWidth: 84,
    minHeight: 28,
    marginLeft: -42,
    marginTop: -14,
    borderRadius: 999,
    backgroundColor: "rgba(255, 251, 235, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    shadowColor: "#162033",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }
  },
  zoneTagText: { color: "#785000", fontSize: 10, fontWeight: "900" },
  debugCard: {
    position: "absolute",
    top: 14,
    right: 14,
    maxWidth: 280,
    borderRadius: 12,
    backgroundColor: "rgba(15, 23, 42, 0.86)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4
  },
  debugText: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace"
  },
  fallbackMap: { flex: 1, position: "relative", padding: 18 },
  fallbackBadgeRow: { position: "absolute", top: 14, right: 14, zIndex: 2 },
  errorCard: {
    position: "absolute",
    left: 18,
    right: 18,
    top: 18,
    zIndex: 2,
    borderRadius: 14,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fdba74",
    padding: 14,
    gap: 6
  },
  errorCardTitle: { color: "#9a3412", fontSize: 15, fontWeight: "900" },
  errorCardBody: { color: "#7c2d12", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  errorCardUrl: { color: "#9a3412", fontSize: 11, fontWeight: "800" },
  node: {
    position: "absolute",
    minWidth: 76,
    minHeight: 34,
    marginLeft: -38,
    marginTop: -17,
    borderRadius: 999,
    backgroundColor: "#dfe7f1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  nodeRouted: { backgroundColor: "#c9eee2" },
  nodeActive: { backgroundColor: "#12715b" },
  nodeText: { fontSize: 11, fontWeight: "900", color: "#33445f" },
  nodeActiveText: { color: "#ffffff" },
  fallbackHint: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18
  },
  routeSummary: { color: "#65758b", fontSize: 12, fontWeight: "700" }
});
