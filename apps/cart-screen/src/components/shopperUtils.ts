import type { CartSnapshot, ReceiptLine, ShoppingListItem } from "@carto/shared";

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

const TECHNICAL_MESSAGES: Record<string, string> = {
  INVALID_LIST_PAYLOAD: "We couldn't load your shopping list.",
  UNKNOWN_PRODUCT: "Product not recognized.",
  UNKNOWN_BARCODE: "Product not recognized.",
  EMPTY_CART: "Your cart is empty.",
  PAYMENT_FAILED: "Payment failed. Please try again.",
  "Cannot checkout with an empty cart": "Your cart is empty.",
  "Unknown barcode/productId": "Product not recognized.",
  "Duplicate scan ignored by debounce window": "That scan was already counted."
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
  if (!missing.length) return undefined;
  const nextTarget = snapshot?.route.nextTarget;
  return missing.find((item) => item.mapNodeId === nextTarget) ?? missing[0];
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

export function formatRouteTarget(snapshot: CartSnapshot | null) {
  const nextTarget = snapshot?.route.nextTarget;
  if (!nextTarget) return undefined;
  return formatNodeLabel(nextTarget);
}

export function formatNodeLabel(nodeId: string) {
  return NODE_LABELS[nodeId] ?? nodeId.replace(/_/g, " ");
}

export function friendlyMessage(message?: string | null) {
  if (!message) return "Everything is ready.";
  for (const [technical, friendly] of Object.entries(TECHNICAL_MESSAGES)) {
    if (message.includes(technical)) return friendly;
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
