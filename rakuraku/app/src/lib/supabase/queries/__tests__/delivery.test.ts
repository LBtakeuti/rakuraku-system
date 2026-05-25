import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSupabaseMock } from "@/test-utils/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { listDeliverableOrders } from "../delivery";

const mockedCreate = vi.mocked(createClient);

beforeEach(() => {
  mockedCreate.mockReset();
  // 基準日: 2026-05-22（金曜日）
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 4, 22, 9, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("listDeliverableOrders", () => {
  it("status='pending'/'partial' の注文を返し、urgency が delivery_date から計算される", async () => {
    const sb = createSupabaseMock({
      sales_order: {
        data: [
          {
            id: "so-1",
            order_no: "800000001",
            customer_code: "000001",
            order_date: "2026-05-20",
            delivery_date: "2026-05-22", // today
            total_amount: "1100",
            customer: { customer_code: "000001", name: "A社" },
          },
          {
            id: "so-2",
            order_no: "800000002",
            customer_code: "000002",
            order_date: "2026-05-21",
            delivery_date: "2026-05-23", // tomorrow
            total_amount: "2200",
            customer: { customer_code: "000002", name: "B社" },
          },
          {
            id: "so-3",
            order_no: "800000003",
            customer_code: "000003",
            order_date: "2026-05-10",
            delivery_date: "2026-05-15", // past
            total_amount: 500,
            customer: null,
          },
          {
            id: "so-4",
            order_no: "800000004",
            customer_code: "000004",
            order_date: "2026-05-22",
            delivery_date: "2026-06-15", // future
            total_amount: 800,
            customer: { customer_code: "000004", name: "D社" },
          },
        ],
      },
      sales_order_line: {
        data: [
          { sales_order_id: "so-1" },
          { sales_order_id: "so-1" },
          { sales_order_id: "so-2" },
          { sales_order_id: "so-3" },
        ],
      },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await listDeliverableOrders();
    expect(r).toHaveLength(4);

    const map = Object.fromEntries(r.map((o) => [o.orderNo, o]));
    expect(map["800000001"]).toMatchObject({
      urgency: "today",
      customerName: "A社",
      totalAmount: 1100,
      lineCount: 2,
    });
    expect(map["800000002"].urgency).toBe("tomorrow");
    expect(map["800000003"]).toMatchObject({
      urgency: "past",
      customerName: "000003", // customer null → コードにフォールバック
      lineCount: 1,
    });
    expect(map["800000004"].urgency).toBe("future");
    // line が無い注文の lineCount は 0
    expect(map["800000004"].lineCount).toBe(0);
  });

  it("注文ゼロ件のときは line クエリを発行せず空配列", async () => {
    const sb = createSupabaseMock({
      sales_order: { data: [] },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await listDeliverableOrders();
    expect(r).toEqual([]);
    expect(sb._calls.from.map((c) => c.table)).toEqual(["sales_order"]);
  });

  it("range='today'/'this_week'/'all' のフィルタ呼び出しがエラーなく完了する", async () => {
    const sb = createSupabaseMock({
      sales_order: { data: [] },
    });
    mockedCreate.mockResolvedValue(sb as never);

    for (const range of ["today", "this_week", "all"] as const) {
      const r = await listDeliverableOrders({ range });
      expect(r).toEqual([]);
    }
  });

  it("customer リレーション欠落時は customerName が customer_code にフォールバック", async () => {
    const sb = createSupabaseMock({
      sales_order: {
        data: [
          {
            id: "so-1",
            order_no: "800000001",
            customer_code: "000099",
            order_date: "2026-05-20",
            delivery_date: "2026-05-22",
            total_amount: 0,
            customer: null,
          },
        ],
      },
      sales_order_line: { data: [] },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await listDeliverableOrders();
    expect(r[0].customerName).toBe("000099");
  });
});
