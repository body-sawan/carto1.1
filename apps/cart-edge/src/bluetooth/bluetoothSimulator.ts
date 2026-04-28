import type { ShoppingListReceiver } from "./shoppingListReceiver.js";

export class BluetoothSimulator {
  constructor(private readonly receiver: ShoppingListReceiver) {}

  async simulateIncomingShoppingList(payload: unknown) {
    return this.receiver.receive(payload);
  }
}

