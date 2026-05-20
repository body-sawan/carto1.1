import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const mapsDir = path.join(repoRoot, "apps", "cart-edge", "public", "maps");

const outputYamlPath = path.join(mapsDir, "store.yaml");
const outputPgmPath = path.join(mapsDir, "store.pgm");
const outputZonesPath = path.join(mapsDir, "store-zones.json");

const WIDTH = 900;
const HEIGHT = 650;
const RESOLUTION = 0.05;
const ORIGIN = [-10.0, -8.0, 0.0];

const FREE = 255;
const OCCUPIED = 0;
const WALL = 10;

async function main() {
  await mkdir(mapsDir, { recursive: true });

  const raster = Buffer.alloc(WIDTH * HEIGHT, FREE);
  drawSupermarketLayout(raster);

  const pgmBuffer = buildPgmBuffer(raster);
  const yamlText = buildYamlText();
  const zones = buildZoneMetadata();

  await Promise.all([
    writeFile(outputYamlPath, yamlText, "utf8"),
    writeFile(outputPgmPath, pgmBuffer),
    writeFile(outputZonesPath, `${JSON.stringify(zones, null, 2)}\n`, "utf8")
  ]);

  console.log(`Generated ${path.relative(repoRoot, outputYamlPath)}`);
  console.log(`Generated ${path.relative(repoRoot, outputPgmPath)} (${WIDTH}x${HEIGHT})`);
  console.log(`Generated ${path.relative(repoRoot, outputZonesPath)} (${zones.length} zones)`);
}

function drawSupermarketLayout(raster) {
  drawOuterWalls(raster);
  drawServiceCounters(raster);
  drawProduceArea(raster);
  drawBakeryArea(raster);
  drawCenterAisles(raster);
  drawDairyArea(raster);
  drawFrozenAndMeatArea(raster);
  drawPharmacyAndHouseholdArea(raster);
  drawCheckoutArea(raster);
  carveWalkways(raster);
  drawVestibule(raster);
}

function drawOuterWalls(raster) {
  fillRect(raster, 0, 0, WIDTH, WALL, OCCUPIED);
  fillRect(raster, 0, HEIGHT - WALL, WIDTH, WALL, OCCUPIED);
  fillRect(raster, 0, 0, WALL, HEIGHT, OCCUPIED);
  fillRect(raster, WIDTH - WALL, 0, WALL, HEIGHT, OCCUPIED);

  fillRect(raster, 390, HEIGHT - WALL, 120, WALL, FREE);
}

function drawServiceCounters(raster) {
  fillRect(raster, 60, 560, 170, 18, OCCUPIED);
  fillRect(raster, 70, 600, 120, 18, OCCUPIED);
}

function drawProduceArea(raster) {
  fillRect(raster, 95, 400, 34, 120, OCCUPIED);
  fillRect(raster, 150, 385, 34, 140, OCCUPIED);
  fillRect(raster, 205, 410, 34, 116, OCCUPIED);
  fillRect(raster, 120, 538, 84, 18, OCCUPIED);
}

function drawBakeryArea(raster) {
  fillRect(raster, 70, 70, 160, 16, OCCUPIED);
  fillRect(raster, 70, 70, 16, 100, OCCUPIED);
  fillRect(raster, 70, 154, 118, 16, OCCUPIED);
  fillRect(raster, 108, 102, 78, 18, OCCUPIED);
}

function drawCenterAisles(raster) {
  for (const x of [255, 335, 415, 495, 575, 655]) {
    fillRect(raster, x, 150, 46, 138, OCCUPIED);
    fillRect(raster, x, 342, 46, 138, OCCUPIED);
  }
}

function drawDairyArea(raster) {
  fillRect(raster, 560, 72, 170, 18, OCCUPIED);
  fillRect(raster, 560, 110, 170, 18, OCCUPIED);
}

function drawFrozenAndMeatArea(raster) {
  fillRect(raster, 690, 190, 145, 18, OCCUPIED);
  fillRect(raster, 770, 242, 60, 40, OCCUPIED);
  fillRect(raster, 770, 300, 60, 40, OCCUPIED);
  fillRect(raster, 770, 358, 60, 40, OCCUPIED);
}

