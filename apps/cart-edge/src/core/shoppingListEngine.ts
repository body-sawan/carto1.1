import { z } from "zod";
import type { IncomingShoppingList, ShoppingListItem } from "@carto/shared";
import type { ProductCatalog } from "../products/productCatalog.js";

export type ShoppingListValidationCode = "INVALID_LIST_PAYLOAD" | "UNKNOWN_PRODUCT";

export class ShoppingListValidationError extends Error {
  constructor(
    public readonly code: ShoppingListValidationCode,
    message: string
  ) {
    super(message);
  }
}

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
    const parsed = incomingListSchema.safeParse(input);
    if (!parsed.success) {
      throw new ShoppingListValidationError("INVALID_LIST_PAYLOAD", formatShoppingListValidationMessage(parsed.error));
    }

    const list = parsed.data;
    for (const item of list.items) {
      if (!this.catalog.findByProductId(item.productId)) {
        throw new ShoppingListValidationError("UNKNOWN_PRODUCT", `Unknown or inactive product in shopping list: ${item.productId}`);
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

function formatShoppingListValidationMessage(error: z.ZodError): string {
  for (const issue of error.issues) {
    const [field, itemIndex, itemField] = issue.path;
    if (field === "items" && issue.path.length === 1) {
      return "Shopping list items must be a non-empty array.";
    }

    if (field === "listId") {
      return "Shopping list listId is required.";
    }

    if (field === "items" && typeof itemIndex === "number") {
      if (itemField === "productId") {
        return `Shopping list item ${itemIndex} productId must be a non-empty string.`;
      }
      if (itemField === "name") {
        return `Shopping list item ${itemIndex} name must be a non-empty string.`;
      }
      if (itemField === "quantity") {
        return `Shopping list item ${itemIndex} quantity must be a positive integer.`;
      }
      return `Shopping list item ${itemIndex} must be an object.`;
    }

    if (field === "createdAt") {
      return "Shopping list createdAt must be an ISO datetime string.";
    }

    if (field === "source") {
      return "Shopping list source must be a non-empty string.";
    }
  }

  return "Invalid shopping list payload.";
}

