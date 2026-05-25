import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CustomerSearchResult } from "@/lib/supabase/queries/sales-order";

// client-actions.ts は Server Action（"use server"）。テストでは呼び出しを無視するスタブで OK。
vi.mock("../client-actions", () => ({
  searchCustomersAction: vi.fn(async () => [] as CustomerSearchResult[]),
}));

import { CustomerPicker } from "../customer-picker";

const sample: CustomerSearchResult = {
  customerCode: "000001",
  name: "株式会社サンプル",
  nameKana: "カブシキガイシャサンプル",
  address: "東京都千代田区",
  phone: "03-0000-0000",
};

describe("CustomerPicker", () => {
  it("未選択 + 未オープン時はトリガーボタンを描画", () => {
    render(
      <CustomerPicker
        selected={null}
        onSelect={() => {}}
        onClear={() => {}}
      />
    );
    expect(
      screen.getByRole("button", { name: /お客様を選んでください/ })
    ).toBeInTheDocument();
  });

  it("トリガーボタンをクリックで検索パネルが開く", async () => {
    const user = userEvent.setup();
    render(
      <CustomerPicker
        selected={null}
        onSelect={() => {}}
        onClear={() => {}}
      />
    );
    await user.click(
      screen.getByRole("button", { name: /お客様を選んでください/ })
    );
    expect(
      screen.getByPlaceholderText(/お客様の名前、コード、フリガナで検索/)
    ).toBeInTheDocument();
  });

  it("selected が渡されると顧客情報カードと「変更する」ボタン", () => {
    render(
      <CustomerPicker
        selected={sample}
        onSelect={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByText("株式会社サンプル")).toBeInTheDocument();
    expect(screen.getByText(/東京都千代田区/)).toBeInTheDocument();
    expect(screen.getByText(/03-0000-0000/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "変更する" })).toBeInTheDocument();
  });

  it("「変更する」クリックで onClear が呼ばれる", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <CustomerPicker
        selected={sample}
        onSelect={() => {}}
        onClear={onClear}
      />
    );
    await user.click(screen.getByRole("button", { name: "変更する" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
