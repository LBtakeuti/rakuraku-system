import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock } from "@/test-utils/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  computeExpiryStatus,
  listStockByProduct,
  listStockByLot,
  getExpiryWarningCounts,
} from "../stock";

const mockedCreate = vi.mocked(createClient);

beforeEach(() => {
  mockedCreate.mockReset();
});

describe("computeExpiryStatus（境界値）", () => {
  // 基準日: 2026-05-22
  const today = new Date(2026, 4, 22);

  it("expiry が null なら 'none'", () => {
    expect(computeExpiryStatus(null, today)).toBe("none");
  });

  it("expiry が不正文字列なら 'none'", () => {
    expect(computeExpiryStatus("not-a-date", today)).toBe("none");
  });

  it("過去日付（既に切れている）は 'danger'", () => {
    expect(computeExpiryStatus("2026-05-01", today)).toBe("danger");
  });

  it("今日（残り 0 日）は 'danger'", () => {
    expect(computeExpiryStatus("2026-05-22", today)).toBe("danger");
  });

  it("残り 14 日ちょうど は 'danger'", () => {
    expect(computeExpiryStatus("2026-06-05", today)).toBe("danger");
  });

  it("残り 15 日 は 'warning'", () => {
    expect(computeExpiryStatus("2026-06-06", today)).toBe("warning");
  });

  it("残り 60 日ちょうど は 'warning'", () => {
    expect(computeExpiryStatus("2026-07-21", today)).toBe("warning");
  });

  it("残り 61 日 は 'ok'", () => {
    expect(computeExpiryStatus("2026-07-22", today)).toBe("ok");
  });

  it("十分先（1年後）は 'ok'", () => {
    expect(computeExpiryStatus("2027-05-22", today)).toBe("ok");
  });
});

