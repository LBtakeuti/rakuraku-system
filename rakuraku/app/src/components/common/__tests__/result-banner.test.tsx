import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replaceMock = vi.fn();
let mockSearch = "issued=3&failed=1";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/sales",
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

import { ResultBanner } from "../result-banner";

beforeEach(() => {
  replaceMock.mockReset();
  mockSearch = "issued=3&failed=1";
});

describe("ResultBanner", () => {
  it("issued=0 && failed=0 のときは何も描画されない", () => {
    const { container } = render(
      <ResultBanner issued={0} failed={0} successLabel="件の納品を確定" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("issued > 0 && failed === 0 で『success』バリアント（border-success）", () => {
    const { container } = render(
      <ResultBanner issued={3} failed={0} successLabel="件の納品を確定" />
    );
    const banner = container.querySelector("[role='status']")!;
    expect(banner.className).toContain("border-success");
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/件の納品を確定/)).toBeInTheDocument();
  });

  it("issued === 0 && failed > 0 で『danger』バリアント、補足文が出る", () => {
    const { container } = render(
      <ResultBanner issued={0} failed={2} successLabel="件の納品を確定" />
    );
    const banner = container.querySelector("[role='status']")!;
    expect(banner.className).toContain("border-danger");
    expect(screen.getByText(/失敗の詳細はサーバーログ/)).toBeInTheDocument();
  });

  it("issued > 0 && failed > 0 で『warning』バリアント（部分失敗）", () => {
    const { container } = render(
      <ResultBanner issued={3} failed={1} successLabel="件の納品を確定" />
    );
    const banner = container.querySelector("[role='status']")!;
    expect(banner.className).toContain("border-warning");
    // 成功と失敗が両方表示される
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("failedLabel をカスタムできる", () => {
    render(
      <ResultBanner
        issued={0}
        failed={2}
        successLabel="件の請求書を発行"
        failedLabel="件で発行失敗"
      />
    );
    expect(screen.getByText(/件で発行失敗/)).toBeInTheDocument();
  });

  it("X ボタンで router.replace が issued/failed を削除した URL で呼ばれる", async () => {
    const user = userEvent.setup();
    render(
      <ResultBanner issued={3} failed={1} successLabel="件の納品を確定" />
    );
    await user.click(
      screen.getByRole("button", { name: "このメッセージを閉じる" })
    );
    expect(replaceMock).toHaveBeenCalledTimes(1);
    const url = replaceMock.mock.calls[0][0] as string;
    expect(url).toBe("/sales");
  });

  it("他のクエリパラメータは保持される", async () => {
    mockSearch = "issued=2&failed=0&period=this_month";
    const user = userEvent.setup();
    render(
      <ResultBanner issued={2} failed={0} successLabel="件の納品を確定" />
    );
    await user.click(
      screen.getByRole("button", { name: "このメッセージを閉じる" })
    );
    const url = replaceMock.mock.calls[0][0] as string;
    expect(url).toBe("/sales?period=this_month");
  });

  it("paramKeys を変えると別のキーを削除する", async () => {
    mockSearch = "myIssued=1&myFailed=0";
    const user = userEvent.setup();
    render(
      <ResultBanner
        issued={1}
        failed={0}
        successLabel="件の請求書を発行"
        paramKeys={{ issued: "myIssued", failed: "myFailed" }}
      />
    );
    await user.click(
      screen.getByRole("button", { name: "このメッセージを閉じる" })
    );
    const url = replaceMock.mock.calls[0][0] as string;
    expect(url).toBe("/sales");
  });
});
