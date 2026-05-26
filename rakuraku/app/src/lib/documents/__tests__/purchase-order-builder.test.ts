import { describe, it, expect } from "vitest";
import { buildPurchaseOrderDocument } from "@/lib/documents/builders/purchase-order-builder";
import type { PurchaseOrderBuilderInput } from "@/lib/documents/builders/purchase-order-builder";

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

const baseInput: PurchaseOrderBuilderInput = {
  company: baseCompany,
  purchaseOrder: {
    purchaseOrderNo: "PO-001",
    orderDate: "2026-05-01",
    expectedDeliveryDate: "2026-05-10",
    note: null,
  },
  supplier: {
    supplierCode: "SUP-001",
    name: "仕入先A",
    postalCode: "200-0001",
    address: "神奈川県横浜市1-1",
    phone: "045-111-1111",
  },
  lines: [
    {
      lineNo: 1,
      productCode: "P001",
      productName: "商品A",
      janCode: "4900001234567",
      unitsPerCase: 12,
      quantity: 24,
      unitPrice: 1000,
      taxRate: 0.1,
      amount: 24000,
      note: null,
    },
  ],
};

describe("buildPurchaseOrderDocument", () => {
  it("入力データをそのままマッピングする", () => {
    const result = buildPurchaseOrderDocument(baseInput);

    expect(result.purchaseOrderNo).toBe("PO-001");
    expect(result.orderDate).toBe("2026-05-01");
    expect(result.expectedDeliveryDate).toBe("2026-05-10");
    expect(result.note).toBeNull();
    expect(result.company).toEqual(baseCompany);
    expect(result.supplier).toEqual(baseInput.supplier);
  });

  it("caseCount = quantity / unitsPerCase（切り捨て）を計算する", () => {
    const result = buildPurchaseOrderDocument(baseInput);
    // 24 / 12 = 2
    expect(result.lines[0].caseCount).toBe(2);
  });

  it("割り切れない場合は切り捨てになる", () => {
    const input: PurchaseOrderBuilderInput = {
      ...baseInput,
      lines: [{ ...baseInput.lines[0], quantity: 25, unitsPerCase: 12 }],
    };
    const result = buildPurchaseOrderDocument(input);
    // 25 / 12 = 2.08... → 2
    expect(result.lines[0].caseCount).toBe(2);
  });

  it("unitsPerCase が 0 のとき caseCount は 0 になる", () => {
    const input: PurchaseOrderBuilderInput = {
      ...baseInput,
      lines: [{ ...baseInput.lines[0], unitsPerCase: 0, quantity: 10 }],
    };
    const result = buildPurchaseOrderDocument(input);
    expect(result.lines[0].caseCount).toBe(0);
  });

  it("明細が複数行ある場合、すべての行にcaseCountが付与される", () => {
    const input: PurchaseOrderBuilderInput = {
      ...baseInput,
      lines: [
        { ...baseInput.lines[0], lineNo: 1, quantity: 12, unitsPerCase: 6 },
        { ...baseInput.lines[0], lineNo: 2, quantity: 7, unitsPerCase: 3 },
      ],
    };
    const result = buildPurchaseOrderDocument(input);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].caseCount).toBe(2); // 12 / 6
    expect(result.lines[1].caseCount).toBe(2); // 7 / 3 → 2
  });

  it("expectedDeliveryDate が null のとき null のまま返す", () => {
    const input: PurchaseOrderBuilderInput = {
      ...baseInput,
      purchaseOrder: { ...baseInput.purchaseOrder, expectedDeliveryDate: null },
    };
    const result = buildPurchaseOrderDocument(input);
    expect(result.expectedDeliveryDate).toBeNull();
  });

  it("lines が空配列のとき lines は空のまま返す", () => {
    const input: PurchaseOrderBuilderInput = { ...baseInput, lines: [] };
    const result = buildPurchaseOrderDocument(input);
    expect(result.lines).toEqual([]);
  });
});
