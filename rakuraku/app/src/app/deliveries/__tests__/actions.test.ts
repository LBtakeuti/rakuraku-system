import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type MockResponse } from "@/test-utils/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`__REDIRECT__:${path}`);
  }),
}));
vi.mock("@/lib/utils/numbering", () => ({
  nextSalesInvoiceNumber: vi.fn(async () => "N00000001"),
}));

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { nextSalesInvoiceNumber } from "@/lib/utils/numbering";
import { confirmDelivery } from "../actions";

const mockedCreate = vi.mocked(createClient);
const mockedRedirect = vi.mocked(redirect);
const mockedNextInv = vi.mocked(nextSalesInvoiceNumber);

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const ORDER_ID_2 = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  mockedCreate.mockReset();
  mockedRedirect.mockClear();
  mockedNextInv.mockClear();
  mockedNextInv.mockResolvedValue("N00000001");
});

function makeFormData(payload: unknown): FormData {
  const fd = new FormData();
  fd.set("payload", JSON.stringify(payload));
  return fd;
}

describe("confirmDelivery（バリデーション）", () => {
  it("payload が無いと formError を返す", async () => {
    const r = await confirmDelivery(null, new FormData());
    expect(r).toEqual({
      success: false,
      fieldErrors: {},
      formError: "送信データが壊れています",
    });
  });

  it("payload が不正 JSON だと formError を返す", async () => {
    const fd = new FormData();
    fd.set("payload", "{invalid}");
    const r = await confirmDelivery(null, fd);
    expect(r).toEqual({
      success: false,
      fieldErrors: {},
      formError: "送信データの形式が不正です",
    });
  });

  it("orderIds が空だと fieldError を返す", async () => {
    const r = await confirmDelivery(
      null,
      makeFormData({ orderIds: [], deliveryDate: "2026-05-22" })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(Object.keys(r.fieldErrors).length).toBeGreaterThan(0);
    }
  });
});

