import type { CartSnapshot, ReceiptLine, ShoppingListItem, ShoppingListItemStatus } from "@carto/shared";
import { useCartUiStore } from "../store/cartUiStore";
import { CART_CODE } from "./config";
import { findCatalogProductByBarcode, findCatalogProductById } from "./cartCatalog";

export const READ_ONLY_SESSION_MESSAGE = "Backend-paired sessions are read-only on this cart until teammate device write APIs are added.";
export const LOCAL_GUEST_REQUIRED_MESSAGE = "Start shopping without a list to use local cart controls.";

export function startLocalGuestSession() {
  const { clearDeviceCart, snapshot, setBackendStatus, setConnected, setSessionControlMode, setSnapshot } = useCartUiStore.getState();
  const sessionId = `guest_${Date.now()}`;

  clearDeviceCart(sessionId);
  setSessionControlMode("local_guest");
  setConnected(true);
  setBackendStatus("connected");
  setSnapshot({
    cartId: snapshot?.cartId ?? snapshot?.pairing?.cartId ?? (CART_CODE || "carto-cart"),
    sessionId,
    state: "SHOPPING",
    pairing: snapshot?.pairing ?? null,
    shoppingMode: "GUEST",
    shoppingList: [],
    cartItems: [],
    totals: emptyTotals(),
    payment: {
      status: "NOT_STARTED",
      amount: 0
    },
    alerts: []
  });
}

export function resetLocalGuestSession() {
  const { clearDeviceCart, clearSnapshot, setSessionControlMode } = useCartUiStore.getState();
  clearDeviceCart();
  clearSnapshot();
  setSessionControlMode("full");
}

export function startLocalGuestCheckout() {
  const { snapshot, setSnapshot } = useCartUiStore.getState();
  const writableSnapshot = assertWritableLocalSession(snapshot);
  if (!writableSnapshot.cartItems.length) {
    throw new Error("Cannot checkout with an empty cart");
  }

  setSnapshot({
    ...writableSnapshot,
    state: "WAITING_PAYMENT",
    payment: {
      ...writableSnapshot.payment,
      status: "WAITING_PAYMENT",
      amount: writableSnapshot.totals.total,
      updatedAt: new Date().toISOString()
    }
  });
}

export function confirmLocalGuestPayment() {
  const { snapshot, setSnapshot } = useCartUiStore.getState();
  const writableSnapshot = assertWritableLocalSession(snapshot);

  setSnapshot({
    ...writableSnapshot,
    state: "PAID",
    payment: {
      ...writableSnapshot.payment,
      status: "PAID",
      amount: writableSnapshot.totals.total,
      updatedAt: new Date().toISOString()
    }
  });
}

export function failLocalGuestPayment() {
  const { snapshot, setSnapshot } = useCartUiStore.getState();
  const writableSnapshot = assertWritableLocalSession(snapshot);

  setSnapshot({
    ...writableSnapshot,
    state: "PAYMENT_FAILED",
    payment: {
      ...writableSnapshot.payment,
      status: "FAILED",
      amount: writableSnapshot.totals.total,
      updatedAt: new Date().toISOString()
    }
  });
}

export function retryLocalGuestPayment() {
  const { snapshot, setSnapshot } = useCartUiStore.getState();
  const writableSnapshot = assertWritableLocalSession(snapshot);

  setSnapshot({
    ...writableSnapshot,
    state: "WAITING_PAYMENT",
    payment: {
      ...writableSnapshot.payment,
      status: "WAITING_PAYMENT",
      amount: writableSnapshot.totals.total,
      updatedAt: new Date().toISOString()
    }
  });
}

export function cancelLocalGuestCheckout() {
  const { snapshot, setSnapshot } = useCartUiStore.getState();
  const writableSnapshot = assertWritableLocalSession(snapshot);

  setSnapshot({
    ...writableSnapshot,
    state: "SHOPPING",
    payment: {
      ...writableSnapshot.payment,
      status: "CANCELLED",
      amount: writableSnapshot.totals.total,
      updatedAt: new Date().toISOString()
    }
  });
}

