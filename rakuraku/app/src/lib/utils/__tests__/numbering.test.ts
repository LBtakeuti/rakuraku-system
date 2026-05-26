import { describe, it, expect, vi, beforeEach } from "vitest";

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

function buildRpcMock(data: unknown, error: { message: string } | null = null) {
  const rpcFn = vi.fn().mockResolvedValue({ data, error });
  return { rpc: rpcFn };
}

beforeEach(() => {
  mockedCreate.mockReset();
});

describe("nextCustomerCode", () => {
  it("RPC generate_customer_code の戻り値をそのまま返す", async () => {
    mockedCreate.mockResolvedValue(buildRpcMock("000200") as never);
    await expect(nextCustomerCode()).resolves.toBe("000200");
  });

  it("RPC がエラーを返すと throw する", async () => {
    mockedCreate.mockResolvedValue(
      buildRpcMock(null, { message: "採番失敗" }) as never
    );
    await expect(nextCustomerCode()).rejects.toThrow("お客様コードの採番に失敗しました");
  });
});

describe("nextProductCode", () => {
  it("RPC generate_product_code の戻り値をそのまま返す", async () => {
    mockedCreate.mockResolvedValue(buildRpcMock("00000011") as never);
    await expect(nextProductCode()).resolves.toBe("00000011");
  });

  it("RPC がエラーを返すと throw する", async () => {
    mockedCreate.mockResolvedValue(
      buildRpcMock(null, { message: "採番失敗" }) as never
    );
    await expect(nextProductCode()).rejects.toThrow("商品コードの採番に失敗しました");
  });
});

describe("nextSalesOrderNumber", () => {
  it("RPC generate_order_number の戻り値をそのまま返す", async () => {
    mockedCreate.mockResolvedValue(buildRpcMock("800000100") as never);
    await expect(nextSalesOrderNumber()).resolves.toBe("800000100");
  });

  it("RPC がエラーを返すと throw する", async () => {
    mockedCreate.mockResolvedValue(
      buildRpcMock(null, { message: "採番失敗" }) as never
    );
    await expect(nextSalesOrderNumber()).rejects.toThrow("受注番号の採番に失敗しました");
  });
});

describe("nextPurchaseOrderNumber", () => {
  it("RPC generate_purchase_order_number の戻り値をそのまま返す", async () => {
    mockedCreate.mockResolvedValue(buildRpcMock("P00000008") as never);
    await expect(nextPurchaseOrderNumber()).resolves.toBe("P00000008");
  });

  it("RPC がエラーを返すと throw する", async () => {
    mockedCreate.mockResolvedValue(
      buildRpcMock(null, { message: "採番失敗" }) as never
    );
    await expect(nextPurchaseOrderNumber()).rejects.toThrow("発注番号の採番に失敗しました");
  });
});

describe("nextSalesInvoiceNumber", () => {
  it("RPC generate_delivery_number の戻り値をそのまま返す", async () => {
    mockedCreate.mockResolvedValue(buildRpcMock("N00000124") as never);
    await expect(nextSalesInvoiceNumber()).resolves.toBe("N00000124");
  });

  it("RPC がエラーを返すと throw する", async () => {
    mockedCreate.mockResolvedValue(
      buildRpcMock(null, { message: "採番失敗" }) as never
    );
    await expect(nextSalesInvoiceNumber()).rejects.toThrow("納品書番号の採番に失敗しました");
  });
});

describe("nextBillingNumber", () => {
  it("RPC generate_billing_number の戻り値をそのまま返す", async () => {
    mockedCreate.mockResolvedValue(buildRpcMock("B202605005") as never);
    await expect(nextBillingNumber("202605")).resolves.toBe("B202605005");
  });

  it("yearMonth 引数が rpc に渡される", async () => {
    const mock = buildRpcMock("B202605001");
    mockedCreate.mockResolvedValue(mock as never);
    await nextBillingNumber("202605");
    expect(mock.rpc).toHaveBeenCalledWith("generate_billing_number", {
      year_month: "202605",
    });
  });

  it("RPC がエラーを返すと throw する", async () => {
    mockedCreate.mockResolvedValue(
      buildRpcMock(null, { message: "採番失敗" }) as never
    );
    await expect(nextBillingNumber("202605")).rejects.toThrow("請求書番号の採番に失敗しました");
  });
});
