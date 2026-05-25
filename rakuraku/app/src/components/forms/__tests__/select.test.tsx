import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SelectField } from "../select";

describe("SelectField", () => {
  it("既定では border-border-default、invalid 時は border-danger", () => {
    const { rerender } = render(
      <SelectField data-testid="s">
        <option>a</option>
      </SelectField>
    );
    expect(screen.getByTestId("s")).toHaveClass("border-border-default");
    rerender(
      <SelectField data-testid="s" invalid>
        <option>a</option>
      </SelectField>
    );
    expect(screen.getByTestId("s")).toHaveClass("border-danger");
  });

  it("children の option が描画される", () => {
    render(
      <SelectField data-testid="s" defaultValue="b">
        <option value="a">A</option>
        <option value="b">B</option>
      </SelectField>
    );
    const select = screen.getByTestId("s") as HTMLSelectElement;
    expect(select.options).toHaveLength(2);
    expect(select.value).toBe("b");
  });
});
