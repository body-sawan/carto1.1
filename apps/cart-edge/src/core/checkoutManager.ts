import type { CartSession } from "@carto/shared";
import type { CartStateMachine } from "./cartStateMachine.js";
import type { PaymentSimulator } from "../payments/paymentSimulator.js";

export class CheckoutManager {
  constructor(
    private readonly stateMachine: CartStateMachine,
    private readonly paymentSimulator: PaymentSimulator
  ) {}

  start(session: CartSession): CartSession {
    if (session.state !== "SHOPPING") throw new Error(`Checkout can only start from SHOPPING, current state is ${session.state}`);
    if (session.cartItems.length === 0) throw new Error("Cannot checkout with an empty cart");
    let state = this.stateMachine.transition(session.state, "CHECKOUT_PENDING");
    state = this.stateMachine.transition(state, "WAITING_PAYMENT");
    return {
      ...session,
      state,
      payment: this.paymentSimulator.start(session.totals.total),
      alerts: [...session.alerts, alert("info", "Checkout started. Waiting for payment confirmation.")],
      updatedAt: new Date().toISOString()
    };
  }

  paymentSuccess(session: CartSession): CartSession {
    if (session.state !== "WAITING_PAYMENT") throw new Error(`Payment success requires WAITING_PAYMENT, current state is ${session.state}`);
    const state = this.stateMachine.transition(session.state, "PAID");
    return {
      ...session,
      state,
      payment: this.paymentSimulator.succeed(session.totals.total),
      alerts: [...session.alerts, alert("success", "Payment approved. Session paid.")],
      updatedAt: new Date().toISOString()
    };
  }

  paymentFailure(session: CartSession): CartSession {
    if (session.state !== "WAITING_PAYMENT") throw new Error("Payment is not pending");
    return {
      ...session,
      state: this.stateMachine.transition(session.state, "PAYMENT_FAILED"),
      payment: this.paymentSimulator.fail(session.totals.total),
      alerts: [...session.alerts, alert("error", "Payment failed. Please try again.")],
      updatedAt: new Date().toISOString()
    };
  }

  cancel(session: CartSession): CartSession {
    if (session.state !== "WAITING_PAYMENT" && session.state !== "CHECKOUT_PENDING") throw new Error("Checkout is not active");
    return {
      ...session,
      state: "SHOPPING",
      payment: this.paymentSimulator.cancel(session.totals.total),
      alerts: [...session.alerts, alert("warning", "Checkout cancelled.")],
      updatedAt: new Date().toISOString()
    };
  }
}

function alert(level: "info" | "warning" | "error" | "success", message: string) {
  return { id: cryptoRandom(), level, message, createdAt: new Date().toISOString() };
}

function cryptoRandom() {
  return `alert_${Math.random().toString(36).slice(2, 10)}`;
}

