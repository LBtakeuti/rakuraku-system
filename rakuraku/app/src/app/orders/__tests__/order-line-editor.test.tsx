import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, useFieldArray } from "react-hook-form";

// client-actions.ts は Server Action。検索は無効化（テストでは候補非表示でも OK）。
vi.mock("../client-actions", () => ({
  searchProductsAction: vi.fn(async () => []),
}));

import { OrderLineEditor } from "../order-line-editor";
import type { SalesOrderFormValues } from "@/lib/validations/sales-order";

function Host({
  defaultLines,
}: {
  defaultLines: SalesOrderFormValues["lines"];
}) {
  const form = useForm<SalesOrderFormValues>({
    defaultValues: {
      customerCode: "",
      deliveryAddressId: "",
      orderDate: "2026-05-22",
      deliveryDate: "2026-05-24",
      note: "",
      lines: defaultLines,
    },
  });
  const fa = useFieldArray({ control: form.control, name: "lines" });
  return (
    <OrderLineEditor
      fields={fa.fields}
      append={fa.append}
      remove={fa.remove}
      control={form.control}
      setValue={form.setValue}
      watch={form.watch}
      getValues={form.getValues}
    />
  );
}

const blankLine = {
  productCode: "",
  productName: "",
  productMeta: "",
  quantity: 0,
  unitPrice: 0,
  taxRate: 0.1 as const,
  orderType: "order_at_sale" as const,
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("OrderLineEditor", () => {
  it("「商品の行を追加する」ボタンで行が増える", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Host defaultLines={[blankLine]} />);
    // 初期は 1 行（行番号 1）
    expect(screen.getByText("1")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /商品の行を追加する/ })
    );
    // 行番号 2 が現れる
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("削除ボタンで行が消え、Undo トーストが現れる（『行を削除しました』と『元に戻す』）", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Host defaultLines={[blankLine, { ...blankLine }]} />);
    const before = screen.getAllByRole("button", { name: /行目を削除/ });
    expect(before).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "1行目を削除" }));

    const after = screen.queryAllByRole("button", { name: /行目を削除/ });
    expect(after).toHaveLength(1);
    expect(screen.getByText("行を削除しました")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "元に戻す" })
    ).toBeInTheDocument();
  });

  it("Undo トーストは 6 秒後に自動で消える", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Host defaultLines={[blankLine, { ...blankLine }]} />);
    await user.click(screen.getByRole("button", { name: "1行目を削除" }));
    expect(screen.getByText("行を削除しました")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(6001);
    });
    expect(screen.queryByText("行を削除しました")).toBeNull();
  });

  it("「元に戻す」ボタンで削除した行が復元される", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Host defaultLines={[blankLine, { ...blankLine }]} />);
    await user.click(screen.getByRole("button", { name: "1行目を削除" }));
    expect(
      screen.queryAllByRole("button", { name: /行目を削除/ })
    ).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "元に戻す" }));
    expect(
      screen.queryAllByRole("button", { name: /行目を削除/ })
    ).toHaveLength(2);
    expect(screen.queryByText("行を削除しました")).toBeNull();
  });

  it("最終行の数量入力中に ↓ キーで新しい行が追加される", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Host defaultLines={[blankLine]} />);
    // 数量 input（型 number）を取得し focus
    const qtyInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="number"]')
    );
    // 数量 input は単価より先に出現する（テーブル列順）
    // 1 行目なので qtyInputs[0]
    qtyInputs[0].focus();
    await user.keyboard("{ArrowDown}");
    // 行が 2 行に増える
    expect(
      screen.queryAllByRole("button", { name: /行目を削除/ })
    ).toHaveLength(2);
  });

  it("初期 lines=[] のときに自動的に空行が 1 行 append される", () => {
    render(<Host defaultLines={[]} />);
    expect(
      screen.queryAllByRole("button", { name: /行目を削除/ })
    ).toHaveLength(1);
  });

  it("合計表示：単価 1000 × 3 = 3000、税 10% = 300 → 合計 ¥3,300", async () => {
    const lines = [
      {
        productCode: "P1",
        productName: "A",
        productMeta: "",
        quantity: 3,
        unitPrice: 1000,
        taxRate: 0.1 as const,
        orderType: "stock" as const,
      },
    ];
    render(<Host defaultLines={lines} />);
    // 行の金額セル + 小計の 2 か所に同じ ¥3,000 が出る
    expect(screen.getAllByText("¥3,000")).toHaveLength(2);
    expect(screen.getByText("¥300")).toBeInTheDocument();
    expect(screen.getByText("¥3,300")).toBeInTheDocument();
  });

  it("合計表示：10% と 8% の行が混在しても税はそれぞれ計算される", () => {
    const lines = [
      {
        productCode: "P1",
        productName: "A",
        productMeta: "",
        quantity: 1,
        unitPrice: 1000,
        taxRate: 0.1 as const,
        orderType: "stock" as const,
      },
      {
        productCode: "P2",
        productName: "B",
        productMeta: "",
        quantity: 1,
        unitPrice: 500,
        taxRate: 0.08 as const,
        orderType: "stock" as const,
      },
    ];
    render(<Host defaultLines={lines} />);
    expect(screen.getByText("消費税(10%)")).toBeInTheDocument();
    expect(screen.getByText("消費税(8%)")).toBeInTheDocument();
    expect(screen.getByText("¥100")).toBeInTheDocument(); // 1000 * 0.1
    expect(screen.getByText("¥40")).toBeInTheDocument(); // 500 * 0.08
    expect(screen.getByText("¥1,640")).toBeInTheDocument(); // 1500 + 140
  });
});
