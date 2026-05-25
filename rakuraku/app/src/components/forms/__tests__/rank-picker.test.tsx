import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RankPicker } from "../rank-picker";

describe("RankPicker", () => {
  it("A〜D の 4 ボタンが描画される", () => {
    render(<RankPicker value="" onChange={() => {}} />);
    for (const r of ["A", "B", "C", "D"]) {
      expect(screen.getByRole("button", { name: new RegExp(r) })).toBeInTheDocument();
    }
  });

  it("value=未選択 では全ボタンが aria-pressed='false'", () => {
    render(<RankPicker value="" onChange={() => {}} />);
    for (const btn of screen.getAllByRole("button")) {
      expect(btn).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("value='B' で B ボタンのみが aria-pressed='true' になる", () => {
    render(<RankPicker value="B" onChange={() => {}} />);
    const buttons = screen.getAllByRole("button");
    const pressed = buttons.filter(
      (b) => b.getAttribute("aria-pressed") === "true"
    );
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveTextContent("B");
  });

  it("選択中ボタンには primary-lighter 系クラスが付く", () => {
    render(<RankPicker value="A" onChange={() => {}} />);
    const aBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-pressed") === "true")!;
    expect(aBtn).toHaveClass("bg-primary-lighter");
    expect(aBtn).toHaveClass("border-primary");
  });

  it("ボタンをクリックすると onChange が該当ランクで呼ばれる", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RankPicker value="" onChange={onChange} />);
    await user.click(screen.getAllByRole("button")[2]); // C
    expect(onChange).toHaveBeenCalledWith("C");
  });

  it("各ボタンにランク名と説明ラベル（特に大切/大切/標準/小規模）が表示される", () => {
    render(<RankPicker value="" onChange={() => {}} />);
    expect(screen.getByText("特に大切")).toBeInTheDocument();
    expect(screen.getByText("大切")).toBeInTheDocument();
    expect(screen.getByText("標準")).toBeInTheDocument();
    expect(screen.getByText("小規模")).toBeInTheDocument();
  });
});