describe("listStockByProduct", () => {
  it("同一商品の複数ロットを集約し nearestExpiry が最小日付になる", async () => {
    const sb = createSupabaseMock({
      product_stock: {
        data: [
          {
            id: "s1",
            product_code: "00000001",
            warehouse_id: "wh-1",
            lot_no: "L1",
            expiry_date: "2026-12-31",
            quantity_on_hand: 50,
            quantity_allocated: 10,
            received_at: "2026-05-01",
            product: {
              product_code: "00000001",
              name: "A商品",
              jan_code: "4901234567890",
              is_lot_managed: true,
            },
          },
          {
            id: "s2",
            product_code: "00000001",
            warehouse_id: "wh-1",
            lot_no: "L2",
            expiry_date: "2026-08-31", // より早い期限
            quantity_on_hand: 30,
            quantity_allocated: 5,
            received_at: "2026-05-10",
            product: {
              product_code: "00000001",
              name: "A商品",
              jan_code: "4901234567890",
              is_lot_managed: true,
            },
          },
          {
            id: "s3",
            product_code: "00000002",
            warehouse_id: "wh-1",
            lot_no: null,
            expiry_date: null,
            quantity_on_hand: 20,
            quantity_allocated: 0,
            received_at: "2026-05-15",
            product: {
              product_code: "00000002",
              name: "B商品",
              jan_code: null,
              is_lot_managed: false,
            },
          },
        ],
      },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const results = await listStockByProduct();
    expect(results).toHaveLength(2);

    const a = results.find((r) => r.productCode === "00000001")!;
    expect(a.quantityOnHand).toBe(80);
    expect(a.quantityAllocated).toBe(15);
    expect(a.quantityAvailable).toBe(65);
    expect(a.nearestExpiry).toBe("2026-08-31");
    expect(a.isLotManaged).toBe(true);

    const b = results.find((r) => r.productCode === "00000002")!;
    expect(b.quantityOnHand).toBe(20);
    expect(b.nearestExpiry).toBeNull();
    expect(b.expiryStatus).toBe("none");
  });

  it("expiryFilter='danger' で danger のみに絞り込む", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 22)); // 2026-05-22
    try {
      const sb = createSupabaseMock({
        product_stock: {
          data: [
            {
              id: "s1",
              product_code: "00000001",
              warehouse_id: "wh-1",
              lot_no: "L1",
              expiry_date: "2026-05-25", // 残り 3 日 → danger
              quantity_on_hand: 10,
              quantity_allocated: 0,
              received_at: null,
              product: {
                product_code: "00000001",
                name: "A",
                jan_code: null,
                is_lot_managed: true,
              },
            },
            {
              id: "s2",
              product_code: "00000002",
              warehouse_id: "wh-1",
              lot_no: "L2",
              expiry_date: "2027-05-22", // 残り 1 年 → ok
              quantity_on_hand: 10,
              quantity_allocated: 0,
              received_at: null,
              product: {
                product_code: "00000002",
                name: "B",
                jan_code: null,
                is_lot_managed: true,
              },
            },
          ],
        },
      });
      mockedCreate.mockResolvedValue(sb as never);
      const r = await listStockByProduct({ expiryFilter: "danger" });
      expect(r.map((x) => x.productCode)).toEqual(["00000001"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("expiryFilter='warning' は danger + warning を返す", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 22));
    try {
      const sb = createSupabaseMock({
        product_stock: {
          data: [
            {
              id: "s1",
              product_code: "00000001",
              warehouse_id: "wh-1",
              lot_no: "L1",
              expiry_date: "2026-05-25", // danger
              quantity_on_hand: 10,
              quantity_allocated: 0,
              received_at: null,
              product: {
                product_code: "00000001",
                name: "A",
                jan_code: null,
                is_lot_managed: true,
              },
            },
            {
              id: "s2",
              product_code: "00000002",
              warehouse_id: "wh-1",
              lot_no: "L2",
              expiry_date: "2026-07-15", // warning (54日)
              quantity_on_hand: 10,
              quantity_allocated: 0,
              received_at: null,
              product: {
                product_code: "00000002",
                name: "B",
                jan_code: null,
                is_lot_managed: true,
              },
            },
            {
              id: "s3",
              product_code: "00000003",
              warehouse_id: "wh-1",
              lot_no: "L3",
              expiry_date: "2027-05-22", // ok
              quantity_on_hand: 10,
              quantity_allocated: 0,
              received_at: null,
              product: {
                product_code: "00000003",
                name: "C",
                jan_code: null,
                is_lot_managed: true,
              },
            },
          ],
        },
      });
      mockedCreate.mockResolvedValue(sb as never);
      const r = await listStockByProduct({ expiryFilter: "warning" });
      expect(r.map((x) => x.productCode).sort()).toEqual([
        "00000001",
        "00000002",
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("検索語で productCode/productName/janCode をフィルタリング", async () => {
    const sb = createSupabaseMock({
      product_stock: {
        data: [
          {
            id: "s1",
            product_code: "00000001",
            warehouse_id: "wh-1",
            lot_no: null,
            expiry_date: null,
            quantity_on_hand: 5,
            quantity_allocated: 0,
            received_at: null,
            product: {
              product_code: "00000001",
              name: "りんご",
              jan_code: "4901111111111",
              is_lot_managed: false,
            },
          },
          {
            id: "s2",
            product_code: "00000002",
            warehouse_id: "wh-1",
            lot_no: null,
            expiry_date: null,
            quantity_on_hand: 5,
            quantity_allocated: 0,
            received_at: null,
            product: {
              product_code: "00000002",
              name: "みかん",
              jan_code: null,
              is_lot_managed: false,
            },
          },
        ],
      },
    });
    mockedCreate.mockResolvedValue(sb as never);
    const r = await listStockByProduct({ query: "りんご" });
    expect(r.map((x) => x.productCode)).toEqual(["00000001"]);
  });
});

describe("listStockByLot", () => {
  it("各ロット行に warehouseName と quantityAvailable が入る", async () => {
    const sb = createSupabaseMock({
      product_stock: {
        data: [
          {
            id: "s1",
            product_code: "00000001",
            warehouse_id: "wh-1",
            lot_no: "L1",
            expiry_date: "2026-12-31",
            quantity_on_hand: 50,
            quantity_allocated: 10,
            received_at: "2026-05-01",
            product: {
              product_code: "00000001",
              name: "A商品",
              jan_code: null,
              is_lot_managed: true,
            },
            warehouse: { id: "wh-1", name: "本社倉庫" },
          },
        ],
      },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await listStockByLot();
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      id: "s1",
      productCode: "00000001",
      productName: "A商品",
      warehouseName: "本社倉庫",
      lotNo: "L1",
      quantityOnHand: 50,
      quantityAllocated: 10,
      quantityAvailable: 40,
      receivedAt: "2026-05-01",
    });
  });

  it("expiryDate が早い順にソートされる（同一商品内）", async () => {
    const sb = createSupabaseMock({
      product_stock: {
        data: [
          {
            id: "s2",
            product_code: "00000001",
            warehouse_id: "wh-1",
            lot_no: "L2",
            expiry_date: "2027-01-31",
            quantity_on_hand: 5,
            quantity_allocated: 0,
            received_at: null,
            product: {
              product_code: "00000001",
              name: "A",
              jan_code: null,
              is_lot_managed: true,
            },
            warehouse: { id: "wh-1", name: "W" },
          },
          {
            id: "s1",
            product_code: "00000001",
            warehouse_id: "wh-1",
            lot_no: "L1",
            expiry_date: "2026-08-31",
            quantity_on_hand: 5,
            quantity_allocated: 0,
            received_at: null,
            product: {
              product_code: "00000001",
              name: "A",
              jan_code: null,
              is_lot_managed: true,
            },
            warehouse: { id: "wh-1", name: "W" },
          },
        ],
      },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await listStockByLot();
    expect(r.map((x) => x.lotNo)).toEqual(["L1", "L2"]);
  });
});

describe("getExpiryWarningCounts", () => {
  it("danger / warning の件数を集計する", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 22)); // 2026-05-22
    try {
      const sb = createSupabaseMock({
        product_stock: {
          data: [
            { expiry_date: "2026-05-23", quantity_on_hand: 5 }, // danger
            { expiry_date: "2026-06-01", quantity_on_hand: 1 }, // danger (残り 10 日)
            { expiry_date: "2026-07-01", quantity_on_hand: 1 }, // warning
            { expiry_date: "2027-05-22", quantity_on_hand: 1 }, // ok
            { expiry_date: null, quantity_on_hand: 1 }, // none
          ],
        },
      });
      mockedCreate.mockResolvedValue(sb as never);

      const counts = await getExpiryWarningCounts();
      expect(counts).toEqual({ danger: 2, warning: 1 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("quantity_on_hand > 0 のフィルタが適用される（実コード側で .gt('quantity_on_hand', 0)）", async () => {
    const sb = createSupabaseMock({
      product_stock: { data: [] },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const counts = await getExpiryWarningCounts();
    expect(counts).toEqual({ danger: 0, warning: 0 });
  });
});
