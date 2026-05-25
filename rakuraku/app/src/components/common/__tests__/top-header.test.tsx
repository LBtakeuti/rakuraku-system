import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopHeader } from "../top-header";

describe("TopHeader", () => {
  it("userName 未指定時はデフォルト「山田 太郎」とイニシャル「山」が表示される", () => {
    render(<TopHeader currentDate="2026年5月25日(月)" />);
    expect(screen.getByText("山田 太郎 さん")).toBeInTheDocument();
    expect(screen.getByText("山")).toBeInTheDocument();
  });

  it("userName を渡すと表示・イニシャルに反映される", () => {
    render(<TopHeader userName="佐藤 花子" currentDate="2026年5月25日(月)" />);
    expect(screen.getByText("佐藤 花子 さん")).toBeInTheDocument();
    expect(screen.getByText("佐")).toBeInTheDocument();
  });

  it("currentDate を渡すとそのまま表示される（YYYY年M月D日(曜) 形式想定）", () => {
    render(<TopHeader currentDate="2026年1月7日(水)" />);
    expect(screen.getByText("2026年1月7日(水)")).toBeInTheDocument();
  });

  describe("currentDate 未指定時は new Date() を YYYY年M月D日(曜) でフォーマットする", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("2026-05-25 (月) → 「2026年5月25日(月)」", () => {
      vi.setSystemTime(new Date(2026, 4, 25, 12, 0, 0));
      render(<TopHeader />);
      expect(screen.getByText("2026年5月25日(月)")).toBeInTheDocument();
    });

    it("月日が一桁の日付でゼロ埋めされない（2026-01-07 (水) → 「2026年1月7日(水)」）", () => {
      vi.setSystemTime(new Date(2026, 0, 7, 12, 0, 0));
      render(<TopHeader />);
      expect(screen.getByText("2026年1月7日(水)")).toBeInTheDocument();
    });

    it("日曜日が「日」、土曜日が「土」になる", () => {
      vi.setSystemTime(new Date(2026, 0, 4, 12, 0, 0)); // 2026-01-04 日曜
      const { unmount } = render(<TopHeader />);
      expect(screen.getByText("2026年1月4日(日)")).toBeInTheDocument();
      unmount();

      vi.setSystemTime(new Date(2026, 0, 3, 12, 0, 0)); // 2026-01-03 土曜
      render(<TopHeader />);
      expect(screen.getByText("2026年1月3日(土)")).toBeInTheDocument();
    });
  });

  it("ロゴ「楽」とタイトル「らくらく受発注システム」が表示される", () => {
    render(<TopHeader currentDate="2026年5月25日(月)" />);
    expect(screen.getByText("楽")).toBeInTheDocument();
    expect(screen.getByText("らくらく受発注システム")).toBeInTheDocument();
  });
});