export function addLocalProduct(productId?: string, barcode?: string) {
  const product = resolveProduct(productId, barcode);
  if (!product) {
    throw new Error("Unknown barcode/productId");
  }

  mutateLocalGuestCart((snapshot) => {
    const existingLine = snapshot.cartItems.find((item) => item.productId === product.id);
    const cartItems = existingLine
      ? snapshot.cartItems.map((item) => (
        item.productId === product.id
          ? {
            ...item,
            quantity: item.quantity + 1,
            lineTotal: product.price * (item.quantity + 1)
          }
          : item
      ))
      : [
        {
          lineId: `line_${product.id}`,
          productId: product.id,
          barcode: product.barcode,
          name: product.name,
          unitPrice: product.price,
          quantity: 1,
          lineTotal: product.price,
          category: product.category,
          shelfId: product.shelfId,
          mapNodeId: product.mapNodeId,
          addedAt: new Date().toISOString()
        },
        ...snapshot.cartItems
      ];

    return rebuildSnapshot(snapshot, cartItems);
  });
}

export function removeLocalProduct(productId?: string, barcode?: string) {
  const product = resolveProduct(productId, barcode);
  if (!product) {
    throw new Error("Unknown barcode/productId");
  }

  mutateLocalGuestCart((snapshot) => {
    const existingLine = snapshot.cartItems.find((item) => item.productId === product.id);
    if (!existingLine) {
      throw new Error("Product not in cart");
    }

    const cartItems = existingLine.quantity <= 1
      ? snapshot.cartItems.filter((item) => item.productId !== product.id)
      : snapshot.cartItems.map((item) => (
        item.productId === product.id
          ? {
            ...item,
            quantity: item.quantity - 1,
            lineTotal: product.price * (item.quantity - 1)
          }
          : item
      ));

    return rebuildSnapshot(snapshot, cartItems);
  });
}

function mutateLocalGuestCart(mutator: (snapshot: CartSnapshot) => CartSnapshot) {
  const { snapshot, setSnapshot } = useCartUiStore.getState();
  const writableSnapshot = assertWritableLocalSession(snapshot);
  setSnapshot(mutator(writableSnapshot));
}

function assertWritableLocalSession(snapshot: CartSnapshot | null) {
  const { sessionControlMode } = useCartUiStore.getState();
  if (sessionControlMode === "read_only") {
    throw new Error(READ_ONLY_SESSION_MESSAGE);
  }
  if (sessionControlMode !== "local_guest" || !snapshot) {
    throw new Error(LOCAL_GUEST_REQUIRED_MESSAGE);
  }
  return snapshot;
}

function resolveProduct(productId?: string, barcode?: string) {
  if (productId) {
    return findCatalogProductById(productId);
  }
  if (barcode) {
    return findCatalogProductByBarcode(barcode);
  }
  return undefined;
}

function rebuildSnapshot(snapshot: CartSnapshot, cartItems: ReceiptLine[]) {
  const totals = calculateTotals(cartItems);
  return {
    ...snapshot,
    cartItems,
    shoppingList: recalculateShoppingList(snapshot.shoppingList, cartItems),
    totals,
    payment: {
      ...snapshot.payment,
      amount: totals.total,
      updatedAt: new Date().toISOString()
    }
  };
}

function recalculateShoppingList(shoppingList: ShoppingListItem[], cartItems: ReceiptLine[]) {
  const quantitiesByProductId = new Map<string, number>();
  const quantitiesByName = new Map<string, number>();

  for (const item of cartItems) {
    quantitiesByProductId.set(item.productId, (quantitiesByProductId.get(item.productId) ?? 0) + item.quantity);
    quantitiesByName.set(normalizeKey(item.name), (quantitiesByName.get(normalizeKey(item.name)) ?? 0) + item.quantity);
  }

  return shoppingList.map((item) => {
    const inCartQuantity = quantitiesByProductId.get(item.productId)
      ?? quantitiesByName.get(normalizeKey(item.name))
      ?? 0;
    const status: ShoppingListItemStatus = inCartQuantity <= 0
      ? "PENDING"
      : inCartQuantity < item.quantity
        ? "PARTIAL"
        : "IN_CART";

    return {
      ...item,
      inCartQuantity,
      status
    };
  });
}

function calculateTotals(cartItems: ReceiptLine[]) {
  const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = roundMoney(subtotal * 0.085);
  return {
    subtotal: roundMoney(subtotal),
    discount: 0,
    tax,
    total: roundMoney(subtotal + tax)
  };
}

function emptyTotals() {
  return {
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0
  };
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
