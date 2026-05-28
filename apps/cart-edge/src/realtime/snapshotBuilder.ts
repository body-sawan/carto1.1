import type { CartSession, CartSnapshot } from "@carto/shared";

export class SnapshotBuilder {
  build(session: CartSession): CartSnapshot {
    return {
      cartId: session.cartId,
      sessionId: session.sessionId,
      state: session.state,
      pairing: session.pairing,
      activeListId: session.activeListId,
      shoppingMode: session.shoppingMode,
      shoppingList: session.shoppingList,
      cartItems: session.cartItems,
      totals: session.totals,
      payment: session.payment,
      alerts: session.alerts.slice(-6)
    };
  }
}

