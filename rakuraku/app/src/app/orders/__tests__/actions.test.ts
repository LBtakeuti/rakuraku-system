import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type MockResponse } from "@/test-utils/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
// redirect は throw する仕様（Next 公式）。テストでも throw でフロー終了させる。
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`__REDIRECT__:${path}`);
  }),
}));
// 採番は固定値で安定化。
vi.mock("@/lib/utils/numbering", () => ({
  nextSalesOrderNumber: vi.fn(async () => "800000001"),
  nextPurchaseOrderNumber: vi.fn(async () => "P00000001"),
}));
// findFifoLots はテストごとに別実装を入れる。デフォルトは「在庫なし」。
type FifoLot = {
  productStockId: string;
  available: number;
  expiryDate: string | null;
  lotNo: string | null;
};
const findFifoLotsMock = vi.fn<(code: string) => Promise<FifoLot[]>>(
  async () => []
);
vi.mock("@/lib/supabase/queries/sales-order", () => ({
  findFifoLots: (code: string) => findFifoLotsMock(code),
}));

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  nextSalesOrderNumber,
  nextPurchaseOrderNumber,
} from "@/lib/utils/numbering";
import { createSalesOrder } from "../actions";

const mockedCreate = vi.mocked(createClient);
const mockedRedirect = vi.mocked(redirect);
const mockedNextSO = vi.mocked(nextSalesOrderNumber);
const mockedNextPO = vi.mocked(nextPurchaseOrderNumber);

beforeEach(() => {
  mockedCreate.mockReset();
  mockedRedirect.mockClear();
  mockedNextSO.mockClear();
  mockedNextPO.mockClear();
  findFifoLotsMock.mockReset();
  findFifoLotsMock.mockImplementation(async () => []);
});

function makeFormData(payload: unknown): FormData {
  const fd = new FormData();
  fd.set("payload", JSON.stringify(payload));
  return fd;
}

const validBase = {
  customerCode: "000001",
  deliveryAddressId: "",
  orderDate: "2026-05-22",
  deliveryDate: "2026-05-24",
  note: "",
};

describe("createSalesOrder（バリデーション）", () => {
  it("payload が無いと formError を返す", async () => {
    const r = await createSalesOrder(null, new FormData());
    expect(r).toEqual({
      ok: false,
      fieldErrors: {},
      formError: "送信データが壊れています",
    });
  });

  it("payload が不正 JSON だと formError を返す", async () => {
    const fd = new FormData();
    fd.set("payload", "{invalid}");
    const r = await createSalesOrder(null, fd);
    expect(r).toEqual({
      ok: false,
      fieldErrors: {},
      formError: "送信データの形式が不正です",
    });
  });

  it("スキーマ違反は fieldErrors を返す", async () => {
    const r = await createSalesOrder(
      null,
      makeFormData({ ...validBase, customerCode: "", lines: [] })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      // customerCode / lines のどちらかが含まれる
      expect(Object.keys(r.fieldErrors).length).toBeGreaterThan(0);
    }
  });
});

describe("createSalesOrder（集計）", () => {
  it("小計・税・合計が正しい（10%/8% 混在、stock 商品の在庫なし）", async () => {
    // sales_order INSERT → { id } 1回、sales_order_line INSERT → { id } 2行分
    const sb = createSupabaseMock({
      sales_order: { data: { id: "so-1" } },
      sales_order_line: [
        { data: { id: "sol-1" } },
        { data: { id: "sol-2" } },
      ],
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          productCode: "00000001",
          productName: "A",
          quantity: 3,
          unitPrice: 1000,
          taxRate: 0.1,
          orderType: "stock", // 在庫なしで引当 0
        },
        {
          productCode: "00000002",
          productName: "B",
          quantity: 2,
          unitPrice: 500,
          taxRate: 0.08,
          orderType: "manual_order",
        },
      ],
    };

    await expect(createSalesOrder(null, makeFormData(payload))).rejects.toThrow(
      /__REDIRECT__:\/orders\/so-1/
    );

    // sales_order INSERT の payload で集計値を検証
    const orderInsert = sb._calls.insert.find(
      (c) => c.table === "sales_order"
    );
    expect(orderInsert).toBeDefined();
    const p = orderInsert!.payload as Record<string, unknown>;
    expect(p.subtotal).toBe(3000 + 1000); // 4000
    // 税: 3000*0.1=300, 1000*0.08=80 → 380
    expect(p.tax_amount).toBe(380);
    expect(p.total_amount).toBe(4380);
    expect(p.order_no).toBe("800000001");
    expect(p.status).toBe("pending");
    expect(p.customer_code).toBe("000001");

    // 明細 INSERT が 2 行作られる
    const lineInserts = sb._calls.insert.filter(
      (c) => c.table === "sales_order_line"
    );
    expect(lineInserts).toHaveLength(2);
    expect(
      (lineInserts[0].payload as Record<string, unknown>).line_no
    ).toBe(1);
    expect(
      (lineInserts[1].payload as Record<string, unknown>).line_no
    ).toBe(2);

    expect(mockedRedirect).toHaveBeenCalledWith("/orders/so-1");
  });
});

