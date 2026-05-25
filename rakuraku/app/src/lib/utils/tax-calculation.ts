import type { InvoiceTaxType, TaxRounding } from "@/types/customer";

export type TaxableLine = {
  amount: number; // 税抜金額（円・整数）
  taxRate: number; // 0.1 or 0.08
};

export type TaxableVoucher = {
  lines: TaxableLine[]; // 同一伝票内の明細
};

export function applyRounding(value: number, rounding: TaxRounding): number {
  if (rounding === "floor") return Math.floor(value);
  if (rounding === "ceil") return Math.ceil(value);
  return Math.round(value);
}

/**
 * 税額を計算する。
 * - per_line: 各明細単位で税額計算 → 端数処理 → 合算
 * - per_voucher: 伝票単位で税率別に小計合算 → 税額計算 → 端数処理 → 合算
 * - per_invoice: 請求書単位で税率別に小計合算 → 税額計算 → 端数処理 → 合算
 *
 * 戻り値は税抜小計と税額。
 */
export function calculateTax(
  vouchers: TaxableVoucher[],
  invoiceTaxType: InvoiceTaxType,
  rounding: TaxRounding
): { subtotal: number; taxAmount: number } {
  let subtotal = 0;
  let taxAmount = 0;

  if (invoiceTaxType === "per_line") {
    for (const v of vouchers) {
      for (const l of v.lines) {
        subtotal += l.amount;
        taxAmount += applyRounding(l.amount * l.taxRate, rounding);
      }
    }
    return { subtotal, taxAmount };
  }

  if (invoiceTaxType === "per_voucher") {
    for (const v of vouchers) {
      const subByRate = new Map<number, number>();
      for (const l of v.lines) {
        subtotal += l.amount;
        subByRate.set(l.taxRate, (subByRate.get(l.taxRate) ?? 0) + l.amount);
      }
      for (const [rate, sub] of subByRate.entries()) {
        taxAmount += applyRounding(sub * rate, rounding);
      }
    }
    return { subtotal, taxAmount };
  }

  // per_invoice：全伝票を税率別にまとめて 1 回だけ端数処理
  const subByRate = new Map<number, number>();
  for (const v of vouchers) {
    for (const l of v.lines) {
      subtotal += l.amount;
      subByRate.set(l.taxRate, (subByRate.get(l.taxRate) ?? 0) + l.amount);
    }
  }
  for (const [rate, sub] of subByRate.entries()) {
    taxAmount += applyRounding(sub * rate, rounding);
  }
  return { subtotal, taxAmount };
}
