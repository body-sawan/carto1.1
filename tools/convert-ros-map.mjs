import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const mapsDir = path.join(repoRoot, "apps", "cart-edge", "public", "maps");
const sourcePgmPath = path.join(mapsDir, "store.pgm");
const sourceYamlPath = path.join(mapsDir, "store.yaml");
const outputPngPath = path.join(mapsDir, "store.png");
const outputJsonPath = path.join(mapsDir, "store.json");

const palette = {
  occupied: [50, 65, 82],
  free: [247, 249, 252],
  unknown: [223, 228, 235]
};

async function main() {
  const [pgmBuffer, yamlText] = await Promise.all([
    readFile(sourcePgmPath),
    readFile(sourceYamlPath, "utf8")
  ]);

  const rosMap = parseRosMapYaml(yamlText);
  const pgm = parsePgm(pgmBuffer);
  const pngBuffer = buildPngBuffer(pgm.width, pgm.height, pgm.pixels, (rawValue) => classifyPixel(rawValue, rosMap));
  const metadata = {
    imageUrl: "/maps/store.png",
    resolution: rosMap.resolution,
    origin: rosMap.origin,
    width: pgm.width,
    height: pgm.height
  };

  await Promise.all([
    writeFile(outputPngPath, pngBuffer),
    writeFile(outputJsonPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8")
  ]);

  console.log(`Converted ${path.relative(repoRoot, sourcePgmPath)} -> ${path.relative(repoRoot, outputPngPath)}`);
  console.log(`Wrote ${path.relative(repoRoot, outputJsonPath)} (${pgm.width}x${pgm.height}, resolution ${rosMap.resolution})`);
}

function parseRosMapYaml(text) {
  const values = new Map();

  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    values.set(key, value);
  }

  const resolution = parseFiniteNumber(values.get("resolution"), "resolution");
  const origin = parseOrigin(values.get("origin"));
  const negate = parseFiniteNumber(values.get("negate") ?? "0", "negate");
  const occupiedThreshold = parseFiniteNumber(values.get("occupied_thresh") ?? "0.65", "occupied_thresh");
  const freeThreshold = parseFiniteNumber(values.get("free_thresh") ?? "0.196", "free_thresh");

  return {
    resolution,
    origin,
    negate,
    occupiedThreshold,
    freeThreshold
  };
}

function parseOrigin(value) {
  if (!value) {
    throw new Error("store.yaml is missing origin.");
  }

  const normalized = value.replace(/^\[/u, "").replace(/\]$/u, "");
  const parts = normalized.split(",").map((part) => parseFiniteNumber(part.trim(), "origin"));
  if (parts.length !== 3) {
    throw new Error("origin must contain exactly three numbers.");
  }

  return [parts[0], parts[1], parts[2]];
}

function parseFiniteNumber(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${fieldName} value: ${value ?? "<missing>"}`);
  }
  return parsed;
}

function parsePgm(buffer) {
  let offset = 0;

  const skipSpaceAndComments = () => {
    while (offset < buffer.length) {
      const current = buffer[offset];
      if (current === 35) {
        while (offset < buffer.length && buffer[offset] !== 10 && buffer[offset] !== 13) offset += 1;
        continue;
      }
      if (current === 9 || current === 10 || current === 13 || current === 32) {
        offset += 1;
        continue;
      }
      break;
    }
  };

  const readToken = () => {
    skipSpaceAndComments();
    const start = offset;
    while (offset < buffer.length) {
      const current = buffer[offset];
      if (current === 9 || current === 10 || current === 13 || current === 32 || current === 35) {
        break;
      }
      offset += 1;
    }
    if (start === offset) {
      throw new Error("Unexpected end of PGM header.");
    }
    return buffer.toString("ascii", start, offset);
  };

  const magic = readToken();
  const width = parseFiniteInteger(readToken(), "width");
  const height = parseFiniteInteger(readToken(), "height");
  const maxValue = parseFiniteInteger(readToken(), "max value");

  if (maxValue <= 0 || maxValue > 255) {
    throw new Error(`Unsupported PGM max value: ${maxValue}`);
  }

  skipSpaceAndComments();
  const pixelCount = width * height;

  if (magic === "P5") {
    const pixels = buffer.subarray(offset, offset + pixelCount);
    if (pixels.length !== pixelCount) {
      throw new Error("PGM raster is smaller than expected.");
    }
    return { width, height, pixels };
  }

  if (magic === "P2") {
    const pixels = new Uint8Array(pixelCount);
    for (let index = 0; index < pixelCount; index += 1) {
      pixels[index] = parseFiniteInteger(readToken(), `pixel ${index}`);
    }
    return { width, height, pixels };
  }

  throw new Error(`Unsupported PGM magic header: ${magic}`);
}

function parseFiniteInteger(value, fieldName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return parsed;
}

function classifyPixel(rawValue, rosMap) {
  if (rawValue === 205) return palette.unknown;

  const occupancy = rosMap.negate === 0
    ? (255 - rawValue) / 255
    : rawValue / 255;

  if (occupancy >= rosMap.occupiedThreshold) return palette.occupied;
  if (occupancy <= rosMap.freeThreshold) return palette.free;
  return palette.unknown;
}

function buildPngBuffer(width, height, pixels, colorResolver) {
  const scanlines = Buffer.alloc(height * (1 + width * 3));

  for (let y = 0; y < height; y += 1) {
    const scanlineOffset = y * (1 + width * 3);
    scanlines[scanlineOffset] = 0;

    for (let x = 0; x < width; x += 1) {
      const pixelOffset = y * width + x;
      const [red, green, blue] = colorResolver(pixels[pixelOffset]);
      const outputOffset = scanlineOffset + 1 + (x * 3);
      scanlines[outputOffset] = red;
      scanlines[outputOffset + 1] = green;
      scanlines[outputOffset + 2] = blue;
    }
  }

  return buildPng(width, height, scanlines);
}

function buildPng(width, height, imageData) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    createChunk("IHDR", ihdr),
    createChunk("IDAT", zlib.deflateSync(imageData, { level: 9 })),
    createChunk("IEND", Buffer.alloc(0))
  ]);
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const value of buffer) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
