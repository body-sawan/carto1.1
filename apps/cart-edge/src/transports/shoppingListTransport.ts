export type ShoppingListReceivedHandler = (payload: unknown) => Promise<void> | void;

export interface ShoppingListTransport {
  start(): Promise<void>;
  stop(): Promise<void>;
  onShoppingListReceived(callback: ShoppingListReceivedHandler): void;
}
