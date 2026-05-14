import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { Navigation } from "lucide-react-native";
import { CART_EDGE_HTTP_URL } from "../realtime/config";
import type { CartSnapshot } from "../store/cartUiStore";

interface StoreMapAssetMetadata {
  imageUrl: string;
  resolution: number;
  origin: [number, number, number];
  width: number;
  height: number;
}

interface ViewportSize {
  width: number;
  height: number;
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
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [viewport, setViewport] = useState<ViewportSize>({ width: 0, height: 0 });

  useEffect(() => {
    let cancelled = false;

    async function loadMetadata() {
      try {
        const response = await fetch(`${CART_EDGE_HTTP_URL}/maps/store.json`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (!isStoreMapAssetMetadata(payload)) {
          throw new Error("Invalid store map metadata shape.");
        }

        if (!cancelled) {
          setMetadata(payload);
          setMetadataError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setMetadata(null);
          setMetadataError(error instanceof Error ? error.message : "Unable to load store map metadata.");
        }
      }
    }

    void loadMetadata();

    return () => {
      cancelled = true;
    };
  }, []);

  const routeSteps = snapshot?.route.path ?? snapshot?.route.nodes ?? [];
  const routeNodeIds = new Set(routeSteps);
  const nextTargetLabel = fallbackNodeLabel(snapshot?.route.nextTarget);
  const nextItem = snapshot?.shoppingList.find((item) => item.status === "PENDING" || item.status === "PARTIAL") ?? null;
  const poseSource = snapshot?.position.source === "lidar" ? "LiDAR live" : "Simulator";
  const updatedLabel = formatTime(snapshot?.position.updatedAt);
  const hasRealPose = isFiniteNumber(snapshot?.position.pixelX) && isFiniteNumber(snapshot?.position.pixelY);
  const mapSize = metadata ? fitInside(viewport, metadata.width, metadata.height) : null;
  const shouldUseRealMap = Boolean(metadata && hasRealPose && !imageFailed);
  const routeSummary = routeSteps.length > 0 ? routeSteps.map(fallbackNodeLabel).join(" -> ") : "Waiting for shopping list";

  return (
    <View style={styles.panel}>
        <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Store Map</Text>
          <Text style={styles.subtitle}>{shouldUseRealMap ? "You are here" : "Route overview"}</Text>
        </View>
        <View style={styles.headerBadges}>
          <View style={[styles.badge, snapshot?.position.source === "lidar" ? styles.badgeSuccess : styles.badgeNeutral]}>
            <Text style={[styles.badgeText, snapshot?.position.source === "lidar" ? styles.badgeSuccessText : styles.badgeNeutralText]}>
              {poseSource}
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
        {shouldUseRealMap && metadata ? (
          <View style={styles.mapViewport} onLayout={(event) => handleViewportLayout(event, setViewport)}>
            {mapSize ? (
              <View style={[styles.mapSurface, { width: mapSize.width, height: mapSize.height }]}>
              <Image
                source={{ uri: `${CART_EDGE_HTTP_URL}${metadata.imageUrl}` }}
                style={styles.mapImage}
                resizeMode="stretch"
                onLoad={() => setImageReady(true)}
                onError={() => {
                  setImageFailed(true);
                  setImageReady(false);
                }}
              />

              {!imageReady ? (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color="#155eef" />
                </View>
              ) : null}

              <View
                style={[
                  styles.markerWrap,
                  {
                    left: (snapshot?.position.pixelX ?? 0) * mapSize.width / metadata.width,
                    top: (snapshot?.position.pixelY ?? 0) * mapSize.height / metadata.height
                  }
                ]}
              >
                <Text style={styles.markerLabel}>You are here</Text>
                <View style={styles.markerPin}>
                  <View style={[styles.headingIconWrap, { transform: [{ rotate: `${((snapshot?.position.yawRad ?? 0) * 180) / Math.PI}deg` }] }]}>
                    <Navigation size={18} color="#ffffff" strokeWidth={2.5} />
                  </View>
                </View>
              </View>

              <View style={styles.overlayCard}>
                <Text style={styles.overlayTitle}>Next stop</Text>
                <Text style={styles.overlayValue}>{nextTargetLabel}</Text>
                <View style={styles.routeChipRow}>
                  {routeSteps.slice(0, 4).map((nodeId) => (
                    <View key={nodeId} style={styles.routeChip}>
                      <Text style={styles.routeChipText}>{fallbackNodeLabel(nodeId)}</Text>
                    </View>
                  ))}
                </View>
              </View>
              </View>
            ) : (
              <ActivityIndicator size="small" color="#155eef" />
            )}
          </View>
        ) : (
          <View style={styles.fallbackMap}>
            <View style={styles.fallbackBadgeRow}>
              <View style={[styles.badge, styles.badgeSlate]}>
                <Text style={[styles.badgeText, styles.badgeSlateText]}>
                  {metadataError ? "Map offline" : snapshot?.position.source === "lidar" ? "Waiting for live pose" : "Simulator route"}
                </Text>
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
              {metadataError ? "Check /maps/store.json and /maps/store.png." : "The real map switches on as soon as cart-edge starts receiving /dev/pose updates."}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.routeSummary}>{routeSummary}</Text>
    </View>
  );
}

function handleViewportLayout(event: LayoutChangeEvent, setViewport: Dispatch<SetStateAction<ViewportSize>>) {
  const { width, height } = event.nativeEvent.layout;
  setViewport((current) => (
    current.width === width && current.height === height
      ? current
      : { width, height }
  ));
}

function fitInside(viewport: ViewportSize, sourceWidth: number, sourceHeight: number): ViewportSize | null {
  if (viewport.width <= 0 || viewport.height <= 0 || sourceWidth <= 0 || sourceHeight <= 0) {
    return null;
  }

  const scale = Math.min(viewport.width / sourceWidth, viewport.height / sourceHeight);
  return {
    width: sourceWidth * scale,
    height: sourceHeight * scale
  };
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
  badgeSlateText: { color: "#334155" },
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
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: "#edf2f7",
    borderWidth: 1,
    borderColor: "#dbe4ee"
  },
  mapImage: { width: "100%", height: "100%" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248, 250, 252, 0.62)"
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
  overlayTitle: { color: "#64748b", fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  overlayValue: { color: "#0f172a", fontSize: 17, fontWeight: "900" },
  routeChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  routeChip: { borderRadius: 999, backgroundColor: "#dbeafe", paddingHorizontal: 10, paddingVertical: 6 },
  routeChipText: { color: "#1d4ed8", fontSize: 11, fontWeight: "900" },
  fallbackMap: { flex: 1, position: "relative", padding: 18 },
  fallbackBadgeRow: { position: "absolute", top: 14, right: 14, zIndex: 2 },
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
