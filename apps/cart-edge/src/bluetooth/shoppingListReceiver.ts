import type { SessionManager } from "../core/sessionManager.js";

export class ShoppingListReceiver {
  constructor(private readonly sessionManager: SessionManager) {}

  async receive(payload: unknown) {
    return this.sessionManager.receiveShoppingList(payload);
  }
}