describe("createSalesOrder（FIFO 引当）", () => {
  it("在庫が十分なら 1 ロットで完結（allocation 1件・product_stock 更新・stock_movement 1件）", async () => {
    findFifoLotsMock.mockImplementation(async () => [
      {
        productStockId: "ls-1",
        available: 50,
        expiryDate: "2026-12-31",
        lotNo: "L1",
      },
      {
        productStockId: "ls-2",
        available: 100,
        expiryDate: "2027-06-30",
        lotNo: "L2",
      },
    ]);

    // sales_order INSERT, sales_order_line INSERT, allocation INSERT,
    // product_stock SELECT(single), product_stock UPDATE, stock_movement INSERT
    // FB-RBK-001 補償処理対応で allocation / stock_movement にも .select("id").single() が付くため id を返す。
    const sb = createSupabaseMock({
      sales_order: { data: { id: "so-1" } },
      sales_order_line: { data: { id: "sol-1" } },
      sales_order_line_allocation: { data: { id: "alloc-1" } },
      product_stock: { data: { quantity_allocated: 0 } },
      stock_movement: { data: { id: "mv-1" } },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          productCode: "00000001",
          productName: "A",
          quantity: 30, // 50 で十分
          unitPrice: 100,
          taxRate: 0.1,
          orderType: "stock",
        },
      ],
    };
    await expect(createSalesOrder(null, makeFormData(payload))).rejects.toThrow(
      /__REDIRECT__/
    );

    const allocs = sb._calls.insert.filter(
      (c) => c.table === "sales_order_line_allocation"
    );
    expect(allocs).toHaveLength(1);
    expect((allocs[0].payload as Record<string, unknown>).quantity).toBe(30);
    expect(
      (allocs[0].payload as Record<string, unknown>).product_stock_id
    ).toBe("ls-1");

    const stockMoves = sb._calls.insert.filter(
      (c) => c.table === "stock_movement"
    );
    expect(stockMoves).toHaveLength(1);
    const mv = stockMoves[0].payload as Record<string, unknown>;
    expect(mv.movement_type).toBe("allocate");
    expect(mv.quantity).toBe(30);
    expect(mv.reference_type).toBe("sales_order");
    expect(mv.reference_id).toBe("so-1");

    const stockUpdates = sb._calls.update.filter(
      (c) => c.table === "product_stock"
    );
    expect(stockUpdates).toHaveLength(1);
    expect(
      (stockUpdates[0].payload as Record<string, unknown>).quantity_allocated
    ).toBe(30);
  });

  it("1 ロットで足りないと複数ロットを順次消費（30 = 20 + 10）", async () => {
    findFifoLotsMock.mockImplementation(async () => [
      {
        productStockId: "ls-1",
        available: 20,
        expiryDate: "2026-12-31",
        lotNo: "L1",
      },
      {
        productStockId: "ls-2",
        available: 100,
        expiryDate: "2027-06-30",
        lotNo: "L2",
      },
    ]);

    // allocation を 2 回、product_stock SELECT/UPDATE を 2 回、stock_movement を 2 回
    const sb = createSupabaseMock({
      sales_order: { data: { id: "so-1" } },
      sales_order_line: { data: { id: "sol-1" } },
      sales_order_line_allocation: [
        { data: { id: "alloc-1" } } as MockResponse,
        { data: { id: "alloc-2" } } as MockResponse,
      ],
      product_stock: [
        { data: { quantity_allocated: 0 } } as MockResponse,
        { data: { quantity_allocated: 5 } } as MockResponse,
      ],
      stock_movement: [
        { data: { id: "mv-1" } } as MockResponse,
        { data: { id: "mv-2" } } as MockResponse,
      ],
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          productCode: "00000001",
          productName: "A",
          quantity: 30,
          unitPrice: 100,
          taxRate: 0.1,
          orderType: "stock",
        },
      ],
    };
    await expect(createSalesOrder(null, makeFormData(payload))).rejects.toThrow(
      /__REDIRECT__/
    );

    const allocs = sb._calls.insert.filter(
      (c) => c.table === "sales_order_line_allocation"
    );
    expect(allocs).toHaveLength(2);
    expect((allocs[0].payload as Record<string, unknown>).quantity).toBe(20);
    expect((allocs[1].payload as Record<string, unknown>).quantity).toBe(10);
    expect(
      (allocs[0].payload as Record<string, unknown>).product_stock_id
    ).toBe("ls-1");
    expect(
      (allocs[1].payload as Record<string, unknown>).product_stock_id
    ).toBe("ls-2");

    // 2 回目 update の数量 = 既存 5 + 10 = 15
    const stockUpdates = sb._calls.update.filter(
      (c) => c.table === "product_stock"
    );
    expect(stockUpdates).toHaveLength(2);
    expect(
      (stockUpdates[1].payload as Record<string, unknown>).quantity_allocated
    ).toBe(15);
  });

  it("在庫不足でも処理は止めず、足りた分だけ引き当てる（オーバー引当許容）", async () => {
    findFifoLotsMock.mockImplementation(async () => [
      {
        productStockId: "ls-1",
        available: 5,
        expiryDate: "2026-12-31",
        lotNo: "L1",
      },
    ]);

    const sb = createSupabaseMock({
      sales_order: { data: { id: "so-1" } },
      sales_order_line: { data: { id: "sol-1" } },
      sales_order_line_allocation: { data: { id: "alloc-1" } },
      product_stock: { data: { quantity_allocated: 0 } },
      stock_movement: { data: { id: "mv-1" } },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          productCode: "00000001",
          productName: "A",
          quantity: 30,
          unitPrice: 100,
          taxRate: 0.1,
          orderType: "stock",
        },
      ],
    };
    // redirect まで到達することを期待
    await expect(createSalesOrder(null, makeFormData(payload))).rejects.toThrow(
      /__REDIRECT__/
    );

    const allocs = sb._calls.insert.filter(
      (c) => c.table === "sales_order_line_allocation"
    );
    expect(allocs).toHaveLength(1);
    expect((allocs[0].payload as Record<string, unknown>).quantity).toBe(5);
  });

  it("orderType !== 'stock' の行は引当処理をスキップ", async () => {
    findFifoLotsMock.mockImplementation(async () => [
      {
        productStockId: "ls-1",
        available: 1000,
        expiryDate: null,
        lotNo: null,
      },
    ]);

    const sb = createSupabaseMock({
      sales_order: { data: { id: "so-1" } },
      sales_order_line: { data: { id: "sol-1" } },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          productCode: "00000001",
          productName: "A",
          quantity: 10,
          unitPrice: 100,
          taxRate: 0.1,
          orderType: "manual_order",
        },
      ],
    };
    await expect(createSalesOrder(null, makeFormData(payload))).rejects.toThrow(
      /__REDIRECT__/
    );

    // findFifoLots は呼ばれない
    expect(findFifoLotsMock).not.toHaveBeenCalled();
    expect(
      sb._calls.insert.find(
        (c) => c.table === "sales_order_line_allocation"
      )
    ).toBeUndefined();
  });
});