describe("confirmDelivery（ハッピーパス：単一受注 + 引当 1 件）", () => {
  it("invoice + line + product_stock 減算 + stock_movement(out/deallocate) + status='fulfilled' が実行される", async () => {
    const sb = createSupabaseMock({
      sales_order: [
        {
          data: {
            id: ORDER_ID,
            order_no: "800000001",
            customer_code: "000001",
            delivery_address_id: null,
            status: "pending",
            staff_id: null,
          },
        } as MockResponse,
      ],
      sales_order_line: {
        data: [
          {
            id: "sol-1",
            line_no: 1,
            product_code: "00000001",
            product_name_snapshot: "A商品",
            quantity: 3,
            unit_price: "1000",
            tax_rate: "0.1",
            amount: "3000",
            fulfilled_quantity: 0,
            order_type: "stock",
          },
        ],
      },
      sales_invoice: { data: { id: "inv-1" } },
      sales_invoice_line: { data: { id: "invl-1" } },
      sales_order_line_allocation: {
        data: [
          {
            id: "alloc-1",
            sales_order_line_id: "sol-1",
            product_stock_id: "ls-1",
            quantity: 3,
          },
        ],
      },
      product_stock: { data: { id: "ls-1", quantity_on_hand: 10, quantity_allocated: 3 } },
      stock_movement: [
        { data: { id: "mv-out-1" } } as MockResponse,
        { data: { id: "mv-de-1" } } as MockResponse,
      ],
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      orderIds: [ORDER_ID],
      deliveryDate: "2026-05-22",
    };
    await expect(confirmDelivery(null, makeFormData(payload))).rejects.toThrow(
      /__REDIRECT__:\/sales\?invoiced=1&failed=0/
    );

    // sales_invoice INSERT の集計値
    const invoiceInserts = sb._calls.insert.filter(
      (c) => c.table === "sales_invoice"
    );
    expect(invoiceInserts).toHaveLength(1);
    const invPayload = invoiceInserts[0].payload as Record<string, unknown>;
    expect(invPayload.invoice_no).toBe("N00000001");
    expect(invPayload.invoice_date).toBe("2026-05-22");
    expect(invPayload.source_order_no).toBe("800000001");
    expect(invPayload.subtotal).toBe(3000);
    expect(invPayload.tax_amount).toBe(300); // 3000 * 0.1
    expect(invPayload.total_amount).toBe(3300);
    expect(invPayload.billing_status).toBe("unbilled");

    // 明細複製
    expect(
      sb._calls.insert.filter((c) => c.table === "sales_invoice_line")
    ).toHaveLength(1);

    // product_stock の UPDATE: on_hand 10-3=7, allocated 3-3=0
    const stockUpdates = sb._calls.update.filter(
      (c) => c.table === "product_stock"
    );
    expect(stockUpdates).toHaveLength(1);
    expect(
      (stockUpdates[0].payload as Record<string, unknown>).quantity_on_hand
    ).toBe(7);
    expect(
      (stockUpdates[0].payload as Record<string, unknown>).quantity_allocated
    ).toBe(0);

    // stock_movement INSERT: out と deallocate の 2 回
    const mvInserts = sb._calls.insert.filter(
      (c) => c.table === "stock_movement"
    );
    expect(mvInserts).toHaveLength(2);
    expect(
      (mvInserts[0].payload as Record<string, unknown>).movement_type
    ).toBe("out");
    expect(
      (mvInserts[1].payload as Record<string, unknown>).movement_type
    ).toBe("deallocate");

    // sales_order_line.fulfilled_quantity UPDATE
    const solUpdates = sb._calls.update.filter(
      (c) => c.table === "sales_order_line"
    );
    expect(solUpdates).toHaveLength(1);
    expect(
      (solUpdates[0].payload as Record<string, unknown>).fulfilled_quantity
    ).toBe(3);

    // sales_order status='fulfilled'
    const soUpdates = sb._calls.update.filter(
      (c) => c.table === "sales_order"
    );
    expect(soUpdates).toHaveLength(1);
    expect((soUpdates[0].payload as Record<string, unknown>).status).toBe(
      "fulfilled"
    );

    expect(mockedRedirect).toHaveBeenCalledWith("/sales?invoiced=1&failed=0");
  });

  it("引当が無い受注（order_at_sale/manual_order のみ）：在庫操作はスキップ、status='fulfilled' まで進む", async () => {
    const sb = createSupabaseMock({
      sales_order: {
        data: {
          id: ORDER_ID,
          order_no: "800000001",
          customer_code: "000001",
          delivery_address_id: null,
          status: "pending",
          staff_id: null,
        },
      },
      sales_order_line: {
        data: [
          {
            id: "sol-1",
            line_no: 1,
            product_code: "00000001",
            product_name_snapshot: "A",
            quantity: 5,
            unit_price: "200",
            tax_rate: "0.1",
            amount: "1000",
            fulfilled_quantity: 0,
            order_type: "manual_order",
          },
        ],
      },
      sales_invoice: { data: { id: "inv-1" } },
      sales_invoice_line: { data: { id: "invl-1" } },
      sales_order_line_allocation: { data: [] },
    });
    mockedCreate.mockResolvedValue(sb as never);

    await expect(
      confirmDelivery(
        null,
        makeFormData({ orderIds: [ORDER_ID], deliveryDate: "2026-05-22" })
      )
    ).rejects.toThrow(/__REDIRECT__/);

    // 在庫テーブルへの insert/update は発生しない
    expect(
      sb._calls.insert.some((c) => c.table === "stock_movement")
    ).toBe(false);
    expect(
      sb._calls.update.some((c) => c.table === "product_stock")
    ).toBe(false);
    // 受注ステータスは fulfilled に
    expect(
      sb._calls.update.find((c) => c.table === "sales_order")
    ).toBeDefined();
  });
});

describe("confirmDelivery（補償処理 / rollback）", () => {
  it("在庫不足だと当該受注は補償でロールバックされ failedOrders に積まれる（他に成功受注がなければ formError）", async () => {
    const sb = createSupabaseMock({
      sales_order: {
        data: {
          id: ORDER_ID,
          order_no: "800000001",
          customer_code: "000001",
          delivery_address_id: null,
          status: "pending",
          staff_id: null,
        },
      },
      sales_order_line: {
        data: [
          {
            id: "sol-1",
            line_no: 1,
            product_code: "00000001",
            product_name_snapshot: "A",
            quantity: 100,
            unit_price: "10",
            tax_rate: "0.1",
            amount: "1000",
            fulfilled_quantity: 0,
            order_type: "stock",
          },
        ],
      },
      sales_invoice: { data: { id: "inv-1" } },
      sales_invoice_line: { data: { id: "invl-1" } },
      sales_order_line_allocation: {
        data: [
          {
            id: "alloc-1",
            sales_order_line_id: "sol-1",
            product_stock_id: "ls-1",
            quantity: 50, // 在庫より多い
          },
        ],
      },
      // 在庫: quantity_on_hand=10 のみ → 50 引けず error
      product_stock: { data: { id: "ls-1", quantity_on_hand: 10, quantity_allocated: 10 } },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const result = await confirmDelivery(
      null,
      makeFormData({ orderIds: [ORDER_ID], deliveryDate: "2026-05-22" })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.formError).toMatch(/すべての受注で納品処理に失敗しました/);
      expect(result.formError).toMatch(/在庫不足/);
    }

    // 補償処理：sales_invoice と sales_invoice_line が delete される
    const deletes = sb._calls.delete.map((c) => c.table);
    expect(deletes).toContain("sales_invoice");
    expect(deletes).toContain("sales_invoice_line");

    // redirect は呼ばれない
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it("複数受注で 1 件成功 / 1 件失敗：成功分のみ commit、失敗分は補償で巻き戻し、redirect には到達", async () => {
    // どの受注を読むかで戻り値を切り替える簡易な仕掛けが必要だが、ここでは
    //「sales_order」の maybeSingle を 2 回連続で読まれる想定で配列にする。
    const sb = createSupabaseMock({
      sales_order: [
        // 1 件目: 成功する受注
        {
          data: {
            id: ORDER_ID,
            order_no: "800000001",
            customer_code: "000001",
            delivery_address_id: null,
            status: "pending",
            staff_id: null,
          },
        } as MockResponse,
        // 2 件目: 在庫不足で失敗する受注
        {
          data: {
            id: ORDER_ID_2,
            order_no: "800000002",
            customer_code: "000002",
            delivery_address_id: null,
            status: "pending",
            staff_id: null,
          },
        } as MockResponse,
      ],
      sales_order_line: [
        // 1 件目: 引当なし（manual_order）でステータス更新まで成功
        {
          data: [
            {
              id: "sol-1",
              line_no: 1,
              product_code: "00000001",
              product_name_snapshot: "A",
              quantity: 1,
              unit_price: "100",
              tax_rate: "0.1",
              amount: "100",
              fulfilled_quantity: 0,
              order_type: "manual_order",
            },
          ],
        } as MockResponse,
        // 2 件目: stock 引当
        {
          data: [
            {
              id: "sol-2",
              line_no: 1,
              product_code: "00000002",
              product_name_snapshot: "B",
              quantity: 50,
              unit_price: "100",
              tax_rate: "0.1",
              amount: "5000",
              fulfilled_quantity: 0,
              order_type: "stock",
            },
          ],
        } as MockResponse,
      ],
      sales_invoice: [
        { data: { id: "inv-1" } } as MockResponse,
        { data: { id: "inv-2" } } as MockResponse,
      ],
      sales_invoice_line: [
        { data: { id: "invl-1" } } as MockResponse,
        { data: { id: "invl-2" } } as MockResponse,
      ],
      sales_order_line_allocation: [
        // 1 件目: 引当なし
        { data: [] } as MockResponse,
        // 2 件目: 在庫不足になる allocation
        {
          data: [
            {
              id: "alloc-1",
              sales_order_line_id: "sol-2",
              product_stock_id: "ls-2",
              quantity: 50,
            },
          ],
        } as MockResponse,
      ],
      product_stock: { data: { id: "ls-2", quantity_on_hand: 5, quantity_allocated: 5 } },
    });
    mockedCreate.mockResolvedValue(sb as never);

    mockedNextInv.mockReset();
    mockedNextInv.mockResolvedValueOnce("N00000001");
    mockedNextInv.mockResolvedValueOnce("N00000002");

    await expect(
      confirmDelivery(
        null,
        makeFormData({
          orderIds: [ORDER_ID, ORDER_ID_2],
          deliveryDate: "2026-05-22",
        })
      )
    ).rejects.toThrow(/__REDIRECT__:\/sales\?invoiced=1&failed=1/);

    // 1 件目は invoice 作成成功 → そのまま残る。2 件目は invoice 作成後に在庫不足で補償（delete）
    const invDeletes = sb._calls.delete.filter(
      (c) => c.table === "sales_invoice"
    );
    expect(invDeletes).toHaveLength(1);

    // 採番は 2 回呼ばれる
    expect(mockedNextInv).toHaveBeenCalledTimes(2);
  });
});
