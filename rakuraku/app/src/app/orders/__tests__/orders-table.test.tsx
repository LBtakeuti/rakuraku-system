import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SalesOrderRow } from "@/types/sales-order";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/orders",
  useSearchParams: () => new URLSearchParams(""),
}));

import { OrdersTable } from "../orders-table";

function row(overrides: Partial<SalesOrderRow> = {}): SalesOrderRow {
  return {
    id: "so-1",
    orderNo: "800000001",
    customerCode: "000001",
    customerName: "株式会社サンプル",
    deliveryAddressId: null,
    orderDate: "2026-05-22",
    deliveryDate: "2026-05-24",
    status: "pending",
    subtotal: 4000,
    taxAmount: 380,
    totalAmount: 4380,
    note: null,
    staffName: null,
    ...overrides,
  };
}

beforeEach(() => {
  pushMock.mockReset();
});

describe("OrdersTable", () => {
  const baseProps = {
    rows: [row()],
    total: 1,
    page: 1,
    pageSize: 20,
    query: "",
    status: "all" as const,
    period: "all" as const,
  };

  it("行と金額（¥4,380）・伝票番号が表示される", () => {
    render(<OrdersTable {...baseProps} />);
    expect(screen.getByText("800000001")).toBeInTheDocument();
    expect(screen.getByText("¥4,380")).toBeInTheDocument();
    expect(screen.getByText("株式会社サンプル")).toBeInTheDocument();
  });

  it("注文日が YYYY/MM/DD 形式に変換される", () => {
    render(<OrdersTable {...baseProps} />);
    expect(screen.getByText("2026/05/22")).toBeInTheDocument();
    expect(screen.getByText("2026/05/24")).toBeInTheDocument();
  });

  it("status='pending' は warning バッジで「納品待ち」（行内の span）", () => {
    render(<OrdersTable {...baseProps} />);
    // チップ（role=button）と行内の span が両方に存在するので、span を絞り込んで検証
    const matches = screen.getAllByText("納品待ち");
    const span = matches.find((el) => el.tagName === "SPAN");
    expect(span).toBeDefined();
    expect(span).toHaveClass("bg-warning-light");
  });

  it("rows が空のとき「注文が見つかりませんでした」", () => {
    render(<OrdersTable {...baseProps} rows={[]} total={0} />);
    expect(screen.getByText("注文が見つかりませんでした")).toBeInTheDocument();
  });

  it("「納品待ち」状態チップで URL に status=pending が付く", async () => {
    const user = userEvent.setup();
    render(<OrdersTable {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "納品待ち" }));
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).toContain("status=pending");
  });

  it("「今月」期間チップで URL に period=this_month が付く", async () => {
    const user = userEvent.setup();
    render(<OrdersTable {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "今月" }));
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).toContain("period=this_month");
  });

  it("期間「すべて」チップで period パラメータが削除される", async () => {
    const user = userEvent.setup();
    render(<OrdersTable {...baseProps} period="today" />);
    // 期間行の「すべて」は2つめのすべて。getAllByRole で取得。
    const allButtons = screen.getAllByRole("button", { name: "すべて" });
    // 状態行のすべて と 期間行のすべて で 2 つ。後者をクリック
    await user.click(allButtons[1]);
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).not.toContain("period=");
  });

  it("行クリックで /orders/{id} へ router.push", async () => {
    const user = userEvent.setup();
    render(<OrdersTable {...baseProps} />);
    await user.click(screen.getByText("株式会社サンプル"));
    expect(pushMock).toHaveBeenCalledWith("/orders/so-1");
  });

  it("「新しい注文を受ける」リンクは /orders/new", () => {
    render(<OrdersTable {...baseProps} />);
    expect(
      screen.getByRole("link", { name: /新しい注文を受ける/ })
    ).toHaveAttribute("href", "/orders/new");
  });

  it("検索フォーム送信で q パラメータが付与される", async () => {
    const user = userEvent.setup();
    render(<OrdersTable {...baseProps} />);
    const input = screen.getByLabelText("注文検索");
    await user.type(input, "800000");
    await user.click(screen.getByRole("button", { name: "検索" }));
    const url = pushMock.mock.calls.at(-1)?.[0] as string;
    expect(url).toContain("q=800000");
  });

  it("総ページ数 > 1 でページネーションが描画される", () => {
    render(
      <OrdersTable {...baseProps} total={50} page={2} pageSize={20} />
    );
    expect(screen.getByText("2 / 3 ページ")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "前へ" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "次へ" })).toBeEnabled();
  });
});
