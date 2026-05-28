import type { CartSnapshot, ReceiptLine, ShoppingListItem } from "@carto/shared";
import type { UiLanguage } from "../store/cartUiStore";

export type ShopperItemDetails =
  | { kind: "shopping-list"; item: ShoppingListItem; cartQuantity: number }
  | { kind: "cart"; item: ReceiptLine; listItem?: ShoppingListItem };

export const CUSTOMER_WEBAPP_URL = process.env.EXPO_PUBLIC_CUSTOMER_WEBAPP_URL ?? "https://carto.com";

const NODE_LABELS: Record<string, string> = {
  entrance: "Entrance",
  produce_01: "Produce",
  bakery_01: "Bakery",
  grocery_01: "Grocery",
  dairy_01: "Dairy",
  meat_01: "Meat",
  checkout: "Checkout"
};

const TECHNICAL_MESSAGES: Record<string, { ar: string; en: string }> = {
  INVALID_LIST_PAYLOAD: {
    ar: "تعذر تحميل قائمة التسوق.",
    en: "We couldn't load your shopping list."
  },
  UNKNOWN_PRODUCT: {
    ar: "لم يتم التعرف على المنتج.",
    en: "Product not recognized."
  },
  UNKNOWN_BARCODE: {
    ar: "لم يتم التعرف على المنتج.",
    en: "Product not recognized."
  },
  EMPTY_CART: {
    ar: "السلة فارغة.",
    en: "Your cart is empty."
  },
  PAYMENT_FAILED: {
    ar: "فشلت عملية الدفع. حاول مرة أخرى.",
    en: "Payment failed. Please try again."
  },
  "Cannot checkout with an empty cart": {
    ar: "السلة فارغة.",
    en: "Your cart is empty."
  },
  "Unknown barcode/productId": {
    ar: "لم يتم التعرف على المنتج.",
    en: "Product not recognized."
  },
  "Duplicate scan ignored by debounce window": {
    ar: "تم احتساب هذه العملية بالفعل.",
    en: "That scan was already counted."
  }
};

export function isGuestShopping(snapshot: CartSnapshot | null) {
  const items = snapshot?.shoppingList ?? [];
  return snapshot?.shoppingMode === "GUEST" || (snapshot?.state === "SHOPPING" && items.length === 0);
}

export function isPendingListItem(item: ShoppingListItem) {
  return item.status !== "SKIPPED" && item.inCartQuantity < item.quantity;
}

export function getMissingListItems(snapshot: CartSnapshot | null) {
  return (snapshot?.shoppingList ?? []).filter(isPendingListItem);
}

export function getCartQuantity(snapshot: CartSnapshot | null, productId: string) {
  return (snapshot?.cartItems ?? [])
    .filter((line) => line.productId === productId)
    .reduce((sum, line) => sum + line.quantity, 0);
}

export function getNextListItem(snapshot: CartSnapshot | null) {
  const missing = getMissingListItems(snapshot);
  return missing[0];
}

export function getProgress(snapshot: CartSnapshot | null) {
  const activeItems = (snapshot?.shoppingList ?? []).filter((item) => item.status !== "SKIPPED");
  const required = activeItems.reduce((sum, item) => sum + item.quantity, 0);
  const collected = activeItems.reduce((sum, item) => sum + Math.min(item.inCartQuantity, item.quantity), 0);
  return { collected, required, ratio: required > 0 ? collected / required : 0 };
}

export function formatLocation(item?: Pick<ShoppingListItem | ReceiptLine, "category" | "mapNodeId" | "shelfId"> | null) {
  if (!item) return "Location not available yet";
  if (item.category) return `${item.category} section`;
  if (item.mapNodeId) return formatNodeLabel(item.mapNodeId);
  if (item.shelfId) return item.shelfId.replace(/_/g, " ");
  return "Location not available yet";
}

export function formatNodeLabel(nodeId: string) {
  return NODE_LABELS[nodeId] ?? nodeId.replace(/_/g, " ");
}

export function friendlyMessage(message?: string | null, language: UiLanguage = "en") {
  if (!message) return language === "ar" ? "كل شيء جاهز." : "Everything is ready.";
  for (const [technical, friendly] of Object.entries(TECHNICAL_MESSAGES)) {
    if (message.includes(technical)) return language === "ar" ? friendly.ar : friendly.en;
  }
  return message;
}

export function formatItemStatus(status?: string) {
  if (status === "IN_CART") return "Collected";
  if (status === "PARTIAL") return "Partly collected";
  if (status === "SKIPPED") return "Skipped";
  if (status === "REMOVED") return "Unavailable";
  if (status === "PENDING") return "Pending";
  return status ?? "In cart";
}
