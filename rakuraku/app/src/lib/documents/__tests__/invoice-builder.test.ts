import { describe, it, expect } from "vitest";
import { buildInvoiceDocument } from "@/lib/documents/builders/invoice-builder";
import type { InvoiceBuilderInput } from "@/lib/documents/builders/invoice-builder";

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

function makeInput(overrides: Partial<InvoiceBuilderInput> = {}): InvoiceBuilderInput {
  return {
    company: baseCompany,
    statement: {
      statementNo: "ST-001",
      periodFrom: "2026-05-01",
      periodTo: "2026-05-31",
      issueDate: "2026-06-01",
      dueDate: "2026-06-30",
      previousBalance: 10000,
      currentAmount: 5000,
      totalDue: 15000,
    },
    customer: {
      customerCode: "C001",
      name: "顧客A",
      postalCode: "150-0001",
      address: "東京都渋谷区1-1",
      invoiceTaxType: "per_invoice",
      taxRounding: "floor",
    },
    paymentAmount: 10000,
    invoices: [
      {
        invoiceNo: "INV-001",
        invoiceDate: "2026-05-15",
        deliveryNote: null,
        lines: [
          {
            productCode: "P001",
            productName: "商品A",
            quantity: 10,
            unitPrice: 1000,
            amount: 10000,
            taxRate: 0.1,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("buildInvoiceDocument", () => {
  describe("carryOver", () => {
    it("previousBalance > paymentAmount のとき差額を返す", () => {
      const result = buildInvoiceDocument(makeInput({ paymentAmount: 6000 }));
      // 10000 - 6000 = 4000
      expect(result.carryOver).toBe(4000);
    });

    it("paymentAmount >= previousBalance のとき 0 を返す", () => {
      const result = buildInvoiceDocument(makeInput({ paymentAmount: 10000 }));
      expect(result.carryOver).toBe(0);
    });

    it("paymentAmount が previousBalance を超える場合も 0 を返す", () => {
      const result = buildInvoiceDocument(makeInput({ paymentAmount: 15000 }));
      expect(result.carryOver).toBe(0);
    });
  });

  describe("detailLines の展開", () => {
    it("invoices の lines をフラットに展開する", () => {
      const input = makeInput({
        invoices: [
          {
            invoiceNo: "INV-001",
            invoiceDate: "2026-05-10",
            deliveryNote: "DN-001",
            lines: [
              { productCode: "P001", productName: "商品A", quantity: 2, unitPrice: 500, amount: 1000, taxRate: 0.1 },
              { productCode: "P002", productName: "商品B", quantity: 3, unitPrice: 200, amount: 600, taxRate: 0.08 },
            ],
          },
          {
            invoiceNo: "INV-002",
            invoiceDate: "2026-05-20",
            deliveryNote: null,
            lines: [
              { productCode: "P003", productName: "商品C", quantity: 1, unitPrice: 800, amount: 800, taxRate: 0.1 },
            ],
          },
        ],
      });
      const result = buildInvoiceDocument(input);
      expect(result.detailLines).toHaveLength(3);
      expect(result.detailLines[0].invoiceNo).toBe("INV-001");
      expect(result.detailLines[0].deliveryNote).toBe("DN-001");
      expect(result.detailLines[1].invoiceNo).toBe("INV-001");
      expect(result.detailLines[2].invoiceNo).toBe("INV-002");
      expect(result.detailLines[2].deliveryNote).toBeNull();
    });

    it("invoices が空のとき detailLines は空配列を返す", () => {
      const result = buildInvoiceDocument(makeInput({ invoices: [] }));
      expect(result.detailLines).toEqual([]);
    });
  });

  describe("taxBreakdown (per_invoice)", () => {
    it("10%税率のみの場合: subtotal と taxAmount（切り捨て）を計算する", () => {
      const input = makeInput({
        customer: { ...makeInput().customer, invoiceTaxType: "per_invoice", taxRounding: "floor" },
        invoices: [
          {
            invoiceNo: "INV-001",
            invoiceDate: "2026-05-01",
            deliveryNote: null,
            lines: [
              { productCode: "P001", productName: "商品A", quantity: 1, unitPrice: 100, amount: 100, taxRate: 0.1 },
              { productCode: "P002", productName: "商品B", quantity: 1, unitPrice: 150, amount: 150, taxRate: 0.1 },
            ],
          },
        ],
      });
      const result = buildInvoiceDocument(input);
      const tb10 = result.taxBreakdown.find((b) => b.taxRate === 0.1)!;
      expect(tb10.subtotal).toBe(250);
      // 250 * 0.1 = 25.0 → floor → 25
      expect(tb10.taxAmount).toBe(25);
    });

    it("8%税率のみの場合: subtotal と taxAmount（切り上げ）を計算する", () => {
      const input = makeInput({
        customer: { ...makeInput().customer, invoiceTaxType: "per_invoice", taxRounding: "ceil" },
        invoices: [
          {
            invoiceNo: "INV-001",
            invoiceDate: "2026-05-01",
            deliveryNote: null,
            lines: [
              { productCode: "P001", productName: "商品A", quantity: 1, unitPrice: 100, amount: 100, taxRate: 0.08 },
            ],
          },
        ],
      });
      const result = buildInvoiceDocument(input);
      const tb08 = result.taxBreakdown.find((b) => b.taxRate === 0.08)!;
      expect(tb08.subtotal).toBe(100);
      // 100 * 0.08 = 8.0 → ceil → 8
      expect(tb08.taxAmount).toBe(8);
    });

    it("10%と8%が混在する場合: それぞれ独立して計算する", () => {
      const input = makeInput({
        customer: { ...makeInput().customer, invoiceTaxType: "per_invoice", taxRounding: "round" },
        invoices: [
          {
            invoiceNo: "INV-001",
            invoiceDate: "2026-05-01",
            deliveryNote: null,
            lines: [
              { productCode: "P001", productName: "商品A", quantity: 1, unitPrice: 1000, amount: 1000, taxRate: 0.1 },
              { productCode: "P002", productName: "商品B", quantity: 1, unitPrice: 500, amount: 500, taxRate: 0.08 },
            ],
          },
        ],
      });
      const result = buildInvoiceDocument(input);
      const tb10 = result.taxBreakdown.find((b) => b.taxRate === 0.1)!;
      const tb08 = result.taxBreakdown.find((b) => b.taxRate === 0.08)!;
      expect(tb10.subtotal).toBe(1000);
      expect(tb10.taxAmount).toBe(100); // 1000 * 0.1 = 100
      expect(tb08.subtotal).toBe(500);
      expect(tb08.taxAmount).toBe(40); // 500 * 0.08 = 40
    });

    it("その税率の明細がない場合: subtotal=0, taxAmount=0 を返す", () => {
      const input = makeInput({
        invoices: [
          {
            invoiceNo: "INV-001",
            invoiceDate: "2026-05-01",
            deliveryNote: null,
            lines: [
              { productCode: "P001", productName: "商品A", quantity: 1, unitPrice: 1000, amount: 1000, taxRate: 0.1 },
            ],
          },
        ],
      });
      const result = buildInvoiceDocument(input);
      const tb08 = result.taxBreakdown.find((b) => b.taxRate === 0.08)!;
      expect(tb08.subtotal).toBe(0);
      expect(tb08.taxAmount).toBe(0);
    });
  });

  describe("taxBreakdown (per_line)", () => {
    it("per_line: 各明細ごとに税額を計算して合算する（端数は各行で処理）", () => {
      const input = makeInput({
        customer: { ...makeInput().customer, invoiceTaxType: "per_line", taxRounding: "floor" },
        invoices: [
          {
            invoiceNo: "INV-001",
            invoiceDate: "2026-05-01",
            deliveryNote: null,
            lines: [
              // 333 * 0.1 = 33.3 → floor → 33
              { productCode: "P001", productName: "商品A", quantity: 1, unitPrice: 333, amount: 333, taxRate: 0.1 },
              // 333 * 0.1 = 33.3 → floor → 33
              { productCode: "P002", productName: "商品B", quantity: 1, unitPrice: 333, amount: 333, taxRate: 0.1 },
            ],
          },
        ],
      });
      const result = buildInvoiceDocument(input);
      const tb10 = result.taxBreakdown.find((b) => b.taxRate === 0.1)!;
      expect(tb10.subtotal).toBe(666);
      expect(tb10.taxAmount).toBe(66); // 33 + 33 = 66（per_lineで各行floor）
    });
  });

  describe("taxBreakdown (per_voucher)", () => {
    it("per_voucher: per_invoiceと同様に税率別合計に対して1回端数処理する", () => {
      const input = makeInput({
        customer: { ...makeInput().customer, invoiceTaxType: "per_voucher", taxRounding: "floor" },
        invoices: [
          {
            invoiceNo: "INV-001",
            invoiceDate: "2026-05-01",
            deliveryNote: null,
            lines: [
              { productCode: "P001", productName: "商品A", quantity: 1, unitPrice: 333, amount: 333, taxRate: 0.1 },
              { productCode: "P002", productName: "商品B", quantity: 1, unitPrice: 333, amount: 333, taxRate: 0.1 },
            ],
          },
        ],
      });
      const result = buildInvoiceDocument(input);
      const tb10 = result.taxBreakdown.find((b) => b.taxRate === 0.1)!;
      expect(tb10.subtotal).toBe(666);
      // 666 * 0.1 = 66.6 → floor → 66
      expect(tb10.taxAmount).toBe(66);
    });
  });

  describe("currentTotal と totalDue", () => {
    it("currentTotal = taxBreakdown の subtotal + taxAmount の合計", () => {
      const input = makeInput({
        customer: { ...makeInput().customer, invoiceTaxType: "per_invoice", taxRounding: "floor" },
        invoices: [
          {
            invoiceNo: "INV-001",
            invoiceDate: "2026-05-01",
            deliveryNote: null,
            lines: [
              { productCode: "P001", productName: "商品A", quantity: 1, unitPrice: 1000, amount: 1000, taxRate: 0.1 },
            ],
          },
        ],
      });
      const result = buildInvoiceDocument(input);
      // subtotal=1000, taxAmount=100 → currentTotal=1100
      expect(result.currentTotal).toBe(1100);
    });

    it("totalDue = carryOver + currentTotal", () => {
      const input = makeInput({
        paymentAmount: 5000,
        customer: { ...makeInput().customer, invoiceTaxType: "per_invoice", taxRounding: "floor" },
        invoices: [
          {
            invoiceNo: "INV-001",
            invoiceDate: "2026-05-01",
            deliveryNote: null,
            lines: [
              { productCode: "P001", productName: "商品A", quantity: 1, unitPrice: 1000, amount: 1000, taxRate: 0.1 },
            ],
          },
        ],
        statement: {
          ...makeInput().statement,
          previousBalance: 10000,
        },
      });
      const result = buildInvoiceDocument(input);
      // carryOver = 10000 - 5000 = 5000
      // currentTotal = 1000 + 100 = 1100
      // totalDue = 5000 + 1100 = 6100
      expect(result.carryOver).toBe(5000);
      expect(result.currentTotal).toBe(1100);
      expect(result.totalDue).toBe(6100);
    });
  });

  describe("出力フィールドのマッピング", () => {
    it("customer は invoiceTaxType と taxRounding を含まない形で返す", () => {
      const result = buildInvoiceDocument(makeInput());
      expect(result.customer).toEqual({
        customerCode: "C001",
        name: "顧客A",
        postalCode: "150-0001",
        address: "東京都渋谷区1-1",
      });
      expect(result.customer).not.toHaveProperty("invoiceTaxType");
      expect(result.customer).not.toHaveProperty("taxRounding");
    });

    it("dueDate が null のとき null のまま返す", () => {
      const input = makeInput({
        statement: { ...makeInput().statement, dueDate: null },
      });
      const result = buildInvoiceDocument(input);
      expect(result.dueDate).toBeNull();
    });
  });
});
