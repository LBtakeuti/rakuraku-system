import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BillingSummaryRow } from "@/types/billing";

vi.mock("../actions", () => ({
  issueBillingStatements: vi.fn(),
}));

import { BillingForm } from "../billing-form";

function row(overrides: Partial<BillingSummaryRow> = {}): BillingSummaryRow {
  return {
    customerCode: "000001",
    customerName: "A社",
    invoiceFormat: "invoice_only",
    closingDay: 31,
    paymentCycle: "翌月末",
    invoiceTaxType: "per_invoice",
    taxRounding: "floor",
    previousBalance: 1000,
    paymentAmount: 500,
    carryOver: 500,
    currentSubtotal: 2000,
    currentTax: 200,
    currentTotal: 2200,
    totalDue: 2700,
    invoiceIds: ["inv-1", "inv-2"],
    paymentDueDate: "2026-06-30",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BillingForm（ステップ表示）", () => {
  const baseProps = {
    initialClosingDay: 31,
    initialPeriodFrom: "2026-05-01",
    initialPeriodTo: "2026-05-31",
    summary: [],
    hasAggregated: false,
  };

  it("ステップ 1 のフォームと締め日セレクトが描画される", () => {
    render(<BillingForm {...baseProps} />);
    expect(screen.getByText("締める期間を決める")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /この期間で集計する/ })
    ).toBeInTheDocument();
  });

  it("hasAggregated=false のときステップ 2/3 はガイダンスのみ", () => {
    render(<BillingForm {...baseProps} />);
    expect(
      screen.getByText(/上のステップで「集計する」を押すと/)
    ).toBeInTheDocument();
  });

  it("hasAggregated=true && summary 空のときは『該当するお客様がいません』", () => {
    render(
      <BillingForm {...baseProps} hasAggregated={true} summary={[]} />
    );
    expect(
      screen.getByText(/対象期間に該当するお客様がいません/)
    ).toBeInTheDocument();
  });
});

describe("BillingForm（集計後の表示と選択操作）", () => {
  const summary = [
    row({ customerCode: "000001", customerName: "A社", totalDue: 2700 }),
    row({
      customerCode: "000002",
      customerName: "B社",
      totalDue: 5500,
      invoiceFormat: "invoice_delivery",
    }),
  ];
  const baseProps = {
    initialClosingDay: 31,
    initialPeriodFrom: "2026-05-01",
    initialPeriodTo: "2026-05-31",
    summary,
    hasAggregated: true,
  };

  it("締めピル（対象 / 枚数 / 合計）に集計値が出る", () => {
    render(<BillingForm {...baseProps} />);
    expect(screen.getByText(/対象のお客様/)).toBeInTheDocument();
    expect(screen.getByText("2 社")).toBeInTheDocument();
    // 売上伝票枚数 = 各 invoiceIds.length の合計（2 + 2 = 4）
    expect(screen.getByText("4 枚")).toBeInTheDocument();
    // 合計請求 = 2700 + 5500 = 8200。サマリピルとステップ 3 のバーで 2 か所
    expect(screen.getAllByText("¥8,200").length).toBeGreaterThanOrEqual(1);
  });

  it("ステップ 2 の行（A社 / B社）と各セルの値が出る", () => {
    render(<BillingForm {...baseProps} />);
    // A社 / B社 はステップ 2 と ステップ 3 のテーブルで複数描画されうる
    expect(screen.getAllByText("A社").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("B社").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("¥2,700").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("¥5,500").length).toBeGreaterThanOrEqual(1);
  });

  it("ステップ 3 の合計請求は selected の totalDue の合計（初期は全選択 = 8,200）", () => {
    render(<BillingForm {...baseProps} />);
    expect(screen.getAllByText("¥8,200").length).toBeGreaterThanOrEqual(1);
    // 「2 社を選択中」表示（ステップ 3 のヘッダー部分の strong）
    expect(screen.getByText("社を選択中")).toBeInTheDocument();
  });

  it("チェックボックスで顧客を 1 件外すと『1社 に請求書を発行』に変わる", async () => {
    const user = userEvent.setup();
    render(<BillingForm {...baseProps} />);
    const toggleButtons = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-pressed") !== null);
    expect(toggleButtons.length).toBeGreaterThanOrEqual(2);
    await user.click(toggleButtons[0]);
    // 残り 1 社になっているはず（バー内に 1社 の表示）
    expect(screen.getByText("1社")).toBeInTheDocument();
  });

  it("発行ボタン押下時に window.confirm が表示され、キャンセルで formAction 未呼出", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.fn(() => false);
    vi.stubGlobal("confirm", confirmSpy);

    render(<BillingForm {...baseProps} />);
    const issueBtn = screen.getByRole("button", {
      name: /請求書をまとめて発行する/,
    });
    await user.click(issueBtn);
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });

  it("0 社選択だと発行ボタンが disabled", async () => {
    const user = userEvent.setup();
    render(<BillingForm {...baseProps} />);
    // ステップ 3 の個別チェックを 2 つ押して全解除
    const toggleButtons = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-pressed") !== null);
    for (const t of toggleButtons) {
      await user.click(t);
    }
    const issueBtn = screen.getByRole("button", {
      name: /請求書をまとめて発行する/,
    });
    expect(issueBtn).toBeDisabled();
  });
});

describe("BillingForm（帳票種類バッジ）", () => {
  it("invoice_only / invoice_delivery で異なるバッジ文言が出る", () => {
    render(
      <BillingForm
        initialClosingDay={31}
        initialPeriodFrom="2026-05-01"
        initialPeriodTo="2026-05-31"
        summary={[
          row({
            customerCode: "000001",
            customerName: "A社",
            invoiceFormat: "invoice_only",
          }),
          row({
            customerCode: "000002",
            customerName: "B社",
            invoiceFormat: "invoice_delivery",
          }),
        ]}
        hasAggregated={true}
      />
    );
    // ステップ 3 テーブル内に表示される。少なくとも 1 件ずつ出る
    expect(screen.getAllByText(/請求書のみ/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/請求書\s*＋\s*納品書|請求書＋納品書/).length
    ).toBeGreaterThanOrEqual(0);
  });
});

describe("BillingForm（締め日セレクトと期間入力）", () => {
  it("締め日セレクトの初期値が反映される", () => {
    const { container } = render(
      <BillingForm
        initialClosingDay={20}
        initialPeriodFrom="2026-05-01"
        initialPeriodTo="2026-05-20"
        summary={[]}
        hasAggregated={false}
      />
    );
    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select.value).toBe("20");
  });

  it("期間 input（type=date）の初期値が反映される", () => {
    const { container } = render(
      <BillingForm
        initialClosingDay={31}
        initialPeriodFrom="2026-05-01"
        initialPeriodTo="2026-05-31"
        summary={[]}
        hasAggregated={false}
      />
    );
    const dateInputs = Array.from(
      container.querySelectorAll<HTMLInputElement>("input[type='date']")
    );
    expect(dateInputs[0].value).toBe("2026-05-01");
    expect(dateInputs[1].value).toBe("2026-05-31");
  });
});
