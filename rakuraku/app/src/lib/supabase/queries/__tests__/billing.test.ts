import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock } from "@/test-utils/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { aggregateBillingForPeriod } from "../billing";

const mockedCreate = vi.mocked(createClient);

beforeEach(() => {
  mockedCreate.mockReset();
});

describe("aggregateBillingForPeriod", () => {
  it("対象顧客なし → 空配列", async () => {
    const sb = createSupabaseMock({
      customer: { data: [] },
    });
    mockedCreate.mockResolvedValue(sb as never);
    const r = await aggregateBillingForPeriod(31, "2026-05-01", "2026-05-31");
    expect(r).toEqual([]);
  });

  it("1 顧客・per_invoice / floor：請求金額が小計+税で集計され、繰越=前回-入金、due=繰越+今回", async () => {
    const sb = createSupabaseMock({
      customer: {
        data: [
          {
            customer_code: "000001",
            name: "A社",
            invoice_format: "invoice_only",
            closing_day: 31,
            payment_cycle: "翌月末",
            invoice_tax_type: "per_invoice",
            tax_rounding: "floor",
          },
        ],
      },
      sales_invoice: {
        data: [
          { id: "inv-1", customer_code: "000001" },
          { id: "inv-2", customer_code: "000001" },
        ],
      },
      sales_invoice_line: {
        data: [
          // inv-1
          { sales_invoice_id: "inv-1", quantity: 1, unit_price: 100, tax_rate: "0.1", amount: "100" },
          { sales_invoice_id: "inv-1", quantity: 1, unit_price: 200, tax_rate: 0.08, amount: 200 },
          // inv-2
          { sales_invoice_id: "inv-2", quantity: 1, unit_price: 300, tax_rate: 0.1, amount: 300 },
        ],
      },
      billing_statement: {
        data: [
          // 前回請求 (最新のものが prevByCustomer に入る)
          { customer_code: "000001", total_due: "5000", issue_date: "2026-04-30" },
          { customer_code: "000001", total_due: 8000, issue_date: "2026-03-31" }, // 古い → 使われない
        ],
      },
      payment: {
        data: [
          { customer_code: "000001", amount: "3000", received_date: "2026-05-10" },
        ],
      },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await aggregateBillingForPeriod(31, "2026-05-01", "2026-05-31");
    expect(r).toHaveLength(1);
    const row = r[0];
    expect(row.customerCode).toBe("000001");
    expect(row.customerName).toBe("A社");
    expect(row.currentSubtotal).toBe(600); // 100+200+300
    // per_invoice + floor：10%小計=400 → 40、8%小計=200 → 16 → 計 56
    expect(row.currentTax).toBe(56);
    expect(row.currentTotal).toBe(656);
    expect(row.previousBalance).toBe(5000);
    expect(row.paymentAmount).toBe(3000);
    expect(row.carryOver).toBe(2000); // 5000 - 3000
    expect(row.totalDue).toBe(2000 + 656);
    expect(row.invoiceIds.sort()).toEqual(["inv-1", "inv-2"]);
    expect(row.paymentDueDate).toBe("2026-06-30"); // 翌月末
  });

  it("入金 > 前回請求 のとき carryOver は 0 にクランプ", async () => {
    const sb = createSupabaseMock({
      customer: {
        data: [
          {
            customer_code: "000001",
            name: "A社",
            invoice_format: "invoice_only",
            closing_day: 31,
            payment_cycle: null,
            invoice_tax_type: "per_invoice",
            tax_rounding: "round",
          },
        ],
      },
      sales_invoice: {
        data: [{ id: "inv-1", customer_code: "000001" }],
      },
      sales_invoice_line: {
        data: [
          { sales_invoice_id: "inv-1", quantity: 1, unit_price: 100, tax_rate: 0.1, amount: 100 },
        ],
      },
      billing_statement: {
        data: [{ customer_code: "000001", total_due: 1000, issue_date: "2026-04-30" }],
      },
      payment: {
        data: [{ customer_code: "000001", amount: 5000, received_date: "2026-05-10" }],
      },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await aggregateBillingForPeriod(31, "2026-05-01", "2026-05-31");
    expect(r[0].carryOver).toBe(0);
    expect(r[0].totalDue).toBe(0 + r[0].currentTotal);
    expect(r[0].paymentDueDate).toBeNull(); // paymentCycle が null
  });

  it("invoice 0 件の顧客はスキップされる（結果に含まれない）", async () => {
    const sb = createSupabaseMock({
      customer: {
        data: [
          {
            customer_code: "000001",
            name: "A社",
            invoice_format: "invoice_only",
            closing_day: 31,
            payment_cycle: "翌月末",
            invoice_tax_type: "per_line",
            tax_rounding: "floor",
          },
          {
            customer_code: "000002",
            name: "B社",
            invoice_format: "invoice_only",
            closing_day: 31,
            payment_cycle: "翌月末",
            invoice_tax_type: "per_line",
            tax_rounding: "floor",
          },
        ],
      },
      // A社のみ invoice あり
      sales_invoice: {
        data: [{ id: "inv-1", customer_code: "000001" }],
      },
      sales_invoice_line: {
        data: [
          { sales_invoice_id: "inv-1", quantity: 1, unit_price: 100, tax_rate: 0.1, amount: 100 },
        ],
      },
      billing_statement: { data: [] },
      payment: { data: [] },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await aggregateBillingForPeriod(31, "2026-05-01", "2026-05-31");
    expect(r.map((x) => x.customerCode)).toEqual(["000001"]);
  });

  it("invoice ゼロ件のときは sales_invoice_line を引かない", async () => {
    const sb = createSupabaseMock({
      customer: {
        data: [
          {
            customer_code: "000001",
            name: "A",
            invoice_format: "invoice_only",
            closing_day: 31,
            payment_cycle: null,
            invoice_tax_type: "per_invoice",
            tax_rounding: "floor",
          },
        ],
      },
      sales_invoice: { data: [] },
      billing_statement: { data: [] },
      payment: { data: [] },
    });
    mockedCreate.mockResolvedValue(sb as never);

    await aggregateBillingForPeriod(31, "2026-05-01", "2026-05-31");
    expect(
      sb._calls.from.some((c) => c.table === "sales_invoice_line")
    ).toBe(false);
  });

  it("結果が customerCode でソートされる", async () => {
    const sb = createSupabaseMock({
      customer: {
        data: [
          {
            customer_code: "000002",
            name: "B",
            invoice_format: "invoice_only",
            closing_day: 31,
            payment_cycle: null,
            invoice_tax_type: "per_invoice",
            tax_rounding: "floor",
          },
          {
            customer_code: "000001",
            name: "A",
            invoice_format: "invoice_only",
            closing_day: 31,
            payment_cycle: null,
            invoice_tax_type: "per_invoice",
            tax_rounding: "floor",
          },
        ],
      },
      sales_invoice: {
        data: [
          { id: "i1", customer_code: "000001" },
          { id: "i2", customer_code: "000002" },
        ],
      },
      sales_invoice_line: {
        data: [
          { sales_invoice_id: "i1", quantity: 1, unit_price: 100, tax_rate: 0.1, amount: 100 },
          { sales_invoice_id: "i2", quantity: 1, unit_price: 100, tax_rate: 0.1, amount: 100 },
        ],
      },
      billing_statement: { data: [] },
      payment: { data: [] },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await aggregateBillingForPeriod(31, "2026-05-01", "2026-05-31");
    expect(r.map((x) => x.customerCode)).toEqual(["000001", "000002"]);
  });
});
