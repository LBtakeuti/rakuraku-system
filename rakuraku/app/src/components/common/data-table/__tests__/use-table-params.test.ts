import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/orders",
  useSearchParams: () => new URLSearchParams("status=pending"),
}));

import { useTableParams } from "../use-table-params";

beforeEach(() => {
  pushMock.mockReset();
});

describe("useTableParams", () => {
  it("値を追加すると router.push が新しい params 付きで呼ばれる", () => {
    const { result } = renderHook(() => useTableParams());
    act(() => {
      result.current.pushWith({ q: "テスト" });
    });
    expect(pushMock).toHaveBeenCalledTimes(1);
    const url = pushMock.mock.calls[0][0] as string;
    expect(url.startsWith("/orders?")).toBe(true);
    expect(url).toContain("status=pending"); // 既存の param は維持
    expect(decodeURIComponent(url)).toContain("q=テスト");
  });

  it("既存の param を上書きできる", () => {
    const { result } = renderHook(() => useTableParams());
    act(() => {
      result.current.pushWith({ status: "fulfilled" });
    });
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).toContain("status=fulfilled");
    expect(url).not.toContain("status=pending");
  });

  it("値を null にすると param が削除される", () => {
    const { result } = renderHook(() => useTableParams());
    act(() => {
      result.current.pushWith({ status: null });
    });
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).not.toContain("status=");
  });

  it("値を空文字にしても削除される", () => {
    const { result } = renderHook(() => useTableParams());
    act(() => {
      result.current.pushWith({ status: "" });
    });
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).not.toContain("status=");
  });

  it("複数 param を同時に更新できる（page を別途追加、status を削除）", () => {
    const { result } = renderHook(() => useTableParams());
    act(() => {
      result.current.pushWith({ status: null, page: "3" });
    });
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).not.toContain("status=");
    expect(url).toContain("page=3");
  });
});
