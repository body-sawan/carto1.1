import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const mapsDir = path.join(repoRoot, "apps", "cart-edge", "public", "maps");

const defaultPoseUrl = "http://localhost:4000/dev/pose";
const defaultHz = 5;
const defaultSpeedMetersPerSecond = 0.9;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const poseUrl = normalizePoseUrl(options["edge-url"] ?? defaultPoseUrl);
  const hz = parsePositiveNumber(options.hz, defaultHz, "hz");
  const speedMetersPerSecond = parsePositiveNumber(
    options["speed-mps"],
    defaultSpeedMetersPerSecond,
    "speed-mps"
  );

  const [metadata, zones] = await Promise.all([
    loadJson(path.join(mapsDir, "store.json"), isMapMetadata, "store.json"),
    loadJson(path.join(mapsDir, "store-zones.json"), isZoneArray, "store-zones.json")
  ]);

  const route = buildPathSamples(metadata, zones, speedMetersPerSecond, hz);
  const intervalMs = Math.max(50, Math.round(1000 / hz));

  let shouldStop = false;
  process.on("SIGINT", () => {
    shouldStop = true;
  });

  console.log(`Streaming ${route.length} simulated poses to ${poseUrl}`);
  console.log(`Map ${metadata.width}x${metadata.height} at ${metadata.resolution} m/px, ${hz} Hz, ${speedMetersPerSecond} m/s`);
  console.log("Press Ctrl+C to stop.");

  let index = 0;
  while (!shouldStop) {
    const sample = route[index % route.length];
    await postPose(poseUrl, sample);

    if (index % hz === 0) {
      console.log(
        `${sample.label.padEnd(16)} x=${sample.x.toFixed(2)} y=${sample.y.toFixed(2)} yaw=${sample.yaw.toFixed(2)}`
      );
    }

    index += 1;
    await delay(intervalMs);
  }

  console.log("Stopped simulated pose stream.");
}

async function loadJson(filePath, validator, label) {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!validator(parsed)) {
    throw new Error(`${label} has an invalid shape. Run npm run map:simulate first.`);
  }

  return parsed;
}

function buildPathSamples(metadata, zones, speedMetersPerSecond, hz) {
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
  const waypointPixels = [
    zonePoint(zoneById, "entrance"),
    { label: "south-spine", pixelX: 450, pixelY: 520 },
    { label: "main-spine", pixelX: 450, pixelY: 330 },
    { label: "west-cross", pixelX: 240, pixelY: 330 },
    { label: "produce-lane", pixelX: 240, pixelY: 470 },
    zonePoint(zoneById, "produce_01"),
    { label: "produce-lane", pixelX: 240, pixelY: 470 },
    { label: "west-cross", pixelX: 240, pixelY: 330 },
    { label: "bakery-corridor", pixelX: 185, pixelY: 330 },
    { label: "bakery-lane", pixelX: 185, pixelY: 205 },
    zonePoint(zoneById, "bakery_01"),
    { label: "north-spine", pixelX: 450, pixelY: 120 },
    zonePoint(zoneById, "dairy_01"),
    { label: "east-cross", pixelX: 720, pixelY: 315 },
    zonePoint(zoneById, "meat_01"),
    { label: "checkout-lane", pixelX: 720, pixelY: 540 },
    zonePoint(zoneById, "checkout"),
    { label: "south-corridor", pixelX: 560, pixelY: 540 },
    { label: "south-spine", pixelX: 450, pixelY: 520 },
    zonePoint(zoneById, "entrance")
  ];

  const stepDistanceMeters = speedMetersPerSecond / hz;
  const samples = [];

  for (let index = 0; index < waypointPixels.length - 1; index += 1) {
    const fromPixel = waypointPixels[index];
    const toPixel = waypointPixels[index + 1];
    const fromWorld = pixelToWorld(metadata, fromPixel.pixelX, fromPixel.pixelY);
    const toWorld = pixelToWorld(metadata, toPixel.pixelX, toPixel.pixelY);
    const distanceMeters = Math.hypot(toWorld.x - fromWorld.x, toWorld.y - fromWorld.y);
    const stepCount = Math.max(1, Math.ceil(distanceMeters / stepDistanceMeters));
    const yaw = Math.atan2(toWorld.y - fromWorld.y, toWorld.x - fromWorld.x);

    for (let step = 0; step < stepCount; step += 1) {
      const t = step / stepCount;
      samples.push({
        label: toPixel.label,
        x: lerp(fromWorld.x, toWorld.x, t),
        y: lerp(fromWorld.y, toWorld.y, t),
        yaw
      });
    }
  }

  const lastWaypoint = waypointPixels[waypointPixels.length - 1];
  const lastPoint = pixelToWorld(metadata, lastWaypoint.pixelX, lastWaypoint.pixelY);
  samples.push({ label: lastWaypoint.label, x: lastPoint.x, y: lastPoint.y, yaw: 0 });

  return samples;
}

function zonePoint(zoneById, id) {
  const zone = zoneById.get(id);
  if (!zone) {
    throw new Error(`store-zones.json is missing required zone "${id}". Run npm run map:simulate first.`);
  }

  return {
    label: zone.label,
    pixelX: zone.pixelX,
    pixelY: zone.pixelY
  };
}

function pixelToWorld(metadata, pixelX, pixelY) {
  const [originX, originY] = metadata.origin;
  return {
    x: originX + (pixelX * metadata.resolution),
    y: originY + ((metadata.height - pixelY) * metadata.resolution)
  };
}

async function postPose(url, pose) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      x: pose.x,
      y: pose.y,
      yaw: pose.yaw
    })
  });

  if (response.ok) return;

  const bodyText = await response.text().catch(() => "");
  throw new Error(`Pose post failed with HTTP ${response.status}${bodyText ? `: ${bodyText}` : ""}`);
}

function normalizePoseUrl(value) {
  const parsed = new URL(value);
  if (parsed.pathname.endsWith("/dev/pose")) {
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  }

  parsed.pathname = `${parsed.pathname.replace(/\/+$/u, "")}/dev/pose`;
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) continue;

    const key = current.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = "true";
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return options;
}

function parsePositiveNumber(value, fallback, label) {
  if (value === undefined) return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`--${label} must be a positive number.`);
  }

  return parsed;
}

function isMapMetadata(value) {
  return Boolean(value)
    && typeof value === "object"
    && typeof value.imageUrl === "string"
    && Number.isFinite(value.resolution)
    && Array.isArray(value.origin)
    && value.origin.length === 3
    && value.origin.every((entry) => Number.isFinite(entry))
    && Number.isInteger(value.width)
    && Number.isInteger(value.height);
}

function isZoneArray(value) {
  return Array.isArray(value) && value.every((zone) => (
    zone
    && typeof zone.id === "string"
    && typeof zone.label === "string"
    && Number.isFinite(zone.pixelX)
    && Number.isFinite(zone.pixelY)
  ));
}

function lerp(start, end, t) {
  return start + ((end - start) * t);
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
