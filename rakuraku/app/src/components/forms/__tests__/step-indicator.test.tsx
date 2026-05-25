import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepIndicator } from "../step-indicator";

const STEPS = [
  { num: 1 as const, label: "基本情報" },
  { num: 2 as const, label: "連絡先" },
  { num: 3 as const, label: "請求設定" },
];

describe("StepIndicator", () => {
  it("各ステップのラベルが描画される", () => {
    render(<StepIndicator current={1} steps={STEPS} />);
    expect(screen.getByText("基本情報")).toBeInTheDocument();
    expect(screen.getByText("連絡先")).toBeInTheDocument();
    expect(screen.getByText("請求設定")).toBeInTheDocument();
  });

  it("current=1 のとき: 1=active, 2/3=pending（番号で表示）", () => {
    render(<StepIndicator current={1} steps={STEPS} />);
    // current ラベルは text-primary, pending は text-text-muted
    expect(screen.getByText("基本情報")).toHaveClass("text-primary");
    expect(screen.getByText("連絡先")).toHaveClass("text-text-muted");
    expect(screen.getByText("請求設定")).toHaveClass("text-text-muted");
    // current 円は bg-primary
    expect(screen.getByText("1")).toHaveClass("bg-primary");
    // pending 円は番号表示・bg-bg-surface
    expect(screen.getByText("2")).toHaveClass("bg-bg-surface");
    expect(screen.getByText("3")).toHaveClass("bg-bg-surface");
  });

  it("current=2 のとき: 1=done(Check), 2=active, 3=pending", () => {
    const { container } = render(<StepIndicator current={2} steps={STEPS} />);
    // done ラベルは text-success
    expect(screen.getByText("基本情報")).toHaveClass("text-success");
    expect(screen.getByText("連絡先")).toHaveClass("text-primary");
    expect(screen.getByText("請求設定")).toHaveClass("text-text-muted");
    // done 円は番号ではなく Check アイコン（svg.lucide-check）
    const checkIcons = container.querySelectorAll("svg.lucide-check");
    expect(checkIcons).toHaveLength(1);
    // active 円は bg-primary
    expect(screen.getByText("2")).toHaveClass("bg-primary");
  });

  it("current=3 のとき: 1/2=done(Check)、3=active", () => {
    const { container } = render(<StepIndicator current={3} steps={STEPS} />);
    const checkIcons = container.querySelectorAll("svg.lucide-check");
    expect(checkIcons).toHaveLength(2);
    expect(screen.getByText("基本情報")).toHaveClass("text-success");
    expect(screen.getByText("連絡先")).toHaveClass("text-success");
    expect(screen.getByText("請求設定")).toHaveClass("text-primary");
    expect(screen.getByText("3")).toHaveClass("bg-primary");
  });
});
