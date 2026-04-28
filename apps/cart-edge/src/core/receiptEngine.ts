import crypto from "node:crypto";
import type { ProductCatalog } from "../products/productCatalog.js";
import type { ReceiptLine, Totals } from "@carto/shared";

export class ReceiptEngine {
  private lastScan = new Map<string, number>();
  private readonly debounceMs = 850;
  private readonly taxRate = 0.14;

  constructor(private readonly catalog: ProductCatalog) {}

  addItem(lines: ReceiptLine[], input: { barcode?: string; productId?: string }): ReceiptLine[] {
    const product = input.barcode ? this.catalog.findByBarcode(input.barcode) : this.catalog.findByProductId(input.productId ?? "");
    if (!product) throw new Error("Unknown barcode/productId");
    this.guardDuplicate(product.id);

    const existing = lines.find((line) => line.productId === product.id && line.unitPrice === product.price);
    if (existing) {
      return lines.map((line) => line.lineId === existing.lineId
        ? { ...line, quantity: line.quantity + 1, lineTotal: roundMoney((line.quantity + 1) * line.unitPrice) }
        : line);
    }

    return [...lines, {
      lineId: crypto.randomUUID(),
      productId: product.id,
      barcode: product.barcode,
      name: product.name,
      unitPrice: product.price,
      quantity: 1,
      lineTotal: product.price,
      addedAt: new Date().toISOString()
    }];
  }

  removeItem(lines: ReceiptLine[], productId: string): ReceiptLine[] {
    const line = [...lines].reverse().find((line) => line.productId === productId);
    if (!line) throw new Error(`Product is not in cart: ${productId}`);
    if (line.quantity <= 1) return lines.filter((current) => current.lineId !== line.lineId);
    return lines.map((current) => current.lineId === line.lineId
      ? { ...current, quantity: current.quantity - 1, lineTotal: roundMoney((current.quantity - 1) * current.unitPrice) }
      : current);
  }

  calculateTotals(lines: ReceiptLine[]): Totals {
    const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
    const discount = subtotal >= 500 ? roundMoney(subtotal * 0.05) : 0;
    const tax = roundMoney((subtotal - discount) * this.taxRate);
    return { subtotal, discount, tax, total: roundMoney(subtotal - discount + tax) };
  }

  quantitiesByProduct(lines: ReceiptLine[]) {
    const quantities = new Map<string, number>();
    for (const line of lines) quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
    return quantities;
  }

  private guardDuplicate(productId: string) {
    const now = Date.now();
    const last = this.lastScan.get(productId) ?? 0;
    if (now - last < this.debounceMs) throw new Error("Duplicate scan ignored by debounce window");
    this.lastScan.set(productId, now);
  }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

