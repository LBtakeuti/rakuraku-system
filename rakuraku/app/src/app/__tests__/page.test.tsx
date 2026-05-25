import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import HomePage from "../page";

describe("HomePage（ホーム画面）", () => {
  it("見出し「こんにちは、山田さん」と案内文が表示される", () => {
    render(<HomePage />);
    expect(screen.getByText("こんにちは、山田さん")).toBeInTheDocument();
    expect(
      screen.getByText("今日はどの作業をしますか？ ボタンを押して始めてください")
    ).toBeInTheDocument();
  });

  it.each([
    ["注文を受ける", "/orders/new"],
    ["納品する", "/deliveries"],
    ["入荷を登録する", "/receivings"],
    ["注文を見る", "/orders"],
    ["在庫を見る", "/stocks"],
    ["発注を見る", "/purchase-orders"],
    ["お客様を管理する", "/customers"],
    ["商品を管理する", "/products"],
    ["売上を見る", "/sales"],
    ["請求の業務", "/billing"],
  ])("「%s」ボタンの href が %s になっている", (title, href) => {
    render(<HomePage />);
    const link = screen.getByRole("link", { name: new RegExp(title) });
    expect(link).toHaveAttribute("href", href);
  });

  it("BigButton が 10 個レンダリングされる", () => {
    render(<HomePage />);
    // main 配下のリンクのみカウント（TopHeader にはリンクは無い）
    const mainEl = screen.getByRole("main");
    const links = within(mainEl).getAllByRole("link");
    expect(links).toHaveLength(10);
  });

  it("TopHeader が描画されている（タイトル文言の存在で確認）", () => {
    render(<HomePage />);
    expect(screen.getByText("らくらく受発注システム")).toBeInTheDocument();
  });
});
