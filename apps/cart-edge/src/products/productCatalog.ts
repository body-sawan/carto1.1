import type { Product } from "@carto/shared";

const products: Product[] = [
  { id: "p_milk", barcode: "622100000001", name: "Milk 1L", price: 42.5, category: "Dairy", shelfId: "shelf_dairy_01", mapNodeId: "dairy_01", active: true },
  { id: "p_bread", barcode: "622100000002", name: "Bread", price: 18, category: "Bakery", shelfId: "shelf_bakery_01", mapNodeId: "bakery_01", active: true },
  { id: "p_eggs", barcode: "622100000003", name: "Eggs 12 Pack", price: 72, category: "Dairy", shelfId: "shelf_dairy_02", mapNodeId: "dairy_01", active: true },
  { id: "p_rice", barcode: "622100000004", name: "Rice 1kg", price: 55, category: "Grocery", shelfId: "shelf_grocery_01", mapNodeId: "grocery_01", active: true },
  { id: "p_apples", barcode: "622100000005", name: "Apples 1kg", price: 64, category: "Produce", shelfId: "shelf_produce_01", mapNodeId: "produce_01", active: true },
  { id: "p_chicken", barcode: "622100000006", name: "Chicken Breast", price: 185, category: "Meat", shelfId: "shelf_meat_01", mapNodeId: "meat_01", active: true }
];

export class ProductCatalog {
  all(): Product[] {
    return products;
  }

  findByProductId(productId: string): Product | undefined {
    return products.find((product) => product.id === productId && product.active);
  }

  findByBarcode(barcode: string): Product | undefined {
    return products.find((product) => product.barcode === barcode && product.active);
  }
}

