import type { CartState } from "@carto/shared";

const transitions: Record<CartState, CartState[]> = {
  BOOTING: ["WAITING_FOR_LIST", "ERROR"],
  WAITING_FOR_LIST: ["SHOPPING", "ERROR"],
  SHOPPING: ["CHECKOUT_PENDING", "ERROR"],
  CHECKOUT_PENDING: ["WAITING_PAYMENT", "SHOPPING", "ERROR"],
  WAITING_PAYMENT: ["PAID", "PAYMENT_FAILED", "SHOPPING", "ERROR"],
  PAID: ["SESSION_CLOSED"],
  PAYMENT_FAILED: ["SHOPPING", "WAITING_PAYMENT", "ERROR"],
  SESSION_CLOSED: ["WAITING_FOR_LIST", "ERROR"],
  ERROR: ["WAITING_FOR_LIST"]
};

export class CartStateMachine {
  transition(current: CartState, next: CartState): CartState {
    if (!transitions[current].includes(next)) {
      throw new Error(`Invalid state transition: ${current} -> ${next}`);
    }
    return next;
  }
}

