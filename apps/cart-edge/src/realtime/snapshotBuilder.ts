import type { CartSession, CartSnapshot } from "@carto/shared";

export class SnapshotBuilder {
  build(session: CartSession): CartSnapshot {
    return {
      cartId: session.cartId,
      sessionId: session.sessionId,
      state: session.state,
      pairing: session.pairing,
      activeListId: session.activeListId,
      shoppingList: session.shoppingList,
      cartItems: session.cartItems,
      totals: session.totals,
      position: session.position,
      route: session.route,
      payment: session.payment,
      alerts: session.alerts.slice(-6)
    };
  }
}

