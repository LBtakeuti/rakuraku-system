import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../status-badge";

describe("StatusBadge", () => {
  it("children を表示する", () => {
    render(<StatusBadge>進行中</StatusBadge>);
    expect(screen.getByText("進行中")).toBeInTheDocument();
  });

  it.each([
    ["success", ["bg-success-light", "text-success"]],
    ["warning", ["bg-warning-light", "text-warning"]],
    ["danger", ["bg-danger-light", "text-danger"]],
    ["info", ["bg-info-light", "text-info"]],
    ["muted", ["bg-bg-muted", "text-text-secondary"]],
  ] as const)("variant=%s で対応クラスが付与される", (variant, classes) => {
    render(
      <StatusBadge variant={variant} data-testid="s">
        x
      </StatusBadge>
    );
    const el = screen.getByTestId("s");
    for (const c of classes) {
      expect(el).toHaveClass(c);
    }
  });

  it("variant 未指定時は muted がデフォルトになる", () => {
    render(<StatusBadge data-testid="s">x</StatusBadge>);
    expect(screen.getByTestId("s")).toHaveClass("bg-bg-muted");
  });
});
