import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock } from "@/test-utils/supabase-mock";

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

function mockTable(table: string, lastRow: Record<string, string> | null) {
  return createSupabaseMock({
    [table]: { data: lastRow ? [lastRow] : [] },
  });
}

describe("nextCustomerCode", () => {
  it("既存最大が 000199 のとき 000200 を返す", async () => {
    mockedCreate.mockResolvedValue(
      mockTable("customer", { customer_code: "000199" }) as never
    );
    await expect(nextCustomerCode()).resolves.toBe("000200");
  });

  it("既存レコードがゼロのとき 000001 を返す", async () => {
    mockedCreate.mockResolvedValue(mockTable("customer", null) as never);
    await expect(nextCustomerCode()).resolves.toBe("000001");
  });

  it("既存最大が非数値（例: ABCDEF）の場合は 000001 にフォールバック", async () => {
    mockedCreate.mockResolvedValue(
      mockTable("customer", { customer_code: "ABCDEF" }) as never
    );
    await expect(nextCustomerCode()).resolves.toBe("000001");
  });

  it("6桁に満たない場合はゼロ埋めされる（既存 5 → 000006）", async () => {
    mockedCreate.mockResolvedValue(
      mockTable("customer", { customer_code: "000005" }) as never
    );
    await expect(nextCustomerCode()).resolves.toBe("000006");
  });
});

describe("nextProductCode", () => {
  it("8桁ゼロ埋めで採番される（既存 00000010 → 00000011）", async () => {
    mockedCreate.mockResolvedValue(
      mockTable("product", { product_code: "00000010" }) as never
    );
    await expect(nextProductCode()).resolves.toBe("00000011");
  });

  it("既存ゼロ件で 00000001 を返す", async () => {
    mockedCreate.mockResolvedValue(mockTable("product", null) as never);
    await expect(nextProductCode()).resolves.toBe("00000001");
  });
});

describe("nextSalesOrderNumber", () => {
  it("既存 800000099 → 800000100（prefix '8' + 8桁）", async () => {
    mockedCreate.mockResolvedValue(
      mockTable("sales_order", { order_no: "800000099" }) as never
    );
    await expect(nextSalesOrderNumber()).resolves.toBe("800000100");
  });

  it("既存ゼロ件 → 800000001", async () => {
    mockedCreate.mockResolvedValue(mockTable("sales_order", null) as never);
    await expect(nextSalesOrderNumber()).resolves.toBe("800000001");
  });
});

describe("nextPurchaseOrderNumber", () => {
  it("既存 P00000007 → P00000008（prefix 'P' + 8桁）", async () => {
    mockedCreate.mockResolvedValue(
      mockTable("purchase_order", {
        purchase_order_no: "P00000007",
      }) as never
    );
    await expect(nextPurchaseOrderNumber()).resolves.toBe("P00000008");
  });
});

describe("nextSalesInvoiceNumber", () => {
  it("既存 N00000123 → N00000124（prefix 'N' + 8桁）", async () => {
    mockedCreate.mockResolvedValue(
      mockTable("sales_invoice", { invoice_no: "N00000123" }) as never
    );
    await expect(nextSalesInvoiceNumber()).resolves.toBe("N00000124");
  });
});

describe("nextBillingNumber", () => {
  it("yearMonth=202605 で既存 B202605004 → B202605005（prefix + 3桁）", async () => {
    mockedCreate.mockResolvedValue(
      mockTable("billing_statement", {
        statement_no: "B202605004",
      }) as never
    );
    await expect(nextBillingNumber("202605")).resolves.toBe("B202605005");
  });

  it("当月分が無ければ 001 から始まる", async () => {
    mockedCreate.mockResolvedValue(
      mockTable("billing_statement", null) as never
    );
    await expect(nextBillingNumber("202605")).resolves.toBe("B202605001");
  });
});
