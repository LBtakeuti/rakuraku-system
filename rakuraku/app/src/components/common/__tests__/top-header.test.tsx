import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopHeader } from "../top-header";

// @/lib/supabase/server の createClient をモックする
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// LogoutButton は Client Component なので単純な stub に差し替える
vi.mock("../logout-button", () => ({
  LogoutButton: () => <button type="button">ログアウト</button>,
}));

import { createClient } from "@/lib/supabase/server";

function buildSupabaseMock({
  userId = "user-1",
  email = "test@example.com",
  staffName = null as string | null,
} = {}) {
  const maybeSingleFn = vi.fn().mockResolvedValue({ data: staffName ? { name: staffName } : null });
  const eqFn = vi.fn().mockReturnValue({ maybeSingle: maybeSingleFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  const fromFn = vi.fn().mockReturnValue({ select: selectFn });

  const getUserFn = vi.fn().mockResolvedValue({
    data: { user: { id: userId, email } },
  });

  return {
    auth: { getUser: getUserFn },
    from: fromFn,
  };
}

function buildSupabaseMockNoUser() {
  const getUserFn = vi.fn().mockResolvedValue({ data: { user: null } });
  return {
    auth: { getUser: getUserFn },
    from: vi.fn(),
  };
}

describe("TopHeader", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 25, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("ユーザー情報の表示", () => {
    it("staff テーブルに name がある場合、その名前とイニシャルが表示される", async () => {
      vi.mocked(createClient).mockResolvedValue(buildSupabaseMock({ staffName: "山田 太郎" }) as never);
      render(await TopHeader());
      expect(screen.getByText("山田 太郎 さん")).toBeInTheDocument();
      expect(screen.getByText("山")).toBeInTheDocument();
    });

    it("staff テーブルに name がない場合、メールアドレスが表示される", async () => {
      vi.mocked(createClient).mockResolvedValue(buildSupabaseMock({ email: "yamada@example.com", staffName: null }) as never);
      render(await TopHeader());
      expect(screen.getByText("yamada@example.com さん")).toBeInTheDocument();
    });

    it("ユーザーが未ログインの場合、ユーザー名エリアが表示されない", async () => {
      vi.mocked(createClient).mockResolvedValue(buildSupabaseMockNoUser() as never);
      render(await TopHeader());
      expect(screen.queryByText("さん")).not.toBeInTheDocument();
    });
  });

  describe("日付の表示", () => {
    it("現在日時を YYYY年M月D日(曜) 形式でフォーマットして表示する", async () => {
      vi.mocked(createClient).mockResolvedValue(buildSupabaseMockNoUser() as never);
      render(await TopHeader());
      expect(screen.getByText("2026年5月25日(月)")).toBeInTheDocument();
    });

    it("月日が一桁の日付でゼロ埋めされない（2026-01-07(水)）", async () => {
      vi.setSystemTime(new Date(2026, 0, 7, 12, 0, 0));
      vi.mocked(createClient).mockResolvedValue(buildSupabaseMockNoUser() as never);
      render(await TopHeader());
      expect(screen.getByText("2026年1月7日(水)")).toBeInTheDocument();
    });

    it("日曜日が「日」、土曜日が「土」になる", async () => {
      vi.setSystemTime(new Date(2026, 0, 4, 12, 0, 0)); // 2026-01-04 日曜
      vi.mocked(createClient).mockResolvedValue(buildSupabaseMockNoUser() as never);
      const { unmount } = render(await TopHeader());
      expect(screen.getByText("2026年1月4日(日)")).toBeInTheDocument();
      unmount();

      vi.setSystemTime(new Date(2026, 0, 3, 12, 0, 0)); // 2026-01-03 土曜
      vi.mocked(createClient).mockResolvedValue(buildSupabaseMockNoUser() as never);
      render(await TopHeader());
      expect(screen.getByText("2026年1月3日(土)")).toBeInTheDocument();
    });
  });

  describe("固定要素の表示", () => {
    it("ロゴ「楽」とタイトル「らくらく受発注システム」が表示される", async () => {
      vi.mocked(createClient).mockResolvedValue(buildSupabaseMockNoUser() as never);
      render(await TopHeader());
      expect(screen.getByText("楽")).toBeInTheDocument();
      expect(screen.getByText("らくらく受発注システム")).toBeInTheDocument();
    });
  });
});
