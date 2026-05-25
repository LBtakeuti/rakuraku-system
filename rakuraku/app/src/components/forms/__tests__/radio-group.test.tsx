import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioGroupField } from "../radio-group";

const OPTIONS = [
  { value: "active", label: "取引中" },
  { value: "paused", label: "休止中" },
  { value: "closed", label: "取引なし" },
] as const;

describe("RadioGroupField", () => {
  it("各オプションが radio として描画される", () => {
    render(
      <RadioGroupField
        value=""
        onChange={() => {}}
        options={OPTIONS as never}
        name="status"
      />
    );
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("value 未指定ではどれも checked=false", () => {
    render(
      <RadioGroupField
        value=""
        onChange={() => {}}
        options={OPTIONS as never}
        name="status"
      />
    );
    for (const r of screen.getAllByRole("radio")) {
      expect(r).not.toBeChecked();
    }
  });

  it("value='paused' で休止中の radio のみ checked", () => {
    render(
      <RadioGroupField
        value="paused"
        onChange={() => {}}
        options={OPTIONS as never}
        name="status"
      />
    );
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    const checked = radios.filter((r) => r.checked);
    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveAttribute("value", "paused");
  });

  it("ラジオクリックで onChange が value で呼ばれる", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioGroupField
        value=""
        onChange={onChange}
        options={OPTIONS as never}
        name="status"
      />
    );
    await user.click(screen.getByLabelText("取引中"));
    expect(onChange).toHaveBeenCalledWith("active");
  });

  it("選択中ラベルの内部にカスタムラジオ丸（h-2.5 w-2.5 bg-primary）が表示される", () => {
    const { container } = render(
      <RadioGroupField
        value="active"
        onChange={() => {}}
        options={OPTIONS as never}
        name="status"
      />
    );
    // 選択中のラベル配下に内側の丸要素があること
    const innerDots = container.querySelectorAll("span.bg-primary");
    expect(innerDots.length).toBeGreaterThan(0);
  });

  it("name 属性が各 input に渡る", () => {
    render(
      <RadioGroupField
        value=""
        onChange={() => {}}
        options={OPTIONS as never}
        name="my-group"
      />
    );
    for (const r of screen.getAllByRole("radio")) {
      expect(r).toHaveAttribute("name", "my-group");
    }
  });
});
