export const PROTOCOL_VERSION = "1.0";

export type CartState =
  | "BOOTING"
  | "WAITING_FOR_LIST"
  | "SHOPPING"
  | "CHECKOUT_PENDING"
  | "WAITING_PAYMENT"
  | "PAID"
  | "PAYMENT_FAILED"
  | "SESSION_CLOSED"
  | "ERROR";

export type PaymentStatus = "NOT_STARTED" | "WAITING_PAYMENT" | "PAID" | "FAILED" | "CANCELLED";
export type ShoppingListItemStatus = "PENDING" | "PARTIAL" | "IN_CART" | "REMOVED" | "SKIPPED";

export type EdgeMessageType = "cart.snapshot" | "cart.state_changed" | "cart.alert" | "payment.status" | "heartbeat";
export type ScreenMessageType =
  | "screen.connected"
  | "screen.request_snapshot"
  | "command.checkout_start"
  | "command.payment_confirm"
  | "command.cancel_checkout";

export interface ProtocolMessage<TType extends string = string, TPayload = unknown> {
  type: TType;
  protocolVersion: string;
  cartId: string;
  sessionId: string | null;
  sequence: number;
  timestamp: string;
  payload: TPayload;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  category: string;
  shelfId: string;
  mapNodeId: string;
  active: boolean;
}

export interface IncomingShoppingListItem {
  productId: string;
  name: string;
  quantity: number;
}

export interface IncomingShoppingList {
  listId: string;
  source: string;
  items: IncomingShoppingListItem[];
  createdAt: string;
}

export interface ShoppingListItem extends IncomingShoppingListItem {
  status: ShoppingListItemStatus;
  inCartQuantity: number;
}

export interface ReceiptLine {
  lineId: string;
  productId: string;
  barcode: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  addedAt: string;
}

export interface Totals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export interface PairingInfo {
  qrPayload: string;
  pairingCode: string;
  cartId: string;
  sessionId: string;
  transport: "ble";
  bluetoothDeviceName: string;
  serviceUuid: string;
  writeCharacteristicUuid: string;
  notifyCharacteristicUuid: string;
  receiveListUrl?: string;
  expiresAt: string;
}

export interface Position {
  nodeId: string;
  x: number;
  y: number;
}

export interface Route {
  nodes: string[];
  nextTarget: string | null;
  distance: number;
}

export interface Alert {
  id: string;
  level: "info" | "warning" | "error" | "success";
  message: string;
  createdAt: string;
}

export interface PaymentState {
  status: PaymentStatus;
  amount: number;
  transactionId?: string;
  updatedAt?: string;
}

export interface CartSnapshot {
  cartId: string;
  sessionId: string | null;
  state: CartState;
  pairing: PairingInfo | null;
  shoppingList: ShoppingListItem[];
  cartItems: ReceiptLine[];
  totals: Totals;
  position: Position;
  route: Route;
  payment: PaymentState;
  alerts: Alert[];
}

export interface CartSession {
  cartId: string;
  sessionId: string;
  state: CartState;
  pairing: PairingInfo;
  shoppingList: ShoppingListItem[];
  cartItems: ReceiptLine[];
  totals: Totals;
  position: Position;
  route: Route;
  payment: PaymentState;
  alerts: Alert[];
  createdAt: string;
  updatedAt: string;
}

export type CartSnapshotMessage = ProtocolMessage<"cart.snapshot", CartSnapshot>;
export type PaymentStatusMessage = ProtocolMessage<"payment.status", PaymentState>;
