export interface MapNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface MapEdge {
  from: string;
  to: string;
  distance: number;
}

export interface Shelf {
  id: string;
  label: string;
  nodeId: string;
}

export const storeMap = {
  nodes: [
    { id: "entrance", label: "Entrance", x: 0, y: 0 },
    { id: "produce_01", label: "Produce", x: 2, y: 1 },
    { id: "bakery_01", label: "Bakery", x: 5, y: 1 },
    { id: "grocery_01", label: "Grocery", x: 5, y: 4 },
    { id: "dairy_01", label: "Dairy", x: 2, y: 4 },
    { id: "meat_01", label: "Meat", x: 8, y: 4 },
    { id: "checkout", label: "Checkout", x: 9, y: 0 }
  ] satisfies MapNode[],
  edges: [
    { from: "entrance", to: "produce_01", distance: 2.2 },
    { from: "produce_01", to: "bakery_01", distance: 3 },
    { from: "bakery_01", to: "grocery_01", distance: 3 },
    { from: "grocery_01", to: "dairy_01", distance: 3 },
    { from: "grocery_01", to: "meat_01", distance: 3 },
    { from: "bakery_01", to: "checkout", distance: 4 },
    { from: "meat_01", to: "checkout", distance: 4.2 },
    { from: "dairy_01", to: "produce_01", distance: 3 }
  ] satisfies MapEdge[],
  shelves: [
    { id: "shelf_dairy_01", label: "Dairy A", nodeId: "dairy_01" },
    { id: "shelf_dairy_02", label: "Dairy B", nodeId: "dairy_01" },
    { id: "shelf_bakery_01", label: "Bakery A", nodeId: "bakery_01" },
    { id: "shelf_grocery_01", label: "Grocery A", nodeId: "grocery_01" },
    { id: "shelf_produce_01", label: "Produce A", nodeId: "produce_01" },
    { id: "shelf_meat_01", label: "Meat A", nodeId: "meat_01" }
  ] satisfies Shelf[]
};

export function getMapNode(nodeId: string) {
  return storeMap.nodes.find((node) => node.id === nodeId);
}

