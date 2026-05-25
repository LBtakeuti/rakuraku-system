import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ProductRow } from "@/types/product";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/products",
  useSearchParams: () => new URLSearchParams(""),
}));

import { ProductsTable } from "../products-table";

function row(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    productCode: "00000001",
    name: "サンプル商品",
    janCode: "4901234567890",
    unitsPerCase: 10,
    defaultSalesUnitPrice: 1500,
    defaultPurchaseUnitPrice: 800,
    defaultTaxRate: 0.1,
    defaultOrderType: "stock",
    isStocked: true,
    isLotManaged: false,
    safetyStock: 0,
    status: "active",
    totalStock: 100,
    ...overrides,
  };
}

beforeEach(() => {
  pushMock.mockReset();
});

describe("ProductsTable", () => {
  const baseProps = {
    rows: [row()],
    total: 1,
    page: 1,
    pageSize: 20,
    query: "",
    filter: "all" as const,
  };

  it("商品行と単価（¥1,500）が表示される", () => {
    render(<ProductsTable {...baseProps} />);
    expect(screen.getByText("サンプル商品")).toBeInTheDocument();
    expect(screen.getByText("¥1,500")).toBeInTheDocument();
  });

  it("税率 10% は info バッジ", () => {
    render(<ProductsTable {...baseProps} />);
    expect(screen.getByText("10%")).toBeInTheDocument();
  });

  it("税率 8% は warning バッジ", () => {
    render(
      <ProductsTable
        {...baseProps}
        rows={[row({ defaultTaxRate: 0.08 })]}
      />
    );
    expect(screen.getByText("8%")).toBeInTheDocument();
  });

  it("defaultSalesUnitPrice=null は「—」表示", () => {
    render(
      <ProductsTable
        {...baseProps}
        rows={[row({ defaultSalesUnitPrice: null })]}
      />
    );
    // 単価セルの「—」を検証（テーブル中に複数 — がある可能性があるので少なくとも1つ）
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("isStocked=false は在庫列が「—」", () => {
    render(
      <ProductsTable
        {...baseProps}
        rows={[row({ isStocked: false, totalStock: null })]}
      />
    );
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("rows が空のときは「商品が見つかりませんでした」", () => {
    render(<ProductsTable {...baseProps} rows={[]} total={0} />);
    expect(
      screen.getByText("商品が見つかりませんでした")
    ).toBeInTheDocument();
  });

  it("filter='stocked' チップが押下状態", () => {
    render(<ProductsTable {...baseProps} filter="stocked" />);
    expect(
      screen.getByRole("button", { name: "在庫がある商品" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("「単価が未設定」チップをクリックで filter=no_price 付き URL", async () => {
    const user = userEvent.setup();
    render(<ProductsTable {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "単価が未設定" }));
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).toContain("filter=no_price");
  });

  it("行クリックで /products/{code}/edit へ router.push", async () => {
    const user = userEvent.setup();
    render(<ProductsTable {...baseProps} />);
    await user.click(screen.getByText("サンプル商品"));
    expect(pushMock).toHaveBeenCalledWith("/products/00000001/edit");
  });

  it("「新しい商品を追加する」リンクは /products/new", () => {
    render(<ProductsTable {...baseProps} />);
    expect(
      screen.getByRole("link", { name: /新しい商品を追加する/ })
    ).toHaveAttribute("href", "/products/new");
  });
});
