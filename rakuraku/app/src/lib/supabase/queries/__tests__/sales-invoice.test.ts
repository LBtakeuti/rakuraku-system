import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSupabaseMock } from "@/test-utils/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  listSalesInvoices,
  getSalesInvoice,
  getSalesSummary,
} from "../sales-invoice";

const mockedCreate = vi.mocked(createClient);

beforeEach(() => {
  mockedCreate.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 4, 22, 12, 0, 0)); // 2026-05-22
});

afterEach(() => {
  vi.useRealTimers();
});

describe("listSalesInvoices（一覧 + periodLabel）", () => {
  it("デフォルト（this_month）で当月ラベル『2026年5月』が返る", async () => {
    const sb = createSupabaseMock({
      sales_invoice: { data: [], count: 0 },
    });
    mockedCreate.mockResolvedValue(sb as never);
    const r = await listSalesInvoices();
    expect(r.periodLabel).toBe("2026年5月");
    expect(r.total).toBe(0);
  });

  it("period='today' で『今日』ラベル", async () => {
    const sb = createSupabaseMock({
      sales_invoice: { data: [], count: 0 },
    });
    mockedCreate.mockResolvedValue(sb as never);
    const r = await listSalesInvoices({ period: "today" });
    expect(r.periodLabel).toBe("今日");
  });

  it("period='last_month' で先月ラベル（2026年4月）", async () => {
    const sb = createSupabaseMock({
      sales_invoice: { data: [], count: 0 },
    });
    mockedCreate.mockResolvedValue(sb as never);
    const r = await listSalesInvoices({ period: "last_month" });
    expect(r.periodLabel).toBe("2026年4月");
  });

  it("period='last_month' を 1 月時点で実行すると前年 12 月になる", async () => {
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0)); // 2026-01-15
    const sb = createSupabaseMock({
      sales_invoice: { data: [], count: 0 },
    });
    mockedCreate.mockResolvedValue(sb as never);
    const r = await listSalesInvoices({ period: "last_month" });
    expect(r.periodLabel).toBe("2025年12月");
  });

  it("period='this_year' で『2026年』ラベル", async () => {
    const sb = createSupabaseMock({
      sales_invoice: { data: [], count: 0 },
    });
    mockedCreate.mockResolvedValue(sb as never);
    const r = await listSalesInvoices({ period: "this_year" });
    expect(r.periodLabel).toBe("2026年");
  });

  it("period='all' で『全期間』ラベル", async () => {
    const sb = createSupabaseMock({
      sales_invoice: { data: [], count: 0 },
    });
    mockedCreate.mockResolvedValue(sb as never);
    const r = await listSalesInvoices({ period: "all" });
    expect(r.periodLabel).toBe("全期間");
  });

  it("行と lineCount が反映される（明細を別クエリで集計）", async () => {
    const sb = createSupabaseMock({
      sales_invoice: {
        data: [
          {
            id: "inv-1",
            invoice_no: "N00000001",
            customer_code: "000001",
            invoice_date: "2026-05-20",
            source_order_no: "800000001",
            subtotal: "1000",
            tax_amount: "100",
            total_amount: "1100",
            billing_status: "unbilled",
            customer: { customer_code: "000001", name: "A社" },
            staff: { id: "u-1", name: "山田" },
          },
        ],
        count: 1,
      },
      sales_invoice_line: {
        data: [
          { sales_invoice_id: "inv-1" },
          { sales_invoice_id: "inv-1" },
          { sales_invoice_id: "inv-1" },
        ],
      },
    });
    mockedCreate.mockResolvedValue(sb as never);
    const r = await listSalesInvoices();
    expect(r.total).toBe(1);
    expect(r.rows[0]).toMatchObject({
      id: "inv-1",
      invoiceNo: "N00000001",
      customerName: "A社",
      subtotal: 1000,
      taxAmount: 100,
      totalAmount: 1100,
      billingStatus: "unbilled",
      staffName: "山田",
      lineCount: 3,
    });
  });

  it("invoice がゼロ件のときは sales_invoice_line を引かない", async () => {
    const sb = createSupabaseMock({
      sales_invoice: { data: [], count: 0 },
    });
    mockedCreate.mockResolvedValue(sb as never);
    await listSalesInvoices();
    expect(
      sb._calls.from.some((c) => c.table === "sales_invoice_line")
    ).toBe(false);
  });
});

describe("getSalesInvoice", () => {
  it("ヘッダ + 明細を返し、tax_rate を 0.1 / 0.08 に narrow する", async () => {
    const sb = createSupabaseMock({
      sales_invoice: {
        data: {
          id: "inv-1",
          invoice_no: "N00000001",
          customer_code: "000001",
          invoice_date: "2026-05-20",
          source_order_no: "800000001",
          subtotal: "5000",
          tax_amount: "440",
          total_amount: "5440",
          billing_status: "unbilled",
          customer: { customer_code: "000001", name: "A社" },
          staff: null,
        },
      },
      sales_invoice_line: {
        data: [
          {
            id: "line-1",
            line_no: 1,
            product_code: "00000001",
            product_name_snapshot: "A商品",
            quantity: 3,
            unit_price: "1000",
            tax_rate: "0.1",
            amount: "3000",
          },
          {
            id: "line-2",
            line_no: 2,
            product_code: "00000002",
            product_name_snapshot: "B商品",
            quantity: 5,
            unit_price: "400",
            tax_rate: 0.08,
            amount: "2000",
          },
        ],
      },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await getSalesInvoice("inv-1");
    expect(r).not.toBeNull();
    expect(r!.invoiceNo).toBe("N00000001");
    expect(r!.lineCount).toBe(2);
    expect(r!.lines).toHaveLength(2);
    expect(r!.lines[0]).toMatchObject({
      productCode: "00000001",
      taxRate: 0.1,
      amount: 3000,
    });
    expect(r!.lines[1].taxRate).toBe(0.08);
  });

  it("ヘッダが見つからないと null", async () => {
    const sb = createSupabaseMock({
      sales_invoice: { data: null },
    });
    mockedCreate.mockResolvedValue(sb as never);
    const r = await getSalesInvoice("not-exist");
    expect(r).toBeNull();
  });
});

describe("getSalesSummary", () => {
  it("totalAmount / invoiceCount / customerCount（重複排除） が集計される", async () => {
    const sb = createSupabaseMock({
      sales_invoice: {
        data: [
          { total_amount: "1000", customer_code: "000001" },
          { total_amount: 2000, customer_code: "000002" },
          { total_amount: "500", customer_code: "000001" }, // 重複
        ],
      },
    });
    mockedCreate.mockResolvedValue(sb as never);
    const r = await getSalesSummary();
    expect(r).toMatchObject({
      totalAmount: 3500,
      invoiceCount: 3,
      customerCount: 2, // 001 / 002
      periodLabel: "2026年5月",
    });
  });

  it("データなしで全カウントゼロ", async () => {
    const sb = createSupabaseMock({
      sales_invoice: { data: [] },
    });
    mockedCreate.mockResolvedValue(sb as never);
    const r = await getSalesSummary();
    expect(r).toMatchObject({
      totalAmount: 0,
      invoiceCount: 0,
      customerCount: 0,
    });
  });
});
