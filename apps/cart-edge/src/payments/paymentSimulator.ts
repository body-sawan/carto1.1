import crypto from "node:crypto";
import type { PaymentState } from "@carto/shared";

export class PaymentSimulator {
  start(amount: number): PaymentState {
    return { status: "WAITING_PAYMENT", amount, updatedAt: new Date().toISOString() };
  }

  succeed(amount: number): PaymentState {
    return {
      status: "PAID",
      amount,
      transactionId: `txn_${crypto.randomBytes(8).toString("hex")}`,
      updatedAt: new Date().toISOString()
    };
  }

  fail(amount: number): PaymentState {
    return { status: "FAILED", amount, updatedAt: new Date().toISOString() };
  }

  cancel(amount: number): PaymentState {
    return { status: "CANCELLED", amount, updatedAt: new Date().toISOString() };
  }
}

