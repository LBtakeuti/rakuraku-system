import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlaceholderPage } from "../placeholder-page";

vi.mock("@/components/common/top-header", () => ({
  TopHeader: () => <div data-testid="top-header">らくらく受発注システム</div>,
}));

describe("PlaceholderPage", () => {
  it("title が PageBar に渡る", () => {
    render(<PlaceholderPage title="売上一覧" />);
    expect(screen.getByText("売上一覧")).toBeInTheDocument();
  });

  it("準備中メッセージが表示される", () => {
    render(<PlaceholderPage title="t" />);
    expect(screen.getByText("この画面は準備中です")).toBeInTheDocument();
    expect(
      screen.getByText(
        "次のフェーズで実装します。「ホームに戻る」から戻ってください。"
      )
    ).toBeInTheDocument();
  });

  it("TopHeader と PageBar が両方描画される（「ホームに戻る」リンクの存在で確認）", () => {
    render(<PlaceholderPage title="t" />);
    expect(
      screen.getByRole("link", { name: /ホームに戻る/ })
    ).toBeInTheDocument();
    expect(screen.getByText("らくらく受発注システム")).toBeInTheDocument();
  });
});
