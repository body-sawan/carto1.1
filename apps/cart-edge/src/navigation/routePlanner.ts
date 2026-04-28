import type { ProductCatalog } from "../products/productCatalog.js";
import type { Route, ShoppingListItem } from "@carto/shared";
import { storeMap } from "./storeMap.js";

type PathResult = { path: string[]; distance: number };

export class RoutePlanner {
  constructor(private readonly catalog: ProductCatalog) {}

  plan(currentNodeId: string, list: ShoppingListItem[]): Route {
    const targets = list
      .filter((item) => item.status === "PENDING" || item.status === "PARTIAL")
      .map((item) => this.catalog.findByProductId(item.productId)?.mapNodeId)
      .filter((nodeId): nodeId is string => Boolean(nodeId));

    const uniqueTargets = [...new Set(targets)];
    if (uniqueTargets.length === 0) return { nodes: ["checkout"], nextTarget: "checkout", distance: 0 };

    let best: PathResult | null = null;
    for (const target of uniqueTargets) {
      const path = this.shortestPath(currentNodeId, target);
      if (!best || path.distance < best.distance) best = path;
    }

    return { nodes: best?.path ?? [], nextTarget: best?.path.at(-1) ?? null, distance: best?.distance ?? 0 };
  }

  private shortestPath(start: string, goal: string): PathResult {
    const nodes = storeMap.nodes.map((node) => node.id);
    const distances = new Map(nodes.map((node) => [node, Number.POSITIVE_INFINITY]));
    const previous = new Map<string, string | null>();
    const unvisited = new Set(nodes);
    distances.set(start, 0);

    while (unvisited.size > 0) {
      const current = [...unvisited].sort((a, b) => (distances.get(a) ?? 0) - (distances.get(b) ?? 0))[0];
      if (!current || current === goal) break;
      unvisited.delete(current);

      for (const edge of storeMap.edges.filter((edge) => edge.from === current || edge.to === current)) {
        const neighbor = edge.from === current ? edge.to : edge.from;
        if (!unvisited.has(neighbor)) continue;
        const nextDistance = (distances.get(current) ?? 0) + edge.distance;
        if (nextDistance < (distances.get(neighbor) ?? Number.POSITIVE_INFINITY)) {
          distances.set(neighbor, nextDistance);
          previous.set(neighbor, current);
        }
      }
    }

    const path: string[] = [];
    let cursor: string | undefined = goal;
    while (cursor) {
      path.unshift(cursor);
      cursor = previous.get(cursor) ?? undefined;
      if (cursor === start) {
        path.unshift(cursor);
        break;
      }
    }

    return { path: path[0] === start ? path : [start], distance: roundMoney(distances.get(goal) ?? 0) };
  }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

