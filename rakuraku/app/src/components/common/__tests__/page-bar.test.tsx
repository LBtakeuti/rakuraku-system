import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageBar } from "../page-bar";

describe("PageBar", () => {
  it("title が表示される", () => {
    render(<PageBar title="お客様一覧" />);
    expect(screen.getByText("お客様一覧")).toBeInTheDocument();
  });

  it("backTo 未指定時は「/」がリンク先になる", () => {
    render(<PageBar title="t" />);
    const link = screen.getByRole("link", { name: /ホームに戻る/ });
    expect(link).toHaveAttribute("href", "/");
  });

  it("backTo を渡すとリンク先に反映される", () => {
    render(<PageBar title="t" backTo="/orders" />);
    const link = screen.getByRole("link", { name: /ホームに戻る/ });
    expect(link).toHaveAttribute("href", "/orders");
  });
});
