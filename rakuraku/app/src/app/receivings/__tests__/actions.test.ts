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

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { confirmReceiving } from "../actions";

const mockedCreate = vi.mocked(createClient);
const mockedRedirect = vi.mocked(redirect);

beforeEach(() => {
  mockedCreate.mockReset();
  mockedRedirect.mockClear();
});

function makeFormData(payload: unknown): FormData {
  const fd = new FormData();
  fd.set("payload", JSON.stringify(payload));
  return fd;
}

const PO_ID = "11111111-1111-4111-8111-111111111111";
const PO_LINE_ID = "22222222-2222-4222-8222-222222222222";

const validBase = {
  purchaseOrderId: PO_ID,
  receivedAt: "2026-05-22",
};

describe("confirmReceiving（バリデーション）", () => {
  it("payload が無いと formError を返す", async () => {
    const r = await confirmReceiving(null, new FormData());
    expect(r).toEqual({
      success: false,
      fieldErrors: {},
      formError: "送信データが壊れています",
    });
  });

  it("payload が不正 JSON だと formError を返す", async () => {
    const fd = new FormData();
    fd.set("payload", "{invalid}");
    const r = await confirmReceiving(null, fd);
    expect(r).toEqual({
      success: false,
      fieldErrors: {},
      formError: "送信データの形式が不正です",
    });
  });

  it("数量ゼロの行しかないと『1行以上で入荷数量を入力してください』エラー", async () => {
    const payload = {
      ...validBase,
      lines: [
        {
          purchaseOrderLineId: PO_LINE_ID,
          productCode: "00000001",
          productName: "A",
          quantity: 0,
          isLotManaged: false,
        },
      ],
    };
    const r = await confirmReceiving(null, makeFormData(payload));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(Object.keys(r.fieldErrors).length).toBeGreaterThan(0);
    }
  });

  it("ロット管理商品で賞味期限が空だと fieldError", async () => {
    const payload = {
      ...validBase,
      lines: [
        {
          purchaseOrderLineId: PO_LINE_ID,
          productCode: "00000001",
          productName: "A",
          quantity: 5,
          lotNo: "L1",
          expiryDate: "",
          isLotManaged: true,
        },
      ],
    };
    const r = await confirmReceiving(null, makeFormData(payload));
    expect(r.success).toBe(false);
  });
});

