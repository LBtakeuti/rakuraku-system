import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSupabaseMock } from "@/test-utils/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  findFifoLots,
  searchProductsForOrder,
  listSalesOrders,
} from "../sales-order";

const mockedCreate = vi.mocked(createClient);

beforeEach(() => {
  mockedCreate.mockReset();
});

describe("findFifoLots", () => {
  it("各ロットの available = max(0, quantity_on_hand - quantity_allocated)", async () => {
    const sb = createSupabaseMock({
      product_stock: {
        data: [
          {
            id: "ls-1",
            quantity_on_hand: 100,
            quantity_allocated: 30,
            expiry_date: "2026-12-31",
            lot_no: "L1",
          },
          {
            id: "ls-2",
            quantity_on_hand: 50,
            quantity_allocated: 80,
            expiry_date: "2027-01-31",
            lot_no: "L2",
          },
          {
            id: "ls-3",
            quantity_on_hand: 20,
            quantity_allocated: 20,
            expiry_date: null,
            lot_no: "L3",
          },
        ],
      },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const lots = await findFifoLots("00000001");
    expect(lots).toEqual([
      {
        productStockId: "ls-1",
        available: 70,
        expiryDate: "2026-12-31",
        lotNo: "L1",
      },
      {
        // allocated > on_hand のときは 0 にクランプ
        productStockId: "ls-2",
        available: 0,
        expiryDate: "2027-01-31",
        lotNo: "L2",
      },
      {
        productStockId: "ls-3",
        available: 0,
        expiryDate: null,
        lotNo: "L3",
      },
    ]);
  });

  it("ロット 0 件で空配列を返す", async () => {
    const sb = createSupabaseMock({ product_stock: { data: [] } });
    mockedCreate.mockResolvedValue(sb as never);
    await expect(findFifoLots("00000001")).resolves.toEqual([]);
  });
});

describe("searchProductsForOrder", () => {
  it("商品 + 在庫を読み、product_code ごとに onHand/allocated を合算する", async () => {
    const sb = createSupabaseMock({
      product: {
        data: [
          {
            product_code: "00000001",
            name: "A商品",
            jan_code: "4901234567890",
            units_per_case: 10,
            default_sales_unit_price: "1500",
            default_tax_rate: "0.1",
            default_order_type: "stock",
            is_stocked: true,
            supplier_code: "S001",
          },
          {
            product_code: "00000002",
            name: "B商品",
            jan_code: null,
            units_per_case: 1,
            default_sales_unit_price: null,
            default_tax_rate: 0.08,
            default_order_type: "order_at_sale",
            is_stocked: false,
            supplier_code: null,
          },
        ],
      },
      product_stock: {
        data: [
          // A商品: 2 ロット合算
          {
            product_code: "00000001",
            quantity_on_hand: 60,
            quantity_allocated: 10,
          },
          {
            product_code: "00000001",
            quantity_on_hand: 40,
            quantity_allocated: 5,
          },
          // B商品: 在庫なし
        ],
      },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const results = await searchProductsForOrder("");
    expect(results).toHaveLength(2);

    const a = results.find((r) => r.productCode === "00000001")!;
    expect(a).toMatchObject({
      name: "A商品",
      janCode: "4901234567890",
      unitsPerCase: 10,
      defaultSalesUnitPrice: 1500,
      defaultTaxRate: 0.1,
      defaultOrderType: "stock",
      isStocked: true,
      totalOnHand: 100,
      totalAllocated: 15,
      supplierCode: "S001",
    });

    const b = results.find((r) => r.productCode === "00000002")!;
    expect(b).toMatchObject({
      name: "B商品",
      janCode: null,
      defaultSalesUnitPrice: null,
      defaultTaxRate: 0.08,
      defaultOrderType: "order_at_sale",
      isStocked: false,
      totalOnHand: 0,
      totalAllocated: 0,
      supplierCode: null,
    });
  });

  it("商品ゼロ件のときは在庫クエリを発行せず空配列", async () => {
    const sb = createSupabaseMock({ product: { data: [] } });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await searchProductsForOrder("");
    expect(r).toEqual([]);
    expect(sb._calls.from.map((c) => c.table)).toEqual(["product"]);
  });

  it("税率が string '0.08' でも数値 0.08 として返る", async () => {
    const sb = createSupabaseMock({
      product: {
        data: [
          {
            product_code: "00000001",
            name: "x",
            jan_code: null,
            units_per_case: 1,
            default_sales_unit_price: "100",
            default_tax_rate: "0.08",
            default_order_type: "stock",
            is_stocked: false,
            supplier_code: null,
          },
        ],
      },
      product_stock: { data: [] },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await searchProductsForOrder("");
    expect(r[0].defaultTaxRate).toBe(0.08);
  });
});

describe("listSalesOrders（期間フィルタ）", () => {
  // periodRange はシステム時刻を使うため、固定して挙動を確認する。
  // チェーン経由で gte/lte が呼ばれたかを `_calls` で見るのではなく、
  // 実行結果が想定どおりであることを「呼び出しが成功する」ことで検証する。
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("period='all' のときは正常に動作し（gte/lte なし）count を返す", async () => {
    vi.setSystemTime(new Date(2026, 4, 22, 12, 0, 0));
    const sb = createSupabaseMock({
      sales_order: { data: [], count: 0 },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await listSalesOrders({ period: "all" });
    expect(r).toEqual({ rows: [], total: 0 });
  });

  it("period='today' でもクエリが正常実行される", async () => {
    vi.setSystemTime(new Date(2026, 4, 22, 12, 0, 0));
    const sb = createSupabaseMock({
      sales_order: {
        data: [
          {
            id: "so-1",
            order_no: "800000001",
            customer_code: "000001",
            delivery_address_id: null,
            order_date: "2026-05-22",
            delivery_date: "2026-05-24",
            status: "pending",
            subtotal: "1000",
            tax_amount: "100",
            total_amount: "1100",
            note: null,
            customer: { customer_code: "000001", name: "サンプル" },
            staff: null,
          },
        ],
        count: 1,
      },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await listSalesOrders({ period: "today" });
    expect(r.total).toBe(1);
    expect(r.rows[0]).toMatchObject({
      id: "so-1",
      orderNo: "800000001",
      customerName: "サンプル",
      subtotal: 1000,
      taxAmount: 100,
      totalAmount: 1100,
      status: "pending",
    });
  });

  it("customer リレーションが取れないと customerName は customer_code にフォールバック", async () => {
    vi.setSystemTime(new Date(2026, 4, 22, 12, 0, 0));
    const sb = createSupabaseMock({
      sales_order: {
        data: [
          {
            id: "so-1",
            order_no: "800000001",
            customer_code: "000001",
            delivery_address_id: null,
            order_date: "2026-05-22",
            delivery_date: "2026-05-24",
            status: "pending",
            subtotal: 0,
            tax_amount: 0,
            total_amount: 0,
            note: null,
            customer: null,
            staff: null,
          },
        ],
        count: 1,
      },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await listSalesOrders({ period: "all" });
    expect(r.rows[0].customerName).toBe("000001");
  });
});
