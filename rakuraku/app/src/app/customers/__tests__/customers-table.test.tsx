import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CustomerRow } from "@/types/customer";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/customers",
  useSearchParams: () => new URLSearchParams(""),
}));

import { CustomersTable } from "../customers-table";

function row(overrides: Partial<CustomerRow> = {}): CustomerRow {
  return {
    customerCode: "000001",
    name: "株式会社サンプル",
    nameKana: null,
    postalCode: null,
    address: "東京都千代田区",
    building: null,
    phone: "03-0000-0000",
    fax: null,
    contactPerson: null,
    email: null,
    rank: "A",
    status: "active",
    staffId: null,
    staffName: "山田 太郎",
    invoiceFormat: "invoice_only",
    closingDay: 31,
    paymentCycle: null,
    invoiceTaxType: "per_line",
    taxRounding: "floor",
    ...overrides,
  };
}

beforeEach(() => {
  pushMock.mockReset();
});

describe("CustomersTable", () => {
  const baseProps = {
    rows: [row()],
    total: 1,
    page: 1,
    pageSize: 20,
    query: "",
    status: "all" as const,
  };

  it("件数表示と行が描画される", () => {
    render(<CustomersTable {...baseProps} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("株式会社サンプル")).toBeInTheDocument();
  });

  it("rows が空のとき「お客様が見つかりませんでした」が出る", () => {
    render(<CustomersTable {...baseProps} rows={[]} total={0} />);
    expect(
      screen.getByText("お客様が見つかりませんでした")
    ).toBeInTheDocument();
  });

  it("status='active' のチップが押下状態（aria-pressed='true'）", () => {
    render(<CustomersTable {...baseProps} status="active" />);
    const activeChip = screen.getByRole("button", { name: "取引中のみ" });
    expect(activeChip).toHaveAttribute("aria-pressed", "true");
  });

  it("「休止中」チップをクリックすると router.push が status=paused 付きで呼ばれる", async () => {
    const user = userEvent.setup();
    render(<CustomersTable {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "休止中" }));
    expect(pushMock).toHaveBeenCalledTimes(1);
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).toContain("/customers?");
    expect(url).toContain("status=paused");
  });

  it("「すべて」チップをクリックすると status パラメータが削除される（URLに含まれない）", async () => {
    const user = userEvent.setup();
    render(<CustomersTable {...baseProps} status="active" />);
    await user.click(screen.getByRole("button", { name: "すべて" }));
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).not.toContain("status=");
  });

  it("検索フォーム送信で q パラメータが付与される", async () => {
    const user = userEvent.setup();
    render(<CustomersTable {...baseProps} />);
    const input = screen.getByLabelText("お客様検索");
    await user.type(input, "サンプル");
    await user.click(screen.getByRole("button", { name: "検索" }));
    const url = pushMock.mock.calls.at(-1)?.[0] as string;
    expect(url).toContain("q=");
    expect(decodeURIComponent(url)).toContain("サンプル");
  });

  it("行クリックで /customers/{code}/edit へ router.push", async () => {
    const user = userEvent.setup();
    render(<CustomersTable {...baseProps} />);
    await user.click(screen.getByText("株式会社サンプル"));
    expect(pushMock).toHaveBeenCalledWith("/customers/000001/edit");
  });

  it("「新しいお客様を追加する」リンクは /customers/new", () => {
    render(<CustomersTable {...baseProps} />);
    const link = screen.getByRole("link", { name: /新しいお客様を追加する/ });
    expect(link).toHaveAttribute("href", "/customers/new");
  });

  it("件数が pageSize 以下のときページネーションは描画されない", () => {
    render(<CustomersTable {...baseProps} total={10} pageSize={20} />);
    expect(screen.queryByRole("button", { name: "前へ" })).toBeNull();
    expect(screen.queryByRole("button", { name: "次へ" })).toBeNull();
  });

  it("総ページ数 > 1 のときページネーションが描画される", () => {
    render(<CustomersTable {...baseProps} total={50} page={2} pageSize={20} />);
    expect(screen.getByRole("button", { name: "前へ" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "次へ" })).toBeEnabled();
    expect(screen.getByText("2 / 3 ページ")).toBeInTheDocument();
  });

  it("先頭ページでは「前へ」が disabled、最終ページでは「次へ」が disabled", () => {
    const { rerender } = render(
      <CustomersTable {...baseProps} total={50} page={1} pageSize={20} />
    );
    expect(screen.getByRole("button", { name: "前へ" })).toBeDisabled();
    rerender(<CustomersTable {...baseProps} total={50} page={3} pageSize={20} />);
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
  });
});
