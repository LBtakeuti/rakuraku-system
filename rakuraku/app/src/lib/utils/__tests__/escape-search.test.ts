import { describe, it, expect } from "vitest";
import { escapeSearchTerm } from "../escape-search";

describe("escapeSearchTerm", () => {
  it("通常文字列はそのまま返る", () => {
    expect(escapeSearchTerm("hello")).toBe("hello");
    expect(escapeSearchTerm("abc123")).toBe("abc123");
  });

  it("空文字列は空文字列を返す", () => {
    expect(escapeSearchTerm("")).toBe("");
  });

  it("% を \\% にエスケープする", () => {
    expect(escapeSearchTerm("100%")).toBe("100\\%");
    expect(escapeSearchTerm("%off%")).toBe("\\%off\\%");
  });

  it("_ を \\_ にエスケープする", () => {
    expect(escapeSearchTerm("foo_bar")).toBe("foo\\_bar");
    expect(escapeSearchTerm("_leading")).toBe("\\_leading");
  });

  it("\\ を \\\\ にエスケープする", () => {
    expect(escapeSearchTerm("a\\b")).toBe("a\\\\b");
    expect(escapeSearchTerm("\\")).toBe("\\\\");
  });

  it("( ) , は除去される", () => {
    expect(escapeSearchTerm("(test)")).toBe("test");
    expect(escapeSearchTerm("a,b")).toBe("ab");
    expect(escapeSearchTerm("(a,b)")).toBe("ab");
  });

  it("複合ケース: test(1),val% → test1val\\%", () => {
    expect(escapeSearchTerm("test(1),val%")).toBe("test1val\\%");
  });

  it("バックスラッシュは % や _ のエスケープより先に処理される（二重エスケープしない）", () => {
    // \% → まず \ を \\ に → \\% → 次に % を \% に → \\\%
    expect(escapeSearchTerm("\\%")).toBe("\\\\\\%");
  });

  it("すべての特殊文字が混在するケース", () => {
    // "(a_b\\c%d)" → 括弧除去 → "a_b\\c%d"
    // \ → \\ → "a_b\\\\c%d"
    // % → \% → "a_b\\\\c\\%d"
    // _ → \_ → "a\\_b\\\\c\\%d"
    expect(escapeSearchTerm("(a_b\\c%d)")).toBe("a\\_b\\\\c\\%d");
  });
});
