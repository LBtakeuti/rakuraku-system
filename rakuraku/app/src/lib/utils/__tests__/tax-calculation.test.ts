import { describe, it, expect } from "vitest";
import {
  applyRounding,
  calculateTax,
  type TaxableVoucher,
} from "../tax-calculation";

describe("applyRounding", () => {
  it.each([
    [1.4, "floor", 1],
    [1.6, "floor", 1],
    [1.4, "ceil", 2],
    [1.0, "ceil", 1],
    [1.4, "round", 1],
    [1.5, "round", 2], // Math.round の挙動：0.5 は切り上げ
  ] as const)("applyRounding(%s, %s) = %s", (v, mode, want) => {
    expect(applyRounding(v, mode)).toBe(want);
  });
});

describe("calculateTax", () => {
  const VOUCHER_A: TaxableVoucher = {
    lines: [
      { amount: 100, taxRate: 0.1 },
      { amount: 200, taxRate: 0.1 },
      { amount: 300, taxRate: 0.08 },
    ],
  };
  const VOUCHER_B: TaxableVoucher = {
    lines: [
      { amount: 150, taxRate: 0.1 },
      { amount: 50, taxRate: 0.08 },
    ],
  };

  it("per_line + floor：各明細ごとに floor → 合算", () => {
    // 100*0.1=10, 200*0.1=20, 300*0.08=24
    // 150*0.1=15, 50*0.08=4
    const r = calculateTax([VOUCHER_A, VOUCHER_B], "per_line", "floor");
    expect(r.subtotal).toBe(800);
    expect(r.taxAmount).toBe(10 + 20 + 24 + 15 + 4);
  });

  it("per_voucher + floor：伝票ごとに税率別 → floor", () => {
    // VOUCHER_A: 10%小計=300 → 30、8%小計=300 → 24 → 54
    // VOUCHER_B: 10%小計=150 → 15、8%小計=50 → 4 → 19
    const r = calculateTax([VOUCHER_A, VOUCHER_B], "per_voucher", "floor");
    expect(r.subtotal).toBe(800);
    expect(r.taxAmount).toBe(54 + 19);
  });

  it("per_invoice + floor：全伝票を税率別にまとめて 1 回だけ floor", () => {
    // 10%小計=300+150=450 → 45、8%小計=300+50=350 → 28 → 73
    const r = calculateTax([VOUCHER_A, VOUCHER_B], "per_invoice", "floor");
    expect(r.subtotal).toBe(800);
    expect(r.taxAmount).toBe(45 + 28);
  });

  it("per_line + round：四捨五入で集計（小数発生ケース）", () => {
    const v: TaxableVoucher = {
      lines: [
        { amount: 105, taxRate: 0.08 }, // 8.4 → 8
        { amount: 115, taxRate: 0.08 }, // 9.2 → 9
      ],
    };
    const r = calculateTax([v], "per_line", "round");
    expect(r.subtotal).toBe(220);
    expect(r.taxAmount).toBe(8 + 9);
  });

  it("per_line + ceil：切り上げで集計", () => {
    const v: TaxableVoucher = {
      lines: [
        { amount: 101, taxRate: 0.1 }, // 10.1 → 11
      ],
    };
    const r = calculateTax([v], "per_line", "ceil");
    expect(r.subtotal).toBe(101);
    expect(r.taxAmount).toBe(11);
  });

  it("per_voucher と per_invoice で端数の差が出るケース（floor）", () => {
    // 2 伝票それぞれ 1 円端数を産むケースで、per_voucher は 2 円損、per_invoice は合算後 floor で 1 円分のみ
    const v1: TaxableVoucher = {
      lines: [
        { amount: 109, taxRate: 0.08 }, // 8.72
      ],
    };
    const v2: TaxableVoucher = {
      lines: [
        { amount: 119, taxRate: 0.08 }, // 9.52
      ],
    };
    // per_voucher: floor(8.72)=8 + floor(9.52)=9 → 17
    // per_invoice: floor((109+119)*0.08) = floor(18.24) = 18
    expect(calculateTax([v1, v2], "per_voucher", "floor").taxAmount).toBe(17);
    expect(calculateTax([v1, v2], "per_invoice", "floor").taxAmount).toBe(18);
  });

  it("空入力なら subtotal=0, taxAmount=0", () => {
    expect(calculateTax([], "per_line", "floor")).toEqual({
      subtotal: 0,
      taxAmount: 0,
    });
    expect(calculateTax([{ lines: [] }], "per_voucher", "round")).toEqual({
      subtotal: 0,
      taxAmount: 0,
    });
  });
});
