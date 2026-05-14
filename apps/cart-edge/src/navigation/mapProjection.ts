import { readFile } from "node:fs/promises";
import { z } from "zod";

const mapMetadataSchema = z.object({
  imageUrl: z.string().min(1),
  resolution: z.number().positive(),
  origin: z.tuple([z.number(), z.number(), z.number()]),
  width: z.number().int().positive(),
  height: z.number().int().positive()
});

export type StoreMapMetadata = z.infer<typeof mapMetadataSchema>;

export interface PixelPoint {
  pixelX: number;
  pixelY: number;
}

export async function loadMapMetadata(filePath: string): Promise<StoreMapMetadata> {
  const raw = await readFile(filePath, "utf8");
  return mapMetadataSchema.parse(JSON.parse(raw));
}

export function worldToPixel(meta: StoreMapMetadata, xMeters: number, yMeters: number): PixelPoint {
  const [originX, originY] = meta.origin;
  return {
    pixelX: (xMeters - originX) / meta.resolution,
    pixelY: meta.height - ((yMeters - originY) / meta.resolution)
  };
}
