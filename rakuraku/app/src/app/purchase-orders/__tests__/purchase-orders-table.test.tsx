import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PurchaseOrderRow } from "@/types/purchase-order";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/purchase-orders",
  useSearchParams: () => new URLSearchParams(""),
}));

import { PurchaseOrdersTable } from "../purchase-orders-table";

function row(overrides: Partial<PurchaseOrderRow> = {}): PurchaseOrderRow {
  return {
    id: "po-1",
    purchaseOrderNo: "P00000001",
    supplierCode: "SUP-A",
    supplierName: "A仕入先",
    orderDate: "2026-05-20",
    expectedDeliveryDate: "2026-05-23",
    status: "ordered",
    subtotal: 1000,
    taxAmount: 100,
    totalAmount: 1100,
    note: null,
    totalQuantity: 10,
    receivedQuantity: 0,
    ...overrides,
  };
}

beforeEach(() => {
  pushMock.mockReset();
});

describe("PurchaseOrdersTable", () => {
  const baseProps = {
    rows: [row()],
    total: 1,
    page: 1,
    pageSize: 20,
    query: "",
    status: "all" as const,
  };

  it("発注番号と仕入先名・金額が表示される", () => {
    render(<PurchaseOrdersTable {...baseProps} />);
    expect(screen.getByText("P00000001")).toBeInTheDocument();
    expect(screen.getByText("A仕入先")).toBeInTheDocument();
    expect(screen.getByText("¥1,100")).toBeInTheDocument();
  });

  it("ordered の行アクションは緑の『入荷確定』リンク（/receivings?po={id}）", () => {
    render(<PurchaseOrdersTable {...baseProps} />);
    const link = screen.getByRole("link", { name: /入荷確定/ });
    expect(link).toHaveAttribute("href", "/receivings?po=po-1");
    expect(link).toHaveClass("bg-success");
  });

  it("partial も『入荷確定』リンクが出る", () => {
    render(
      <PurchaseOrdersTable
        {...baseProps}
        rows={[row({ status: "partial", receivedQuantity: 3 })]}
      />
    );
    expect(
      screen.getByRole("link", { name: /入荷確定/ })
    ).toBeInTheDocument();
  });

  it("received の行は『詳細』リンク（/purchase-orders/{id}）になり、入荷確定リンクは出ない", () => {
    render(
      <PurchaseOrdersTable
        {...baseProps}
        rows={[row({ status: "received", receivedQuantity: 10 })]}
      />
    );
    expect(
      screen.queryByRole("link", { name: /入荷確定/ })
    ).toBeNull();
    const detail = screen.getByRole("link", { name: /詳細/ });
    expect(detail).toHaveAttribute("href", "/purchase-orders/po-1");
  });

  it("cancelled も『詳細』リンク", () => {
    render(
      <PurchaseOrdersTable
        {...baseProps}
        rows={[row({ status: "cancelled" })]}
      />
    );
    expect(
      screen.queryByRole("link", { name: /入荷確定/ })
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: /詳細/ })
    ).toBeInTheDocument();
  });

  it("行クリックで /purchase-orders/{id} へ router.push", async () => {
    const user = userEvent.setup();
    render(<PurchaseOrdersTable {...baseProps} />);
    await user.click(screen.getByText("A仕入先"));
    expect(pushMock).toHaveBeenCalledWith("/purchase-orders/po-1");
  });

  it("状態チップ『発注済み』で status=ordered URL に反映", async () => {
    const user = userEvent.setup();
    render(<PurchaseOrdersTable {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "発注済み" }));
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).toContain("status=ordered");
  });

  it("件数表示と「入荷を登録する」リンクが /receivings", () => {
    render(<PurchaseOrdersTable {...baseProps} />);
    expect(
      screen.getByRole("link", { name: /入荷を登録する/ })
    ).toHaveAttribute("href", "/receivings");
  });

  it("行がゼロなら『発注が見つかりませんでした』を表示", () => {
    render(<PurchaseOrdersTable {...baseProps} rows={[]} total={0} />);
    expect(
      screen.getByText("発注が見つかりませんでした")
    ).toBeInTheDocument();
  });

  it("入荷状況の進捗率が表示される（3/10 → 30%）", () => {
    render(
      <PurchaseOrdersTable
        {...baseProps}
        rows={[row({ totalQuantity: 10, receivedQuantity: 3 })]}
      />
    );
    expect(screen.getByText("3 / 10 個")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
  });
});
