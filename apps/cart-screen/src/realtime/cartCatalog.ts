import type { Product } from "@carto/shared";

const DEMO_PRODUCTS: Product[] = [
  { id: "p_milk", barcode: "622100000001", name: "Milk 1L", price: 42.5, category: "Dairy", shelfId: "shelf_dairy_01", mapNodeId: "dairy_01", active: true },
  { id: "p_bread", barcode: "622100000002", name: "Bread", price: 18, category: "Bakery", shelfId: "shelf_bakery_01", mapNodeId: "bakery_01", active: true },
  { id: "p_eggs", barcode: "622100000003", name: "Eggs 12 Pack", price: 72, category: "Dairy", shelfId: "shelf_dairy_02", mapNodeId: "dairy_01", active: true },
  { id: "p_rice", barcode: "622100000004", name: "Rice 1kg", price: 55, category: "Grocery", shelfId: "shelf_grocery_01", mapNodeId: "grocery_01", active: true },
  { id: "p_apples", barcode: "622100000005", name: "Apples 1kg", price: 64, category: "Produce", shelfId: "shelf_produce_01", mapNodeId: "produce_01", active: true },
  { id: "p_chicken", barcode: "622100000006", name: "Chicken Breast", price: 185, category: "Meat", shelfId: "shelf_meat_01", mapNodeId: "meat_01", active: true }
];

const registeredProducts = new Map<string, Product>();
const registeredProductsByBarcode = new Map<string, Product>();

for (const product of DEMO_PRODUCTS) {
  registerProduct(product);
}

export function normalizeRemoteProduct(product: {
  id: string;
  name: string;
  category?: string | null;
  price?: number | null;
  emoji?: string | null;
}) {
  return {
    id: product.id,
    barcode: `carto-${product.id}`,
    name: product.name,
    price: product.price ?? 0,
    category: product.category ?? "General",
    shelfId: product.category ? `shelf_${slugify(product.category)}` : "shelf_general",
    mapNodeId: categoryToNodeId(product.category),
    active: true
  } satisfies Product;
}

export function registerCatalogProducts(products: Product[]) {
  for (const product of products) {
    registerProduct(product);
  }
}

export function getRegisteredCatalogProducts() {
  return Array.from(registeredProducts.values());
}

export function findCatalogProductById(productId: string) {
  return registeredProducts.get(productId);
}

export function findCatalogProductByBarcode(barcode: string) {
  return registeredProductsByBarcode.get(barcode);
}

function registerProduct(product: Product) {
  registeredProducts.set(product.id, product);
  registeredProductsByBarcode.set(product.barcode, product);
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "") || "general";
}

function categoryToNodeId(category?: string | null) {
  const normalized = slugify(category ?? "general");
  if (normalized.includes("bakery")) return "bakery_01";
  if (normalized.includes("dairy")) return "dairy_01";
  if (normalized.includes("meat")) return "meat_01";
  if (normalized.includes("produce") || normalized.includes("fruit")) return "produce_01";
  return "grocery_01";
}
