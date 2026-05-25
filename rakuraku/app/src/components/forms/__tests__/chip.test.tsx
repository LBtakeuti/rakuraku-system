import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chip } from "../chip";

describe("Chip", () => {
  it("children を表示する", () => {
    render(<Chip>すべて</Chip>);
    expect(screen.getByRole("button", { name: "すべて" })).toBeInTheDocument();
  });

  it("active=false（既定）は aria-pressed='false' とミュート色クラス", () => {
    render(<Chip>x</Chip>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn).toHaveClass("bg-bg-muted");
    expect(btn).toHaveClass("text-text-secondary");
  });

  it("active=true で aria-pressed='true' とプライマリ色クラス", () => {
    render(<Chip active>x</Chip>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn).toHaveClass("bg-primary");
    expect(btn).toHaveClass("text-white");
  });

  it("クリックで onClick が呼ばれる", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Chip onClick={onClick}>x</Chip>);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("type='button' 属性が付く（誤って form submit させない）", () => {
    render(<Chip>x</Chip>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
