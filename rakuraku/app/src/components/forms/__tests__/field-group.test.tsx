import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FieldGroup } from "../field-group";

describe("FieldGroup", () => {
  it("label と children が描画される", () => {
    render(
      <FieldGroup label="お客様の名前">
        <input data-testid="i" />
      </FieldGroup>
    );
    expect(screen.getByText("お客様の名前")).toBeInTheDocument();
    expect(screen.getByTestId("i")).toBeInTheDocument();
  });

  it("required=true で「必須」バッジが出る", () => {
    render(
      <FieldGroup label="名前" required>
        <input />
      </FieldGroup>
    );
    expect(screen.getByText("必須")).toBeInTheDocument();
  });

  it("optional=true で「任意」バッジが出る（required 優先）", () => {
    render(
      <FieldGroup label="フリガナ" optional>
        <input />
      </FieldGroup>
    );
    expect(screen.getByText("任意")).toBeInTheDocument();
  });

  it("required=true && optional=true なら必須が優先され任意は出ない", () => {
    render(
      <FieldGroup label="x" required optional>
        <input />
      </FieldGroup>
    );
    expect(screen.getByText("必須")).toBeInTheDocument();
    expect(screen.queryByText("任意")).toBeNull();
  });

  it("optionalLabel をカスタマイズできる", () => {
    render(
      <FieldGroup label="x" optional optionalLabel="どちらでも">
        <input />
      </FieldGroup>
    );
    expect(screen.getByText("どちらでも")).toBeInTheDocument();
  });

  it("help が表示される", () => {
    render(
      <FieldGroup label="x" help="ヒント文">
        <input />
      </FieldGroup>
    );
    expect(screen.getByText("ヒント文")).toBeInTheDocument();
  });

  it("error が表示される", () => {
    render(
      <FieldGroup label="x" error="入力してください">
        <input />
      </FieldGroup>
    );
    expect(screen.getByText("入力してください")).toBeInTheDocument();
  });

  it("htmlFor を渡すと label の for 属性に反映される", () => {
    render(
      <FieldGroup label="名前" htmlFor="name">
        <input id="name" />
      </FieldGroup>
    );
    const label = screen.getByText("名前");
    expect(label).toHaveAttribute("for", "name");
  });
});