function drawPharmacyAndHouseholdArea(raster) {
  fillRect(raster, 760, 82, 72, 18, OCCUPIED);
  fillRect(raster, 760, 112, 72, 18, OCCUPIED);
  fillRect(raster, 760, 142, 72, 18, OCCUPIED);
  fillRect(raster, 760, 172, 72, 18, OCCUPIED);
  fillRect(raster, 620, 520, 120, 18, OCCUPIED);
  fillRect(raster, 620, 550, 120, 18, OCCUPIED);
}

function drawCheckoutArea(raster) {
  fillRect(raster, 632, 476, 190, 18, OCCUPIED);

  for (let index = 0; index < 5; index += 1) {
    const laneX = 648 + (index * 34);
    fillRect(raster, laneX, 500, 20, 72, OCCUPIED);
    fillRect(raster, laneX + 16, 500, 4, 90, OCCUPIED);
  }
}

function carveWalkways(raster) {
  clearRect(raster, 420, 70, 70, 540);
  clearRect(raster, 225, 302, 540, 40);
  clearRect(raster, 60, 112, 780, 34);
  clearRect(raster, 60, 514, 780, 42);
  clearRect(raster, 214, 70, 34, 520);
  clearRect(raster, 720, 70, 34, 520);
  clearRect(raster, 390, 538, 120, 112);
  clearRect(raster, 602, 480, 66, 120);
  clearRect(raster, 92, 372, 180, 188);
  clearRect(raster, 80, 70, 170, 128);
}

function drawVestibule(raster) {
  fillRect(raster, 378, 560, 12, 80, OCCUPIED);
  fillRect(raster, 510, 560, 12, 80, OCCUPIED);
  fillRect(raster, 390, 560, 120, 12, OCCUPIED);
  clearRect(raster, 420, 560, 70, 80);
  fillRect(raster, 390, HEIGHT - WALL, 120, WALL, FREE);
}

function buildZoneMetadata() {
  return [
    { id: "entrance", label: "Entrance", pixelX: 450, pixelY: 592 },
    { id: "produce_01", label: "Produce", pixelX: 168, pixelY: 486 },
    { id: "bakery_01", label: "Bakery", pixelX: 172, pixelY: 124 },
    { id: "grocery_01", label: "Center Aisles", pixelX: 455, pixelY: 324 },
    { id: "dairy_01", label: "Dairy", pixelX: 715, pixelY: 108 },
    { id: "meat_01", label: "Meat & Frozen", pixelX: 785, pixelY: 316 },
    { id: "checkout", label: "Checkout", pixelX: 760, pixelY: 548 },
    { id: "pharmacy_01", label: "Pharmacy", pixelX: 796, pixelY: 168 },
    { id: "household_01", label: "Household", pixelX: 680, pixelY: 544 }
  ];
}

function buildYamlText() {
  return [
    "image: store.pgm",
    "mode: trinary",
    `resolution: ${RESOLUTION}`,
    `origin: [${ORIGIN.join(", ")}]`,
    "negate: 0",
    "occupied_thresh: 0.65",
    "free_thresh: 0.25",
    ""
  ].join("\n");
}

function buildPgmBuffer(raster) {
  const header = Buffer.from(`P5\n${WIDTH} ${HEIGHT}\n255\n`, "ascii");
  return Buffer.concat([header, raster]);
}

function fillRect(raster, x, y, width, height, value) {
  const startX = clampInt(x, 0, WIDTH);
  const startY = clampInt(y, 0, HEIGHT);
  const endX = clampInt(x + width, 0, WIDTH);
  const endY = clampInt(y + height, 0, HEIGHT);

  for (let row = startY; row < endY; row += 1) {
    const rowOffset = row * WIDTH;
    for (let column = startX; column < endX; column += 1) {
      raster[rowOffset + column] = value;
    }
  }
}

function clearRect(raster, x, y, width, height) {
  fillRect(raster, x, y, width, height, FREE);
}

function clampInt(value, min, max) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