describe("createSalesOrder（order_at_sale 自動発注）", () => {
  it("仕入先ごとにグルーピングして purchase_order を作成（同一 supplier の 2 商品 → PO 1 件 / PO_line 2 件）", async () => {
    const sb = createSupabaseMock({
      sales_order: { data: { id: "so-1" } },
      sales_order_line: [
        { data: { id: "sol-1" } },
        { data: { id: "sol-2" } },
      ],
      // product テーブル：supplier_code を引く
      product: {
        data: [
          { product_code: "00000001", supplier_code: "SUP-A" },
          { product_code: "00000002", supplier_code: "SUP-A" },
        ],
      },
      purchase_order: { data: { id: "po-1" } },
      purchase_order_line: [
        { data: { id: "pol-1" } } as MockResponse,
        { data: { id: "pol-2" } } as MockResponse,
      ],
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          productCode: "00000001",
          productName: "A",
          quantity: 5,
          unitPrice: 100,
          taxRate: 0.1,
          orderType: "order_at_sale",
        },
        {
          productCode: "00000002",
          productName: "B",
          quantity: 3,
          unitPrice: 200,
          taxRate: 0.08,
          orderType: "order_at_sale",
        },
      ],
    };
    await expect(createSalesOrder(null, makeFormData(payload))).rejects.toThrow(
      /__REDIRECT__/
    );

    const poInserts = sb._calls.insert.filter(
      (c) => c.table === "purchase_order"
    );
    expect(poInserts).toHaveLength(1);
    const po = poInserts[0].payload as Record<string, unknown>;
    expect(po.supplier_code).toBe("SUP-A");
    expect(po.purchase_order_no).toBe("P00000001");
    // 5*100=500, 3*200=600 → 小計 1100
    expect(po.subtotal).toBe(1100);
    // 税: 500*0.1=50, 600*0.08=48 → 98
    expect(po.tax_amount).toBe(98);
    expect(po.total_amount).toBe(1198);
    expect(po.source_sales_order_id).toBe("so-1");

    const poLines = sb._calls.insert.filter(
      (c) => c.table === "purchase_order_line"
    );
    expect(poLines).toHaveLength(2);
    expect(
      (poLines[0].payload as Record<string, unknown>).line_no
    ).toBe(1);
    expect(
      (poLines[1].payload as Record<string, unknown>).line_no
    ).toBe(2);
    expect(mockedNextPO).toHaveBeenCalledTimes(1);
  });

  it("supplier が異なる 2 商品は PO が 2 件作成される", async () => {
    const sb = createSupabaseMock({
      sales_order: { data: { id: "so-1" } },
      sales_order_line: [
        { data: { id: "sol-1" } },
        { data: { id: "sol-2" } },
      ],
      product: {
        data: [
          { product_code: "00000001", supplier_code: "SUP-A" },
          { product_code: "00000002", supplier_code: "SUP-B" },
        ],
      },
      purchase_order: [
        { data: { id: "po-1" } },
        { data: { id: "po-2" } },
      ],
      purchase_order_line: [
        { data: { id: "pol-1" } } as MockResponse,
        { data: { id: "pol-2" } } as MockResponse,
      ],
    });
    mockedCreate.mockResolvedValue(sb as never);

    // 採番は 2 回呼ばれるので別の値を返す
    mockedNextPO.mockImplementationOnce(async () => "P00000010");
    mockedNextPO.mockImplementationOnce(async () => "P00000011");

    const payload = {
      ...validBase,
      lines: [
        {
          productCode: "00000001",
          productName: "A",
          quantity: 1,
          unitPrice: 100,
          taxRate: 0.1,
          orderType: "order_at_sale",
        },
        {
          productCode: "00000002",
          productName: "B",
          quantity: 1,
          unitPrice: 100,
          taxRate: 0.1,
          orderType: "order_at_sale",
        },
      ],
    };
    await expect(createSalesOrder(null, makeFormData(payload))).rejects.toThrow(
      /__REDIRECT__/
    );

    const poInserts = sb._calls.insert.filter(
      (c) => c.table === "purchase_order"
    );
    expect(poInserts).toHaveLength(2);
    const suppliers = poInserts
      .map((p) => (p.payload as Record<string, unknown>).supplier_code)
      .sort();
    expect(suppliers).toEqual(["SUP-A", "SUP-B"]);
  });

  it("supplier_code 未設定の商品はスキップ（PO 作成されず redirect 到達）", async () => {
    const sb = createSupabaseMock({
      sales_order: { data: { id: "so-1" } },
      sales_order_line: { data: { id: "sol-1" } },
      product: {
        data: [{ product_code: "00000001", supplier_code: null }],
      },
      // purchase_order の data は呼ばれない想定
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          productCode: "00000001",
          productName: "A",
          quantity: 5,
          unitPrice: 100,
          taxRate: 0.1,
          orderType: "order_at_sale",
        },
      ],
    };
    await expect(createSalesOrder(null, makeFormData(payload))).rejects.toThrow(
      /__REDIRECT__/
    );

    expect(
      sb._calls.insert.find((c) => c.table === "purchase_order")
    ).toBeUndefined();
    expect(mockedNextPO).not.toHaveBeenCalled();
  });

  it("order_at_sale 行が無いときは purchase_order テーブルに触らない", async () => {
    const sb = createSupabaseMock({
      sales_order: { data: { id: "so-1" } },
      sales_order_line: { data: { id: "sol-1" } },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          productCode: "00000001",
          productName: "A",
          quantity: 5,
          unitPrice: 100,
          taxRate: 0.1,
          orderType: "manual_order",
        },
      ],
    };
    await expect(createSalesOrder(null, makeFormData(payload))).rejects.toThrow(
      /__REDIRECT__/
    );

    expect(sb._calls.from.some((c) => c.table === "purchase_order")).toBe(
      false
    );
    expect(mockedNextPO).not.toHaveBeenCalled();
  });
});

