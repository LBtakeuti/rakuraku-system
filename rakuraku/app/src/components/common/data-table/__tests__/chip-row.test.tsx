import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChipRow } from "../chip-row";

type Status = "all" | "pending" | "fulfilled";
const OPTIONS = [
  { value: "all" as const, label: "すべて" },
  { value: "pending" as const, label: "納品待ち" },
  { value: "fulfilled" as const, label: "納品済み" },
];

describe("ChipRow", () => {
  it("ラベルとすべての chip が描画される", () => {
    render(
      <ChipRow<Status>
        label="状態:"
        active="all"
        options={OPTIONS}
        onChange={() => {}}
      />
    );
    expect(screen.getByText("状態:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "すべて" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "納品待ち" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "納品済み" })
    ).toBeInTheDocument();
  });

  it("active と一致する chip だけ aria-pressed='true'", () => {
    render(
      <ChipRow<Status>
        label="状態:"
        active="pending"
        options={OPTIONS}
        onChange={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "すべて" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(
      screen.getByRole("button", { name: "納品待ち" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "納品済み" })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("chip クリックで onChange が該当 value で呼ばれる", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChipRow<Status>
        label="状態:"
        active="all"
        options={OPTIONS}
        onChange={onChange}
      />
    );
    await user.click(screen.getByRole("button", { name: "納品済み" }));
    expect(onChange).toHaveBeenCalledWith("fulfilled");
  });
});
