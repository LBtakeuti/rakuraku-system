import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RankBadge } from "../rank-badge";

describe("RankBadge", () => {
  it.each(["A", "B", "C", "D"] as const)(
    "rank=%s でテキストと aria-label が反映される",
    (rank) => {
      render(<RankBadge rank={rank} />);
      const el = screen.getByLabelText(`ランク${rank}`);
      expect(el).toHaveTextContent(rank);
    }
  );

  it.each([
    ["A", "bg-[#fee2e2]"],
    ["B", "bg-[#ffedd5]"],
    ["C", "bg-[#dbeafe]"],
    ["D", "bg-[#f1f5f9]"],
  ] as const)("rank=%s で色クラスが付与される", (rank, klass) => {
    render(<RankBadge rank={rank} />);
    expect(screen.getByLabelText(`ランク${rank}`)).toHaveClass(klass);
  });

  it("追加 className がマージされる", () => {
    render(<RankBadge rank="A" className="custom-x" />);
    expect(screen.getByLabelText("ランクA")).toHaveClass("custom-x");
  });
});
