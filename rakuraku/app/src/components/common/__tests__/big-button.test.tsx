import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilePlus2 } from "lucide-react";
import { BigButton } from "../big-button";

describe("BigButton", () => {
  it("href / title / description / icon が正しくレンダリングされる", () => {
    render(
      <BigButton
        href="/orders/new"
        color="blue"
        title="注文を受ける"
        description="お客様からの新しい注文を登録します"
        icon={FilePlus2}
      />
    );

    const link = screen.getByRole("link", { name: /注文を受ける/ });
    expect(link).toHaveAttribute("href", "/orders/new");
    expect(screen.getByText("注文を受ける")).toBeInTheDocument();
    expect(
      screen.getByText("お客様からの新しい注文を登録します")
    ).toBeInTheDocument();
    expect(link.querySelector("svg")).toBeInTheDocument();
  });

  it.each([
    ["blue", "bg-[#dbeafe]"],
    ["green", "bg-[#d1fae5]"],
    ["orange", "bg-[#fed7aa]"],
    ["purple", "bg-[#e9d5ff]"],
    ["teal", "bg-[#ccfbf1]"],
    ["pink", "bg-[#fce7f3]"],
    ["amber", "bg-[#fef3c7]"],
    ["indigo", "bg-[#e0e7ff]"],
    ["rose", "bg-[#ffe4e6]"],
    ["violet", "bg-[#ede9fe]"],
  ] as const)("color=%s でアイコンの背景クラスが付く", (color, klass) => {
    const { container } = render(
      <BigButton
        href="/x"
        color={color}
        title="t"
        description="d"
        icon={FilePlus2}
      />
    );
    const iconWrap = container.querySelector(`.${CSS.escape(klass)}`);
    expect(iconWrap).not.toBeNull();
  });

  it("description に ReactNode（改行入りなど）を渡せる", () => {
    const { container } = render(
      <BigButton
        href="/x"
        color="blue"
        title="t"
        description={
          <>
            上の行
            <br />
            下の行
          </>
        }
        icon={FilePlus2}
      />
    );
    // <br> を挟むため getByText では分断される。直下要素のテキストを丸ごと検証する。
    const descEl = container.querySelector(".text-text-secondary");
    expect(descEl).not.toBeNull();
    expect(descEl?.textContent).toBe("上の行下の行");
    expect(descEl?.querySelector("br")).not.toBeNull();
  });
});