describe("confirmReceiving（ハッピーパス）", () => {
  it("ロット管理なしの新規在庫を 1 行入荷：product_stock INSERT + stock_movement INSERT + PO line UPDATE + PO status UPDATE", async () => {
    const sb = createSupabaseMock({
      warehouse: { data: { id: "wh-1" } },
      purchase_order: { data: { id: PO_ID, status: "ordered" } },
      // 既存ロット検索: 0 件 → INSERT
      product_stock: [
        { data: null } as MockResponse, // 既存検索
        { data: { id: "stk-1" } } as MockResponse, // INSERT 返却
      ],
      stock_movement: { data: { id: "mv-1" } },
      // poLine select 1回 + 全行 select 1回
      purchase_order_line: [
        { data: { received_quantity: 0 } } as MockResponse, // 行 select
        { data: [{ quantity: 5, received_quantity: 5 }] } as MockResponse, // 全行 select
      ],
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          purchaseOrderLineId: PO_LINE_ID,
          productCode: "00000001",
          productName: "A",
          quantity: 5,
          isLotManaged: false,
        },
      ],
    };

    await expect(
      confirmReceiving(null, makeFormData(payload))
    ).rejects.toThrow(/__REDIRECT__/);

    // product_stock INSERT 1件（既存なし新規）
    const stockInserts = sb._calls.insert.filter(
      (c) => c.table === "product_stock"
    );
    expect(stockInserts).toHaveLength(1);
    const stk = stockInserts[0].payload as Record<string, unknown>;
    expect(stk.product_code).toBe("00000001");
    expect(stk.quantity_on_hand).toBe(5);
    expect(stk.quantity_allocated).toBe(0);
    expect(stk.lot_no).toBeNull();
    expect(stk.expiry_date).toBeNull();
    expect(stk.received_at).toBe("2026-05-22");

    // stock_movement INSERT
    const mvInserts = sb._calls.insert.filter(
      (c) => c.table === "stock_movement"
    );
    expect(mvInserts).toHaveLength(1);
    const mv = mvInserts[0].payload as Record<string, unknown>;
    expect(mv.movement_type).toBe("in");
    expect(mv.quantity).toBe(5);
    expect(mv.reference_type).toBe("purchase_order");
    expect(mv.reference_id).toBe(PO_ID);

    // purchase_order_line.received_quantity UPDATE
    const polUpdates = sb._calls.update.filter(
      (c) => c.table === "purchase_order_line"
    );
    expect(polUpdates).toHaveLength(1);
    expect(
      (polUpdates[0].payload as Record<string, unknown>).received_quantity
    ).toBe(5);

    // purchase_order status UPDATE → 全行 received なので 'received'
    const poUpdates = sb._calls.update.filter(
      (c) => c.table === "purchase_order"
    );
    expect(poUpdates).toHaveLength(1);
    expect((poUpdates[0].payload as Record<string, unknown>).status).toBe(
      "received"
    );

    expect(mockedRedirect).toHaveBeenCalledWith(`/purchase-orders/${PO_ID}`);
  });

  it("ロット管理ありで既存ロットがあれば quantity_on_hand を加算する UPDATE", async () => {
    const sb = createSupabaseMock({
      warehouse: { data: { id: "wh-1" } },
      purchase_order: { data: { id: PO_ID, status: "ordered" } },
      product_stock: { data: { id: "stk-1", quantity_on_hand: 10, received_at: "2026-05-01" } },
      stock_movement: { data: { id: "mv-1" } },
      purchase_order_line: [
        { data: { received_quantity: 0 } } as MockResponse,
        { data: [{ quantity: 7, received_quantity: 7 }] } as MockResponse,
      ],
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          purchaseOrderLineId: PO_LINE_ID,
          productCode: "00000001",
          productName: "A",
          quantity: 7,
          lotNo: "L1",
          expiryDate: "2027-12-31",
          isLotManaged: true,
        },
      ],
    };

    await expect(
      confirmReceiving(null, makeFormData(payload))
    ).rejects.toThrow(/__REDIRECT__/);

    // 既存があるので INSERT は無く、UPDATE で加算
    const stockInserts = sb._calls.insert.filter(
      (c) => c.table === "product_stock"
    );
    expect(stockInserts).toHaveLength(0);

    const stockUpdates = sb._calls.update.filter(
      (c) => c.table === "product_stock"
    );
    expect(stockUpdates).toHaveLength(1);
    expect(
      (stockUpdates[0].payload as Record<string, unknown>).quantity_on_hand
    ).toBe(17);
  });

  it("一部入荷だと purchase_order.status='partial' になる", async () => {
    const sb = createSupabaseMock({
      warehouse: { data: { id: "wh-1" } },
      purchase_order: { data: { id: PO_ID, status: "ordered" } },
      product_stock: [
        { data: null } as MockResponse,
        { data: { id: "stk-1" } } as MockResponse,
      ],
      stock_movement: { data: { id: "mv-1" } },
      purchase_order_line: [
        { data: { received_quantity: 0 } } as MockResponse,
        // 全行 select: 受領 3 / 注文 10 → partial
        { data: [{ quantity: 10, received_quantity: 3 }] } as MockResponse,
      ],
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          purchaseOrderLineId: PO_LINE_ID,
          productCode: "00000001",
          productName: "A",
          quantity: 3,
          isLotManaged: false,
        },
      ],
    };
    await expect(
      confirmReceiving(null, makeFormData(payload))
    ).rejects.toThrow(/__REDIRECT__/);

    const poUpdates = sb._calls.update.filter(
      (c) => c.table === "purchase_order"
    );
    expect((poUpdates[0].payload as Record<string, unknown>).status).toBe(
      "partial"
    );
  });

  it("数量 0 の行はスキップされる（INSERT/UPDATE が走らない）", async () => {
    const sb = createSupabaseMock({
      warehouse: { data: { id: "wh-1" } },
      purchase_order: { data: { id: PO_ID, status: "ordered" } },
      product_stock: [
        { data: null } as MockResponse,
        { data: { id: "stk-1" } } as MockResponse,
      ],
      stock_movement: { data: { id: "mv-1" } },
      purchase_order_line: [
        { data: { received_quantity: 0 } } as MockResponse,
        { data: [{ quantity: 5, received_quantity: 5 }] } as MockResponse,
      ],
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          purchaseOrderLineId: PO_LINE_ID,
          productCode: "00000001",
          productName: "A",
          quantity: 0, // スキップ対象
          isLotManaged: false,
        },
        {
          purchaseOrderLineId: "33333333-3333-4333-8333-333333333333",
          productCode: "00000002",
          productName: "B",
          quantity: 5,
          isLotManaged: false,
        },
      ],
    };
    await expect(
      confirmReceiving(null, makeFormData(payload))
    ).rejects.toThrow(/__REDIRECT__/);

    // 数量 5 の方のみ INSERT
    const stockInserts = sb._calls.insert.filter(
      (c) => c.table === "product_stock"
    );
    expect(stockInserts).toHaveLength(1);
    expect(
      (stockInserts[0].payload as Record<string, unknown>).product_code
    ).toBe("00000002");
  });
});

