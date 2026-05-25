import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase の `from(table).select(col).order(...).limit(1)` および
// `.like(...)` 経由のチェーンを返すモックビルダー。
type LastValue = { [col: string]: string } | null;

function buildMock(lastValuesByTable: Record<string, LastValue>) {
  return {
    from(table: string) {
      const last = lastValuesByTable[table] ?? null;
      const result = {
        data: last ? [last] : [],
        error: null,
      };
      const chain = {
        select: vi.fn(() => chain),
        order: vi.fn(() => chain),
        like: vi.fn(() => chain),
        limit: vi.fn(() => Promise.resolve(result)),
      };
      return chain;
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  nextCustomerCode,
  nextProductCode,
  nextSalesOrderNumber,
  nextPurchaseOrderNumber,
  nextSalesInvoiceNumber,
  nextBillingNumber,
} from "../numbering";

const mockedCreate = vi.mocked(createClient);

beforeEach(() => {
  mockedCreate.mockReset();
});

describe("nextCustomerCode", () => {
  it("既存最大が 000199 のとき 000200 を返す", async () => {
    mockedCreate.mockResolvedValue(
      buildMock({ customer: { customer_code: "000199" } }) as never
    );
    await expect(nextCustomerCode()).resolves.toBe("000200");
  });

  it("既存レコードがゼロのとき 000001 を返す", async () => {
    mockedCreate.mockResolvedValue(buildMock({}) as never);
    await expect(nextCustomerCode()).resolves.toBe("000001");
  });

  it("既存最大が非数値（例: ABCDEF）の場合は 000001 にフォールバック", async () => {
    mockedCreate.mockResolvedValue(
      buildMock({ customer: { customer_code: "ABCDEF" } }) as never
    );
    await expect(nextCustomerCode()).resolves.toBe("000001");
  });

  it("6桁に満たない場合はゼロ埋めされる（既存 5 → 000006）", async () => {
    mockedCreate.mockResolvedValue(
      buildMock({ customer: { customer_code: "000005" } }) as never
    );
    await expect(nextCustomerCode()).resolves.toBe("000006");
  });
});

describe("nextProductCode", () => {
  it("8桁ゼロ埋めで採番される（既存 00000010 → 00000011）", async () => {
    mockedCreate.mockResolvedValue(
      buildMock({ product: { product_code: "00000010" } }) as never
    );
    await expect(nextProductCode()).resolves.toBe("00000011");
  });

  it("既存ゼロ件で 00000001 を返す", async () => {
    mockedCreate.mockResolvedValue(buildMock({}) as never);
    await expect(nextProductCode()).resolves.toBe("00000001");
  });
});

describe("nextSalesOrderNumber", () => {
  it("既存 800000099 → 800000100（prefix '8' + 8桁）", async () => {
    mockedCreate.mockResolvedValue(
      buildMock({ sales_order: { order_number: "800000099" } }) as never
    );
    await expect(nextSalesOrderNumber()).resolves.toBe("800000100");
  });

  it("既存ゼロ件 → 800000001", async () => {
    mockedCreate.mockResolvedValue(buildMock({}) as never);
    await expect(nextSalesOrderNumber()).resolves.toBe("800000001");
  });
});

describe("nextPurchaseOrderNumber", () => {
  it("既存 P00000007 → P00000008（prefix 'P' + 8桁）", async () => {
    mockedCreate.mockResolvedValue(
      buildMock({ purchase_order: { po_number: "P00000007" } }) as never
    );
    await expect(nextPurchaseOrderNumber()).resolves.toBe("P00000008");
  });
});

describe("nextSalesInvoiceNumber", () => {
  it("既存 N00000123 → N00000124（prefix 'N' + 8桁）", async () => {
    mockedCreate.mockResolvedValue(
      buildMock({ sales_invoice: { invoice_number: "N00000123" } }) as never
    );
    await expect(nextSalesInvoiceNumber()).resolves.toBe("N00000124");
  });
});

describe("nextBillingNumber", () => {
  it("yearMonth=202605 で既存 B202605004 → B202605005（prefix + 3桁）", async () => {
    mockedCreate.mockResolvedValue(
      buildMock({
        billing_statement: { statement_number: "B202605004" },
      }) as never
    );
    await expect(nextBillingNumber("202605")).resolves.toBe("B202605005");
  });

  it("当月分が無ければ 001 から始まる", async () => {
    mockedCreate.mockResolvedValue(buildMock({}) as never);
    await expect(nextBillingNumber("202605")).resolves.toBe("B202605001");
  });
});
