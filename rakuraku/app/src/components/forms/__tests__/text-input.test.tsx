import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TextInput } from "../text-input";

describe("TextInput", () => {
  it("既定では border-border-default、エラー時は border-danger", () => {
    const { rerender } = render(<TextInput data-testid="i" />);
    expect(screen.getByTestId("i")).toHaveClass("border-border-default");
    rerender(<TextInput data-testid="i" invalid />);
    expect(screen.getByTestId("i")).toHaveClass("border-danger");
  });

  it("追加 className がマージされる", () => {
    render(<TextInput data-testid="i" className="pl-10" />);
    expect(screen.getByTestId("i")).toHaveClass("pl-10");
  });

  it("placeholder が反映される", () => {
    render(<TextInput placeholder="検索..." />);
    expect(screen.getByPlaceholderText("検索...")).toBeInTheDocument();
  });
});