describe("confirmReceiving（補償処理 / rollback）", () => {
  it("warehouse が見つからないと formError を返す（補償なし、何も INSERT されていない）", async () => {
    const sb = createSupabaseMock({
      warehouse: { data: null },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          purchaseOrderLineId: PO_LINE_ID,
          productCode: "00000001",
          productName: "A",
          quantity: 5,
          isLotManaged: false,
        },
      ],
    };
    const r = await confirmReceiving(null, makeFormData(payload));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.formError).toMatch(/既定の倉庫/);
    }
    expect(sb._calls.delete).toHaveLength(0);
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it("stock_movement INSERT で error が返ると product_stock が補償で削除され、PO line received_quantity も復元される", async () => {
    const sb = createSupabaseMock({
      warehouse: { data: { id: "wh-1" } },
      purchase_order: { data: { id: PO_ID, status: "ordered" } },
      // 新規ロット作成 (既存なし → INSERT 成功)
      product_stock: [
        { data: null } as MockResponse, // 既存検索
        { data: { id: "stk-1" } } as MockResponse, // INSERT 成功
      ],
      // stock_movement INSERT で error
      stock_movement: {
        data: null,
        error: { message: "在庫移動の作成に失敗" },
      },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          purchaseOrderLineId: PO_LINE_ID,
          productCode: "00000001",
          productName: "A",
          quantity: 5,
          isLotManaged: false,
        },
      ],
    };

    const r = await confirmReceiving(null, makeFormData(payload));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.formError).toBe("在庫移動の作成に失敗");
    }

    // 補償処理：作成した在庫を delete
    const stockDeletes = sb._calls.delete.filter(
      (c) => c.table === "product_stock"
    );
    expect(stockDeletes).toHaveLength(1);

    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it("既存ロット UPDATE 後に stock_movement で error が起きると、product_stock が previousQuantity に戻る", async () => {
    const sb = createSupabaseMock({
      warehouse: { data: { id: "wh-1" } },
      purchase_order: { data: { id: PO_ID, status: "ordered" } },
      // 既存ロット見つかる: quantity_on_hand=10, received_at=2026-05-01
      product_stock: {
        data: {
          id: "stk-1",
          quantity_on_hand: 10,
          received_at: "2026-05-01",
        },
      },
      stock_movement: { data: null, error: { message: "在庫移動失敗" } },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          purchaseOrderLineId: PO_LINE_ID,
          productCode: "00000001",
          productName: "A",
          quantity: 7,
          lotNo: "L1",
          expiryDate: "2027-12-31",
          isLotManaged: true,
        },
      ],
    };
    const r = await confirmReceiving(null, makeFormData(payload));
    expect(r.success).toBe(false);

    // product_stock の UPDATE は加算（17）と補償（10 に戻す）の 2 回
    const stockUpdates = sb._calls.update.filter(
      (c) => c.table === "product_stock"
    );
    expect(stockUpdates.length).toBeGreaterThanOrEqual(2);
    const last = stockUpdates.at(-1)!.payload as Record<string, unknown>;
    expect(last.quantity_on_hand).toBe(10);
    expect(last.received_at).toBe("2026-05-01");
  });
});
