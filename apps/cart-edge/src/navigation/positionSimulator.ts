import type { Position } from "@carto/shared";
import { getMapNode } from "./storeMap.js";

export class PositionSimulator {
  getPosition(nodeId: string): Position {
    const node = getMapNode(nodeId);
    if (!node) throw new Error(`Unknown map node: ${nodeId}`);
    return { nodeId: node.id, x: node.x, y: node.y };
  }
}

