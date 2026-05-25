import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InvoiceFormatCard } from "../invoice-format-card";

describe("InvoiceFormatCard", () => {
  it("title と description が表示される", () => {
    render(
      <InvoiceFormatCard
        variant="invoice_only"
        title="請求書のみ"
        description="月に1回まとめて請求書を出します"
        selected={false}
        onSelect={() => {}}
      />
    );
    expect(screen.getByText("請求書のみ")).toBeInTheDocument();
    expect(
      screen.getByText("月に1回まとめて請求書を出します")
    ).toBeInTheDocument();
  });

  it("selected=false で aria-pressed='false' とミュート枠", () => {
    render(
      <InvoiceFormatCard
        variant="invoice_only"
        title="t"
        description="d"
        selected={false}
        onSelect={() => {}}
      />
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn).toHaveClass("border-border-default");
  });

  it("selected=true で aria-pressed='true' と primary 枠", () => {
    render(
      <InvoiceFormatCard
        variant="invoice_only"
        title="t"
        description="d"
        selected={true}
        onSelect={() => {}}
      />
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn).toHaveClass("border-primary");
    expect(btn).toHaveClass("bg-primary-lighter");
  });

  it("selected=true のとき radio 丸の内側ドット（bg-primary）が現れる", () => {
    const { container } = render(
      <InvoiceFormatCard
        variant="invoice_only"
        title="t"
        description="d"
        selected={true}
        onSelect={() => {}}
      />
    );
    const innerDot = container.querySelector("span.bg-primary");
    expect(innerDot).not.toBeNull();
  });

  it("selected=false のとき radio 丸の内側ドットは無い", () => {
    const { container } = render(
      <InvoiceFormatCard
        variant="invoice_only"
        title="t"
        description="d"
        selected={false}
        onSelect={() => {}}
      />
    );
    const innerDot = container.querySelector("span.bg-primary");
    expect(innerDot).toBeNull();
  });

  it("variant='invoice_only' は mini preview が「請求書」1枚のみ", () => {
    render(
      <InvoiceFormatCard
        variant="invoice_only"
        title="t"
        description="d"
        selected={false}
        onSelect={() => {}}
      />
    );
    expect(screen.getAllByText("請求書")).toHaveLength(1);
    expect(screen.queryByText("納品書")).toBeNull();
  });

  it("variant='invoice_delivery' は mini preview が「請求書」と「納品書」2枚", () => {
    render(
      <InvoiceFormatCard
        variant="invoice_delivery"
        title="t"
        description="d"
        selected={false}
        onSelect={() => {}}
      />
    );
    expect(screen.getAllByText("請求書")).toHaveLength(1);
    expect(screen.getAllByText("納品書")).toHaveLength(1);
  });

  it("クリックで onSelect が呼ばれる", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <InvoiceFormatCard
        variant="invoice_only"
        title="t"
        description="d"
        selected={false}
        onSelect={onSelect}
      />
    );
    await user.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
