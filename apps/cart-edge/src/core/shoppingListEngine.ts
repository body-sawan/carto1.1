import { z } from "zod";
import type { IncomingShoppingList, ShoppingListItem } from "@carto/shared";
import type { ProductCatalog } from "../products/productCatalog.js";

const incomingListSchema = z.object({
  listId: z.string().min(1),
  source: z.string().min(1).default("local-http"),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  items: z.array(z.object({
    productId: z.string().min(1),
    name: z.string().min(1),
    quantity: z.number().int().positive()
  })).min(1)
});

export class ShoppingListEngine {
  constructor(private readonly catalog: ProductCatalog) {}

  validateIncoming(input: unknown): IncomingShoppingList {
    const list = incomingListSchema.parse(input);
    for (const item of list.items) {
      if (!this.catalog.findByProductId(item.productId)) {
        throw new Error(`Unknown or inactive product in shopping list: ${item.productId}`);
      }
    }
    return list;
  }

  createItems(list: IncomingShoppingList): ShoppingListItem[] {
    return list.items.map((item) => ({ ...item, status: "PENDING", inCartQuantity: 0 }));
  }

  updateStatuses(list: ShoppingListItem[], quantities: Map<string, number>): ShoppingListItem[] {
    return list.map((item) => {
      const inCartQuantity = quantities.get(item.productId) ?? 0;
      const status = inCartQuantity <= 0
        ? "PENDING"
        : inCartQuantity >= item.quantity ? "IN_CART" : "PARTIAL";
      return { ...item, inCartQuantity, status };
    });
  }
}

