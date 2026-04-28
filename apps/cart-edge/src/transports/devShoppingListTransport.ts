import type { ShoppingListReceivedHandler, ShoppingListTransport } from "./shoppingListTransport.js";

export class DevShoppingListTransport implements ShoppingListTransport {
  private handler: ShoppingListReceivedHandler | null = null;

  async start(): Promise<void> {
    return;
  }

  async stop(): Promise<void> {
    return;
  }

  onShoppingListReceived(callback: ShoppingListReceivedHandler): void {
    this.handler = callback;
  }

  async simulateIncomingShoppingList(payload: unknown): Promise<void> {
    if (!this.handler) throw new Error("Dev shopping-list transport is not started");
    await this.handler(payload);
  }
}
