import { describe, it, expect } from "vitest";
import { buildBillingListDocument } from "@/lib/documents/builders/billing-list-builder";
import type { BillingListBuilderInput } from "@/lib/documents/builders/billing-list-builder";
import type { BillingListRow } from "@/lib/documents/types";

const baseCompany = {
  id: 1,
  companyName: "テスト株式会社",
  registrationNo: "T1234567890123",
  postalCode: "100-0001",
  address: "東京都千代田区1-1",
  tel: "03-1234-5678",
  fax: null,
  bankInfo: "○○銀行",
};

function makeRow(overrides: Partial<BillingListRow> = {}): BillingListRow {
  return {
    customerCode: "C001",
    customerName: "顧客A",
    invoiceTaxType: "per_invoice",
    invoiceCount: 2,
    paymentDueDate: "2026-06-30",
    previousBalance: 5000,
    paymentAmount: 3000,
    carryOver: 2000,
    currentSubtotal: 10000,
    currentTax: 1000,
    currentTotal: 11000,
    totalDue: 13000,
    ...overrides,
  };
}

const baseInput: BillingListBuilderInput = {
  company: baseCompany,
  periodFrom: "2026-05-01",
  periodTo: "2026-05-31",
  closingDay: 31,
  issueDate: "2026-06-01",
  rows: [makeRow()],
};

describe("buildBillingListDocument", () => {
  it("入力データをそのままマッピングする", () => {
    const result = buildBillingListDocument(baseInput);

    expect(result.company).toEqual(baseCompany);
    expect(result.periodFrom).toBe("2026-05-01");
    expect(result.periodTo).toBe("2026-05-31");
    expect(result.closingDay).toBe(31);
    expect(result.issueDate).toBe("2026-06-01");
    expect(result.rows).toEqual(baseInput.rows);
  });

  it("rows が1件のとき totals はその行の値と一致する", () => {
    const result = buildBillingListDocument(baseInput);

    expect(result.totals.invoiceCount).toBe(2);
    expect(result.totals.previousBalance).toBe(5000);
    expect(result.totals.paymentAmount).toBe(3000);
    expect(result.totals.carryOver).toBe(2000);
    expect(result.totals.currentSubtotal).toBe(10000);
    expect(result.totals.currentTax).toBe(1000);
    expect(result.totals.currentTotal).toBe(11000);
    expect(result.totals.totalDue).toBe(13000);
  });

  it("rows が複数件のとき totals は各フィールドを合算する", () => {
    const input: BillingListBuilderInput = {
      ...baseInput,
      rows: [
        makeRow({ customerCode: "C001", invoiceCount: 2, previousBalance: 5000, paymentAmount: 3000, carryOver: 2000, currentSubtotal: 10000, currentTax: 1000, currentTotal: 11000, totalDue: 13000 }),
        makeRow({ customerCode: "C002", invoiceCount: 3, previousBalance: 8000, paymentAmount: 8000, carryOver: 0, currentSubtotal: 20000, currentTax: 2000, currentTotal: 22000, totalDue: 22000 }),
      ],
    };
    const result = buildBillingListDocument(input);

    expect(result.totals.invoiceCount).toBe(5);
    expect(result.totals.previousBalance).toBe(13000);
    expect(result.totals.paymentAmount).toBe(11000);
    expect(result.totals.carryOver).toBe(2000);
    expect(result.totals.currentSubtotal).toBe(30000);
    expect(result.totals.currentTax).toBe(3000);
    expect(result.totals.currentTotal).toBe(33000);
    expect(result.totals.totalDue).toBe(35000);
  });

  it("rows が空のとき totals はすべて 0 になる", () => {
    const input: BillingListBuilderInput = { ...baseInput, rows: [] };
    const result = buildBillingListDocument(input);

    expect(result.totals).toEqual({
      invoiceCount: 0,
      previousBalance: 0,
      paymentAmount: 0,
      carryOver: 0,
      currentSubtotal: 0,
      currentTax: 0,
      currentTotal: 0,
      totalDue: 0,
    });
  });

  it("rows の参照が result.rows にそのまま渡される", () => {
    const result = buildBillingListDocument(baseInput);
    expect(result.rows).toBe(baseInput.rows);
  });
});
