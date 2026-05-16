import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
  type ImageErrorEventData,
  type NativeSyntheticEvent
} from "react-native";
import { Navigation } from "lucide-react-native";
import { CART_EDGE_HTTP_URL, IS_DEV } from "../realtime/config";
import type { CartSnapshot } from "../store/cartUiStore";

interface StoreMapAssetMetadata {
  imageUrl: string;
  resolution: number;
  origin: [number, number, number];
  width: number;
  height: number;
}

interface MarkerPosition {
  leftPercent: number;
  topPercent: number;
  mode: "live" | "fallback";
}

const FALLBACK_NODES = [
  { id: "entrance", label: "Entrance", xPercent: 12, yPercent: 82 },
  { id: "produce_01", label: "Produce", xPercent: 26, yPercent: 48 },
  { id: "bakery_01", label: "Bakery", xPercent: 42, yPercent: 28 },
  { id: "grocery_01", label: "Grocery", xPercent: 68, yPercent: 28 },
  { id: "dairy_01", label: "Dairy", xPercent: 53, yPercent: 66 },
  { id: "meat_01", label: "Meat", xPercent: 72, yPercent: 66 },
  { id: "checkout", label: "Checkout", xPercent: 82, yPercent: 86 }
];

export function RealStoreMapPanel({ snapshot }: { snapshot: CartSnapshot | null }) {
  const [metadata, setMetadata] = useState<StoreMapAssetMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const metadataUrl = `${CART_EDGE_HTTP_URL}/maps/store.json`;
  const imageUrl = resolveMapAssetUrl(CART_EDGE_HTTP_URL, metadata?.imageUrl ?? "/maps/store.png");

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
    logDebug("[RealStoreMapPanel] image url", imageUrl);
  }, [imageUrl]);

  const routeSteps = snapshot?.route.path ?? snapshot?.route.nodes ?? [];
  const routeNodeIds = new Set(routeSteps);
  const nextTargetLabel = fallbackNodeLabel(snapshot?.route.nextTarget);
  const nextItem = snapshot?.shoppingList.find((item) => item.status === "PENDING" || item.status === "PARTIAL") ?? null;
  const sourceLabel = snapshot?.position.source === "lidar" ? "LiDAR" : "Simulator";
  const updatedLabel = formatTime(snapshot?.position.updatedAt);
  const mapAspectRatio = metadata ? metadata.width / metadata.height : 1;
  const markerPosition = useMemo(
    () => getMarkerPosition(snapshot, metadata),
    [metadata, snapshot]
  );
  const usingFallbackMarker = markerPosition?.mode === "fallback";
  const canShowRealMap = Boolean(metadata);
  const routeSummary = routeSteps.length > 0 ? routeSteps.map(fallbackNodeLabel).join(" -> ") : "Waiting for shopping list";
  const statusText = metadataError
    ? "Map unavailable"
    : imageError
      ? "Image unavailable"
      : snapshot?.position.source === "lidar"
        ? (usingFallbackMarker ? "Using aisle fallback" : "Live position")
      : "Route preview";

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
              Check /maps/store.json and /maps/store.png. Run npm run map:convert after placing store.yaml and store.pgm.
            </Text>
          </View>
        ) : canShowRealMap && metadata ? (
          <View style={styles.mapViewport}>
            <View style={[styles.mapSurface, { aspectRatio: mapAspectRatio }]}>
              {!imageError ? (
                <Image
                  key={imageUrl}
                  source={{ uri: imageUrl }}
                  style={styles.mapImage}
                  resizeMode="stretch"
                  onError={(event) => {
                    const message = readImageErrorMessage(event);
                    setImageError(message);
                    logDebug("[RealStoreMapPanel] image failed", `${imageUrl} (${message})`);
                  }}
                />
              ) : (
                <View style={styles.imageErrorState}>
                  <Text style={styles.errorCardTitle}>Unable to load store map image.</Text>
                  <Text style={styles.errorCardBody}>{imageError}</Text>
                  <Text style={styles.errorCardUrl}>Tried: {imageUrl}</Text>
                </View>
              )}

              {markerPosition && !imageError ? (
                <View
                  style={[
                    styles.markerWrap,
                    {
                      left: `${markerPosition.leftPercent}%`,
                      top: `${markerPosition.topPercent}%`
                    }
                  ]}
                >
                  <Text style={styles.markerLabel}>{usingFallbackMarker ? "Cart preview" : "You are here"}</Text>
                  <View style={styles.markerPin}>
                    <View style={[styles.headingIconWrap, { transform: [{ rotate: `${((snapshot?.position.yawRad ?? 0) * 180) / Math.PI}deg` }] }]}>
                      <Navigation size={18} color="#ffffff" strokeWidth={2.5} />
                    </View>
                  </View>
                </View>
              ) : null}

              <View style={styles.overlayCard}>
                <View style={styles.overlayTopLine}>
                  <Text style={styles.overlayTitle}>Status</Text>
                  <Text style={styles.overlayStatus}>{statusText}</Text>
                </View>
                <Text style={styles.overlayValue}>{nextTargetLabel}</Text>
                <View style={styles.routeChipRow}>
                  {routeSteps.slice(0, 4).map((nodeId) => (
                    <View key={nodeId} style={styles.routeChip}>
                      <Text style={styles.routeChipText}>{fallbackNodeLabel(nodeId)}</Text>
                    </View>
                  ))}
                </View>
                {usingFallbackMarker ? (
                  <Text style={styles.overlayHint}>
                    {snapshot?.position.source === "lidar"
                      ? "Showing the planned aisle position until cart-edge receives pixel coordinates from /dev/pose."
                      : "The route preview will switch to a live marker as soon as LiDAR pose data arrives."}
                  </Text>
                ) : !markerPosition ? (
                  <Text style={styles.overlayHint}>Waiting for cart position.</Text>
                ) : null}
              </View>
            </View>
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

function getMarkerPosition(
  snapshot: CartSnapshot | null,
  metadata: StoreMapAssetMetadata | null
): MarkerPosition | null {
  if (!snapshot || !metadata) return null;

  if (isFiniteNumber(snapshot.position.pixelX) && isFiniteNumber(snapshot.position.pixelY)) {
    return {
      leftPercent: (snapshot.position.pixelX / metadata.width) * 100,
      topPercent: (snapshot.position.pixelY / metadata.height) * 100,
      mode: "live"
    };
  }

  const fallbackNode = resolveFallbackNode(snapshot);
  if (!fallbackNode) return null;

  return {
    leftPercent: fallbackNode.xPercent,
    topPercent: fallbackNode.yPercent,
    mode: "fallback"
  };
}

function resolveFallbackNode(snapshot: CartSnapshot | null) {
  const candidateIds = [
    snapshot?.position.nodeId,
    snapshot?.route.nextTarget,
    snapshot?.route.path?.[0],
    snapshot?.route.nodes?.[0],
    "entrance"
  ];

  for (const candidateId of candidateIds) {
    if (!candidateId) continue;
    const node = FALLBACK_NODES.find((entry) => entry.id === candidateId);
    if (node) return node;
  }

  return null;
}

function resolveMapAssetUrl(baseUrl: string, assetPath: string) {
  try {
    return new URL(assetPath, `${baseUrl}/`).toString();
  } catch {
    return `${baseUrl}/maps/store.png`;
  }
}

function fallbackNodeLabel(nodeId: string | null | undefined) {
  if (!nodeId) return "Next aisle";
  return FALLBACK_NODES.find((node) => node.id === nodeId)?.label
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

function readImageErrorMessage(event: NativeSyntheticEvent<ImageErrorEventData>) {
  return event.nativeEvent.error || "Unable to load store map image.";
}

function logDebug(...args: unknown[]) {
  if (!IS_DEV) return;
  console.log(...args);
}

const styles = StyleSheet.create({
  panel: { flex: 1.15, backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 14, minHeight: 0 },
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
    minHeight: 340,
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#dbe4ee"
  },
  mapViewport: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 18
  },
  mapSurface: {
    height: "100%",
    maxWidth: "100%",
    alignSelf: "center",
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: "#edf2f7",
    borderWidth: 1,
    borderColor: "#dbe4ee"
  },
  mapImage: { width: "100%", height: "100%" },
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
  markerWrap: {
    position: "absolute",
    alignItems: "center",
    transform: [{ translateX: -24 }, { translateY: -58 }]
  },
  markerLabel: {
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 8
  },
  markerPin: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "#155eef",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4
  },
  headingIconWrap: { alignItems: "center", justifyContent: "center" },
  overlayCard: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 1,
    borderColor: "#dbe4ee",
    padding: 12,
    gap: 8
  },
  overlayTopLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  overlayTitle: { color: "#64748b", fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  overlayStatus: { color: "#0f766e", fontSize: 11, fontWeight: "900" },
  overlayValue: { color: "#0f172a", fontSize: 17, fontWeight: "900" },
  overlayHint: { color: "#475569", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  routeChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  routeChip: { borderRadius: 999, backgroundColor: "#dbeafe", paddingHorizontal: 10, paddingVertical: 6 },
  routeChipText: { color: "#1d4ed8", fontSize: 11, fontWeight: "900" },
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
