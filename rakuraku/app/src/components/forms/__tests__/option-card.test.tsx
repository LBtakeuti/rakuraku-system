import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptionCard } from "../option-card";

describe("OptionCard", () => {
  it("title と description が表示される", () => {
    render(
      <OptionCard
        selected={false}
        onSelect={() => {}}
        title="末日締め"
        description="月末にまとめます"
      />
    );
    expect(screen.getByText("末日締め")).toBeInTheDocument();
    expect(screen.getByText("月末にまとめます")).toBeInTheDocument();
  });

  it("description 省略時は何も描画されない", () => {
    render(<OptionCard selected={false} onSelect={() => {}} title="t" />);
    expect(screen.getByText("t")).toBeInTheDocument();
  });

  it("selected=false で aria-pressed='false'", () => {
    render(<OptionCard selected={false} onSelect={() => {}} title="t" />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("selected=true で aria-pressed='true' と primary 枠", () => {
    render(<OptionCard selected={true} onSelect={() => {}} title="t" />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn).toHaveClass("border-primary");
    expect(btn).toHaveClass("bg-primary-lighter");
  });

  it("クリックで onSelect が呼ばれる", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<OptionCard selected={false} onSelect={onSelect} title="t" />);
    await user.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
