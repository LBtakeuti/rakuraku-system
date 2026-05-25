import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type MockResponse } from "@/test-utils/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  listPurchaseOrders,
  getPurchaseOrder,
  listReceivablePurchaseOrders,
} from "../purchase-order";

const mockedCreate = vi.mocked(createClient);

beforeEach(() => {
  mockedCreate.mockReset();
});

describe("listPurchaseOrders", () => {
  it("発注を返し、各行に purchase_order_line の quantity / received_quantity 合算が入る", async () => {
    const sb = createSupabaseMock({
      purchase_order: {
        data: [
          {
            id: "po-1",
            purchase_order_no: "P00000001",
            supplier_code: "SUP-A",
            order_date: "2026-05-20",
            expected_delivery_date: "2026-05-23",
            status: "ordered",
            subtotal: "1000",
            tax_amount: "100",
            total_amount: "1100",
            note: null,
            supplier: { supplier_code: "SUP-A", name: "A仕入先" },
          },
        ],
        count: 1,
      },
      purchase_order_line: {
        data: [
          {
            purchase_order_id: "po-1",
            quantity: 10,
            received_quantity: 3,
          },
          {
            purchase_order_id: "po-1",
            quantity: 5,
            received_quantity: 5,
          },
        ],
      },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await listPurchaseOrders();
    expect(r.total).toBe(1);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({
      id: "po-1",
      purchaseOrderNo: "P00000001",
      supplierName: "A仕入先",
      status: "ordered",
      subtotal: 1000,
      taxAmount: 100,
      totalAmount: 1100,
      totalQuantity: 15,
      receivedQuantity: 8,
    });
  });

  it("発注ゼロ件のときは purchase_order_line を引かない", async () => {
    const sb = createSupabaseMock({
      purchase_order: { data: [], count: 0 },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await listPurchaseOrders();
    expect(r).toEqual({ rows: [], total: 0 });
    // purchase_order_line には触れない
    expect(
      sb._calls.from.find((c) => c.table === "purchase_order_line")
    ).toBeUndefined();
  });

  it("supplier リレーションが取れないと supplierName は supplier_code にフォールバック", async () => {
    const sb = createSupabaseMock({
      purchase_order: {
        data: [
          {
            id: "po-1",
            purchase_order_no: "P00000001",
            supplier_code: "SUP-X",
            order_date: "2026-05-20",
            expected_delivery_date: null,
            status: "ordered",
            subtotal: 0,
            tax_amount: 0,
            total_amount: 0,
            note: null,
            supplier: null,
          },
        ],
        count: 1,
      },
      purchase_order_line: { data: [] },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await listPurchaseOrders();
    expect(r.rows[0].supplierName).toBe("SUP-X");
  });
});

describe("getPurchaseOrder", () => {
  it("ヘッダ + 明細を返し、各明細の isLotManaged が product.is_lot_managed から入る", async () => {
    const sb = createSupabaseMock({
      purchase_order: {
        data: {
          id: "po-1",
          purchase_order_no: "P00000001",
          supplier_code: "SUP-A",
          order_date: "2026-05-20",
          expected_delivery_date: "2026-05-23",
          status: "partial",
          subtotal: "5000",
          tax_amount: "500",
          total_amount: "5500",
          note: "テスト",
          supplier: { supplier_code: "SUP-A", name: "A仕入先" },
        },
      },
      purchase_order_line: {
        data: [
          {
            id: "pol-1",
            purchase_order_id: "po-1",
            line_no: 1,
            product_code: "00000001",
            product_name_snapshot: "A商品",
            quantity: 10,
            unit_price: "200",
            tax_rate: "0.1",
            amount: "2000",
            received_quantity: 3,
            note: null,
            product: { product_code: "00000001", is_lot_managed: true },
          },
          {
            id: "pol-2",
            purchase_order_id: "po-1",
            line_no: 2,
            product_code: "00000002",
            product_name_snapshot: "B商品",
            quantity: 30,
            unit_price: "100",
            tax_rate: "0.08",
            amount: "3000",
            received_quantity: 30,
            note: null,
            product: { product_code: "00000002", is_lot_managed: false },
          },
        ],
      },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await getPurchaseOrder("po-1");
    expect(r).not.toBeNull();
    expect(r!.id).toBe("po-1");
    expect(r!.supplierName).toBe("A仕入先");
    expect(r!.totalQuantity).toBe(40);
    expect(r!.receivedQuantity).toBe(33);
    expect(r!.lines).toHaveLength(2);
    expect(r!.lines[0]).toMatchObject({
      lineNo: 1,
      productCode: "00000001",
      taxRate: 0.1,
      isLotManaged: true,
      receivedQuantity: 3,
    });
    expect(r!.lines[1]).toMatchObject({
      lineNo: 2,
      taxRate: 0.08,
      isLotManaged: false,
    });
  });

  it("ヘッダが見つからないと null を返す", async () => {
    const sb = createSupabaseMock({
      purchase_order: { data: null },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await getPurchaseOrder("nonexistent");
    expect(r).toBeNull();
  });
});

describe("listReceivablePurchaseOrders", () => {
  it("ordered と partial だけが返る（received / cancelled は除外）", async () => {
    const sb = createSupabaseMock({
      purchase_order: {
        data: [
          {
            id: "po-1",
            purchase_order_no: "P1",
            supplier_code: "SA",
            order_date: "2026-05-20",
            expected_delivery_date: null,
            status: "ordered",
            subtotal: 0,
            tax_amount: 0,
            total_amount: 0,
            note: null,
            supplier: null,
          },
          {
            id: "po-2",
            purchase_order_no: "P2",
            supplier_code: "SA",
            order_date: "2026-05-20",
            expected_delivery_date: null,
            status: "partial",
            subtotal: 0,
            tax_amount: 0,
            total_amount: 0,
            note: null,
            supplier: null,
          },
          {
            id: "po-3",
            purchase_order_no: "P3",
            supplier_code: "SA",
            order_date: "2026-05-20",
            expected_delivery_date: null,
            status: "received",
            subtotal: 0,
            tax_amount: 0,
            total_amount: 0,
            note: null,
            supplier: null,
          },
          {
            id: "po-4",
            purchase_order_no: "P4",
            supplier_code: "SA",
            order_date: "2026-05-20",
            expected_delivery_date: null,
            status: "cancelled",
            subtotal: 0,
            tax_amount: 0,
            total_amount: 0,
            note: null,
            supplier: null,
          },
        ],
        count: 4,
      } as MockResponse,
      purchase_order_line: { data: [] },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await listReceivablePurchaseOrders();
    expect(r.map((p) => p.purchaseOrderNo).sort()).toEqual(["P1", "P2"]);
  });
});
