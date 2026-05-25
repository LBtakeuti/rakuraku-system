import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../badge";

describe("Badge", () => {
  it("variant=required の既定ラベルが「必須」になる", () => {
    render(<Badge variant="required" data-testid="b" />);
    expect(screen.getByTestId("b")).toHaveTextContent("必須");
  });

  it("variant=optional の既定ラベルが「任意」になる", () => {
    render(<Badge variant="optional" data-testid="b" />);
    expect(screen.getByTestId("b")).toHaveTextContent("任意");
  });

  it("variant=default は children が無ければ空表示", () => {
    render(<Badge data-testid="b" />);
    expect(screen.getByTestId("b")).toHaveTextContent("");
  });

  it("children を渡すと既定ラベルより優先される", () => {
    render(
      <Badge variant="required" data-testid="b">
        カスタム
      </Badge>
    );
    expect(screen.getByTestId("b")).toHaveTextContent("カスタム");
  });

  it.each([
    ["required", ["bg-danger-light", "text-danger"]],
    ["optional", ["bg-bg-muted", "text-text-secondary"]],
    ["default", ["bg-primary-lighter", "text-primary"]],
  ] as const)("variant=%s で対応クラスが付与される", (variant, classes) => {
    render(<Badge variant={variant} data-testid="b" />);
    const el = screen.getByTestId("b");
    for (const c of classes) {
      expect(el).toHaveClass(c);
    }
  });

  it("追加の className がマージされる", () => {
    render(<Badge className="custom-class" data-testid="b" />);
    expect(screen.getByTestId("b")).toHaveClass("custom-class");
  });
});
