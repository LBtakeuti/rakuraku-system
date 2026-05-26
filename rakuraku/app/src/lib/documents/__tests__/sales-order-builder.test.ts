import { describe, it, expect } from "vitest";
import { buildSalesOrderDocument } from "@/lib/documents/builders/sales-order-builder";
import type { SalesOrderBuilderInput } from "@/lib/documents/builders/sales-order-builder";

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

const baseInput: SalesOrderBuilderInput = {
  company: baseCompany,
  salesOrder: {
    orderNo: "SO-001",
    orderDate: "2026-05-01",
    subtotal: 10000,
    taxAmount: 1000,
    totalAmount: 11000,
    note: null,
  },
  customer: {
    customerCode: "C001",
    name: "顧客A",
    postalCode: "150-0001",
    address: "東京都渋谷区1-1",
    phone: "03-9999-9999",
  },
  deliveryAddress: null,
  lines: [
    {
      lineNo: 1,
      productCode: "P001",
      productName: "商品A",
      janCode: null,
      unitsPerCase: 6,
      quantity: 12,
      unitPrice: 500,
      taxRate: 0.1,
      amount: 6000,
      linkedPurchaseOrderNo: "PO-001",
      note: null,
    },
  ],
};

describe("buildSalesOrderDocument", () => {
  it("入力データをそのままマッピングする", () => {
    const result = buildSalesOrderDocument(baseInput);

    expect(result.orderNo).toBe("SO-001");
    expect(result.orderDate).toBe("2026-05-01");
    expect(result.subtotal).toBe(10000);
    expect(result.taxAmount).toBe(1000);
    expect(result.totalAmount).toBe(11000);
    expect(result.note).toBeNull();
    expect(result.company).toEqual(baseCompany);
    expect(result.customer).toEqual(baseInput.customer);
  });

  it("caseCount = quantity / unitsPerCase（切り捨て）を計算する", () => {
    const result = buildSalesOrderDocument(baseInput);
    // 12 / 6 = 2
    expect(result.lines[0].caseCount).toBe(2);
  });

  it("割り切れない場合は切り捨てになる", () => {
    const input: SalesOrderBuilderInput = {
      ...baseInput,
      lines: [{ ...baseInput.lines[0], quantity: 13, unitsPerCase: 6 }],
    };
    const result = buildSalesOrderDocument(input);
    // 13 / 6 = 2.16... → 2
    expect(result.lines[0].caseCount).toBe(2);
  });

  it("unitsPerCase が 0 のとき caseCount は 0 になる", () => {
    const input: SalesOrderBuilderInput = {
      ...baseInput,
      lines: [{ ...baseInput.lines[0], unitsPerCase: 0, quantity: 10 }],
    };
    const result = buildSalesOrderDocument(input);
    expect(result.lines[0].caseCount).toBe(0);
  });

  it("linkedPurchaseOrderNo が付与される", () => {
    const result = buildSalesOrderDocument(baseInput);
    expect(result.lines[0].linkedPurchaseOrderNo).toBe("PO-001");
  });

  it("linkedPurchaseOrderNo が null のとき null のまま返す", () => {
    const input: SalesOrderBuilderInput = {
      ...baseInput,
      lines: [{ ...baseInput.lines[0], linkedPurchaseOrderNo: null }],
    };
    const result = buildSalesOrderDocument(input);
    expect(result.lines[0].linkedPurchaseOrderNo).toBeNull();
  });

  it("deliveryAddress がある場合、そのまま返す", () => {
    const delivery = {
      name: "配送先A",
      postalCode: "160-0001",
      address: "東京都新宿区1-1",
      phone: "03-8888-8888",
    };
    const input: SalesOrderBuilderInput = {
      ...baseInput,
      deliveryAddress: delivery,
    };
    const result = buildSalesOrderDocument(input);
    expect(result.deliveryAddress).toEqual(delivery);
  });

  it("deliveryAddress が null のとき null のまま返す", () => {
    const result = buildSalesOrderDocument(baseInput);
    expect(result.deliveryAddress).toBeNull();
  });

  it("明細が空配列のとき lines は空のまま返す", () => {
    const input: SalesOrderBuilderInput = { ...baseInput, lines: [] };
    const result = buildSalesOrderDocument(input);
    expect(result.lines).toEqual([]);
  });
});
