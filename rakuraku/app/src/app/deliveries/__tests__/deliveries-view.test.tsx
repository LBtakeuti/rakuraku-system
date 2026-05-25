import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DeliverableOrder } from "@/types/sales-invoice";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/deliveries",
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("../actions", () => ({
  confirmDelivery: vi.fn(),
}));

import { DeliveriesView } from "../deliveries-view";

function order(overrides: Partial<DeliverableOrder> = {}): DeliverableOrder {
  return {
    id: "so-1",
    orderNo: "800000001",
    customerCode: "000001",
    customerName: "A社",
    orderDate: "2026-05-20",
    deliveryDate: "2026-05-22",
    totalAmount: 1100,
    lineCount: 2,
    urgency: "today",
    ...overrides,
  };
}

beforeEach(() => {
  pushMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DeliveriesView", () => {
  const baseProps = {
    orders: [order(), order({ id: "so-2", orderNo: "800000002", urgency: "tomorrow" as const, customerName: "B社", totalAmount: 2200, deliveryDate: "2026-05-23" })],
    query: "",
    range: "this_week" as const,
  };

  it("注文一覧と緊急度バッジが描画される", () => {
    render(<DeliveriesView {...baseProps} />);
    expect(screen.getByText("#800000001")).toBeInTheDocument();
    expect(screen.getByText("#800000002")).toBeInTheDocument();
    expect(screen.getByText("A社")).toBeInTheDocument();
    expect(screen.getByText("本日が納品日")).toBeInTheDocument();
    expect(screen.getByText("明日が納品日")).toBeInTheDocument();
  });

  it("rows が空のときに『納品待ちの注文がありません』を表示", () => {
    render(<DeliveriesView {...baseProps} orders={[]} />);
    expect(
      screen.getByText("納品待ちの注文がありません")
    ).toBeInTheDocument();
  });

  it("注文 1 件を選択すると確認バーが現れ件数と合計金額が表示される", async () => {
    const user = userEvent.setup();
    render(<DeliveriesView {...baseProps} />);

    // 確認バーは初期は出ない
    expect(
      screen.queryByRole("button", { name: /納品を確定する/ })
    ).toBeNull();

    // 800000001 をクリックしてトグル
    await user.click(screen.getByText("#800000001"));

    expect(screen.getByText("1件")).toBeInTheDocument();
    // 行内と確定バー内の 2 箇所に同じ ¥1,100 が出る
    expect(screen.getAllByText(/¥1,100/).length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByRole("button", { name: /納品を確定する/ })
    ).toBeInTheDocument();
  });

  it("2 件選択すると合計金額が加算される（1100 + 2200 = 3300）", async () => {
    const user = userEvent.setup();
    render(<DeliveriesView {...baseProps} />);
    await user.click(screen.getByText("#800000001"));
    await user.click(screen.getByText("#800000002"));
    expect(screen.getByText("2件")).toBeInTheDocument();
    expect(screen.getByText(/¥3,300/)).toBeInTheDocument();
  });

  it("『選択を解除』で 0 件に戻り確認バーが消える", async () => {
    const user = userEvent.setup();
    render(<DeliveriesView {...baseProps} />);
    await user.click(screen.getByText("#800000001"));
    expect(screen.getByText("1件")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "選択を解除" }));
    expect(
      screen.queryByRole("button", { name: /納品を確定する/ })
    ).toBeNull();
  });

  it("確定ボタン押下時に window.confirm が表示され、キャンセルしたら formAction が呼ばれない", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.fn(() => false);
    vi.stubGlobal("confirm", confirmSpy);

    render(<DeliveriesView {...baseProps} />);
    await user.click(screen.getByText("#800000001"));
    await user.click(screen.getByRole("button", { name: /納品を確定する/ }));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    // バーが残っているので押せる状態
    expect(
      screen.getByRole("button", { name: /納品を確定する/ })
    ).toBeInTheDocument();
  });

  it("「今日まで」チップ押下で range=today が URL に反映", async () => {
    const user = userEvent.setup();
    render(<DeliveriesView {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "今日まで" }));
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).toContain("range=today");
  });

  it("「今週まで」チップ押下で range param が削除される", async () => {
    const user = userEvent.setup();
    render(<DeliveriesView {...baseProps} range="today" />);
    await user.click(screen.getByRole("button", { name: "今週まで" }));
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).not.toContain("range=");
  });

  it("「詳細」リンクは /orders/{id} へ", () => {
    render(<DeliveriesView {...baseProps} />);
    const links = screen.getAllByRole("link", { name: "詳細" });
    expect(links[0]).toHaveAttribute("href", "/orders/so-1");
    expect(links[1]).toHaveAttribute("href", "/orders/so-2");
  });
});