describe("createSalesOrder（採番呼び出し順序）", () => {
  it("受注番号 → 受注ヘッダ INSERT → 明細 INSERT の順で呼ばれる", async () => {
    const sb = createSupabaseMock({
      sales_order: { data: { id: "so-1" } },
      sales_order_line: { data: { id: "sol-1" } },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          productCode: "00000001",
          productName: "A",
          quantity: 1,
          unitPrice: 100,
          taxRate: 0.1,
          orderType: "manual_order",
        },
      ],
    };
    await expect(createSalesOrder(null, makeFormData(payload))).rejects.toThrow(
      /__REDIRECT__/
    );

    expect(mockedNextSO).toHaveBeenCalledTimes(1);
    const inserts = sb._calls.insert.map((c) => c.table);
    expect(inserts[0]).toBe("sales_order");
    expect(inserts[1]).toBe("sales_order_line");
  });
});

describe("createSalesOrder（補償処理 / rollback）", () => {
  it("明細 INSERT で error が返ると sales_order に対して delete が呼ばれ formError が返る", async () => {
    const sb = createSupabaseMock({
      sales_order: { data: { id: "so-1" } },
      // 明細 insert で error を返す
      sales_order_line: { data: null, error: { message: "明細 INSERT 失敗" } },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          productCode: "00000001",
          productName: "A",
          quantity: 1,
          unitPrice: 100,
          taxRate: 0.1,
          orderType: "manual_order",
        },
      ],
    };

    const result = await createSalesOrder(null, makeFormData(payload));
    expect(result).toEqual({
      ok: false,
      fieldErrors: {},
      formError: "明細 INSERT 失敗",
    });

    // sales_order ヘッダは INSERT 済みなので、補償で delete が走る
    const soDeletes = sb._calls.delete.filter((c) => c.table === "sales_order");
    expect(soDeletes).toHaveLength(1);
    // redirect は呼ばれない
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it("引当 INSERT で error が返ると、ヘッダ・明細・先に作った allocation/movement が逆順で delete される", async () => {
    findFifoLotsMock.mockImplementation(async () => [
      {
        productStockId: "ls-1",
        available: 50,
        expiryDate: null,
        lotNo: null,
      },
      {
        productStockId: "ls-2",
        available: 50,
        expiryDate: null,
        lotNo: null,
      },
    ]);

    // 1 回目の allocation insert は成功、2 回目で error
    const sb = createSupabaseMock({
      sales_order: { data: { id: "so-1" } },
      sales_order_line: { data: { id: "sol-1" } },
      sales_order_line_allocation: [
        { data: { id: "alloc-1" } } as MockResponse,
        { data: null, error: { message: "引当 INSERT 失敗" } } as MockResponse,
      ],
      product_stock: { data: { quantity_allocated: 0 } },
      stock_movement: { data: { id: "mv-1" } },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const payload = {
      ...validBase,
      lines: [
        {
          productCode: "00000001",
          productName: "A",
          quantity: 80, // 50 + 30 で 2 ロット消費
          unitPrice: 100,
          taxRate: 0.1,
          orderType: "stock",
        },
      ],
    };

    const result = await createSalesOrder(null, makeFormData(payload));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.formError).toBe("引当 INSERT 失敗");
    }

    // 期待する補償（逆順）:
    //   delete-movement (mv-1) / restore-stock-allocated は update / delete-allocation (alloc-1)
    //   / delete-sales-order-line (sol-1) / delete-sales-order (so-1)
    const deletes = sb._calls.delete.map((c) => c.table);
    expect(deletes).toContain("stock_movement");
    expect(deletes).toContain("sales_order_line_allocation");
    expect(deletes).toContain("sales_order_line");
    expect(deletes).toContain("sales_order");

    // restore-stock-allocated は product_stock を quantity_allocated:0（previousAllocated）に戻す UPDATE
    const restoreUpdates = sb._calls.update.filter(
      (c) => c.table === "product_stock"
    );
    // 1 回目: take 加算 / 2 回目: 補償で 0 に戻す
    expect(restoreUpdates.length).toBeGreaterThanOrEqual(2);
    const last = restoreUpdates.at(-1)!.payload as Record<string, unknown>;
    expect(last.quantity_allocated).toBe(0);

    expect(mockedRedirect).not.toHaveBeenCalled();
  });
});
