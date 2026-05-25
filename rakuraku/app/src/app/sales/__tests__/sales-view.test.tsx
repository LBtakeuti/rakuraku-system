import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SalesInvoiceRow, SalesSummary } from "@/types/sales-invoice";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/sales",
  useSearchParams: () => new URLSearchParams(""),
}));

import { SalesView } from "../sales-view";

function row(overrides: Partial<SalesInvoiceRow> = {}): SalesInvoiceRow {
  return {
    id: "inv-1",
    invoiceNo: "N00000001",
    customerCode: "000001",
    customerName: "A社",
    invoiceDate: "2026-05-20",
    sourceOrderNo: "800000001",
    subtotal: 1000,
    taxAmount: 100,
    totalAmount: 1100,
    billingStatus: "unbilled",
    staffName: null,
    lineCount: 2,
    ...overrides,
  };
}

const summary: SalesSummary = {
  totalAmount: 50000,
  invoiceCount: 12,
  customerCount: 5,
  periodLabel: "2026年5月",
};

beforeEach(() => {
  pushMock.mockReset();
});

describe("SalesView", () => {
  const baseProps = {
    rows: [row()],
    total: 1,
    page: 1,
    pageSize: 20,
    query: "",
    period: "this_month" as const,
    summary,
    periodLabel: "2026年5月",
  };

  it("サマリ 3 枚（売上 / 件数 / 取引社数）が表示される", () => {
    render(<SalesView {...baseProps} />);
    expect(screen.getByText("¥50,000")).toBeInTheDocument();
    expect(screen.getByText("12件")).toBeInTheDocument();
    expect(screen.getByText("5社")).toBeInTheDocument();
    expect(screen.getByText("2026年5月の売上（税込）")).toBeInTheDocument();
  });

  it("一覧行と日付フォーマット (YYYY/MM/DD)・金額", () => {
    render(<SalesView {...baseProps} />);
    expect(screen.getByText("N00000001")).toBeInTheDocument();
    expect(screen.getByText("A社")).toBeInTheDocument();
    expect(screen.getByText("2026/05/20")).toBeInTheDocument();
    // ¥1,100 が小計/合計列のどこかに必ず出る（合計列のみ）。
    expect(screen.getByText("¥1,100")).toBeInTheDocument();
  });

  it("billingStatus='billed' で『請求済み』バッジ", () => {
    render(
      <SalesView
        {...baseProps}
        rows={[row({ billingStatus: "billed" })]}
      />
    );
    expect(screen.getByText("請求済み")).toBeInTheDocument();
  });

  it("billingStatus='unbilled' で『未請求』バッジ", () => {
    render(<SalesView {...baseProps} />);
    expect(screen.getByText("未請求")).toBeInTheDocument();
  });

  it("期間タブ『今日』クリックで period=today が URL に反映", async () => {
    const user = userEvent.setup();
    render(<SalesView {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "今日" }));
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).toContain("period=today");
  });

  it("期間タブ『今月』は this_month がデフォルトなので period param が削除される", async () => {
    const user = userEvent.setup();
    render(<SalesView {...baseProps} period="last_month" />);
    await user.click(screen.getByRole("button", { name: "今月" }));
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).not.toContain("period=");
  });

  it("期間タブ『先月』『今年』『全期間』それぞれで URL に反映", async () => {
    const user = userEvent.setup();
    render(<SalesView {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "先月" }));
    expect(pushMock.mock.calls.at(-1)![0] as string).toContain(
      "period=last_month"
    );
    await user.click(screen.getByRole("button", { name: "今年" }));
    expect(pushMock.mock.calls.at(-1)![0] as string).toContain(
      "period=this_year"
    );
    await user.click(screen.getByRole("button", { name: "全期間" }));
    expect(pushMock.mock.calls.at(-1)![0] as string).toContain(
      "period=all"
    );
  });

  it("行クリックで /sales/{id} へ router.push", async () => {
    const user = userEvent.setup();
    render(<SalesView {...baseProps} />);
    await user.click(screen.getByText("A社"));
    expect(pushMock).toHaveBeenCalledWith("/sales/inv-1");
  });

  it("trailing の『詳細』リンクは /sales/{id}", () => {
    render(<SalesView {...baseProps} />);
    const link = screen.getByRole("link", { name: /詳細/ });
    expect(link).toHaveAttribute("href", "/sales/inv-1");
  });

  it("rows が空のときは『対象期間に納品書がありません』", () => {
    render(<SalesView {...baseProps} rows={[]} total={0} />);
    expect(
      screen.getByText("対象期間に納品書がありません")
    ).toBeInTheDocument();
  });

  it("期間ボタンの active 表示（this_month の時のみ bg-primary）", () => {
    render(<SalesView {...baseProps} />);
    const btn = screen.getByRole("button", { name: "今月" });
    expect(btn).toHaveClass("bg-primary");
    // 他のボタンは active でない
    const today = screen.getByRole("button", { name: "今日" });
    expect(today).not.toHaveClass("bg-primary");
  });

  it("検索 SearchBar に initialValue が反映される", () => {
    render(<SalesView {...baseProps} query="N0000" />);
    expect(
      screen.getByPlaceholderText("納品書番号、お客様名で検索...")
    ).toHaveValue("N0000");
  });

  it("検索 submit で q が URL に反映", async () => {
    const user = userEvent.setup();
    render(<SalesView {...baseProps} />);
    const input = screen.getByPlaceholderText(
      "納品書番号、お客様名で検索..."
    );
    await user.type(input, "N000");
    await user.click(screen.getByRole("button", { name: "検索" }));
    const url = pushMock.mock.calls.at(-1)![0] as string;
    expect(url).toContain("q=N000");
  });

  it("unitLabel に periodLabel が組み込まれる（『件の売上（2026年5月）』）", () => {
    render(<SalesView {...baseProps} />);
    expect(screen.getByText(/件の売上（2026年5月）/)).toBeInTheDocument();
  });

  it("data-table 内に行が描画されている（main 内の link 数で確認）", () => {
    render(<SalesView {...baseProps} rows={[row(), row({ id: "inv-2", invoiceNo: "N00000002" })]} total={2} />);
    // 行ごとに trailing の『詳細』リンクが 1 つ
    const links = screen.getAllByRole("link", { name: /詳細/ });
    expect(links).toHaveLength(2);
  });

  it("ヘッダ列が表示される（納品書番号 / 納品日 / お客様 / 商品数 / 税抜 / 消費税 / 合計 / 請求）", () => {
    render(<SalesView {...baseProps} />);
    const headers = ["納品書番号", "納品日", "お客様", "商品数", "税抜金額", "消費税", "合計（税込）", "請求"];
    for (const h of headers) {
      expect(screen.getByRole("columnheader", { name: h })).toBeInTheDocument();
    }
  });

  // 「summary card にアイコンと値が並ぶ」スモークだけ
  it("『売上（税込）』カードのアイコン背景が primary、件数カードが緑、社数カードがオレンジ", () => {
    const { container } = render(<SalesView {...baseProps} />);
    // SummaryCard は親 div 内に 12個の icon コンテナを持つ。クラスを直接見つけるよりも、
    // 値テキストの近傍要素から判定する。ここではクラス文字列ベースで簡易検証する。
    expect(container.querySelector(".bg-primary-light")).not.toBeNull();
    expect(container.querySelector(".bg-\\[\\#d1fae5\\]")).not.toBeNull();
    expect(container.querySelector(".bg-\\[\\#fed7aa\\]")).not.toBeNull();
  });

  // 構造的に period の値が thismonth で button に primary が付いている確認だけでなく
  // 他のボタンも一通り押せて引数が一意であることを確認する関連スモーク
  it("各期間ボタンに対して onChange が一度しか呼ばれない（クリック 1 回 = push 1 回）", async () => {
    const user = userEvent.setup();
    render(<SalesView {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "今日" }));
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  it("一覧の data-table 内 main を起点に行数を assertion（rows.length と一致）", () => {
    render(<SalesView {...baseProps} rows={[row(), row({ id: "inv-2", invoiceNo: "N00000002" })]} total={2} />);
    // tbody 内の tr 数で確認
    const tbody = document.querySelector("tbody")!;
    const trs = within(tbody).getAllByRole("row");
    expect(trs).toHaveLength(2);
  });
});
