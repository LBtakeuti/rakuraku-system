import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "../search-bar";

describe("SearchBar", () => {
  it("initialValue が input に反映される", () => {
    render(
      <SearchBar
        initialValue="初期値"
        placeholder="検索..."
        onSearch={() => {}}
      />
    );
    expect(screen.getByPlaceholderText("検索...")).toHaveValue("初期値");
  });

  it("ariaLabel が省略時は placeholder が aria-label になる", () => {
    render(
      <SearchBar
        initialValue=""
        placeholder="商品で検索"
        onSearch={() => {}}
      />
    );
    expect(screen.getByLabelText("商品で検索")).toBeInTheDocument();
  });

  it("ariaLabel を指定すると input にその aria-label が付く", () => {
    render(
      <SearchBar
        initialValue=""
        placeholder="P"
        ariaLabel="売上検索"
        onSearch={() => {}}
      />
    );
    expect(screen.getByLabelText("売上検索")).toBeInTheDocument();
  });

  it("初期値が外から変わると input にも反映される（再フェッチ用）", () => {
    const { rerender } = render(
      <SearchBar initialValue="a" placeholder="検索" onSearch={() => {}} />
    );
    expect(screen.getByPlaceholderText("検索")).toHaveValue("a");
    rerender(
      <SearchBar initialValue="b" placeholder="検索" onSearch={() => {}} />
    );
    expect(screen.getByPlaceholderText("検索")).toHaveValue("b");
  });

  it("submit すると trim 済みの値で onSearch が呼ばれる", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(
      <SearchBar
        initialValue=""
        placeholder="検索..."
        onSearch={onSearch}
      />
    );
    await user.type(screen.getByPlaceholderText("検索..."), "  キーワード  ");
    await user.click(screen.getByRole("button", { name: "検索" }));
    expect(onSearch).toHaveBeenCalledWith("キーワード");
  });
});
