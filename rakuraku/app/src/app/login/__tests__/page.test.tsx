import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "../page";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockSignInWithPassword = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signInWithPassword: mockSignInWithPassword },
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("初期表示", () => {
    it("ロゴ「楽」とタイトル「らくらく受発注システム」が表示される", () => {
      render(<LoginPage />);
      expect(screen.getByText("楽")).toBeInTheDocument();
      expect(screen.getByText("らくらく受発注システム")).toBeInTheDocument();
    });

    it("メールアドレスとパスワードの入力フィールドが表示される", () => {
      render(<LoginPage />);
      expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
      expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    });

    it("「ログインする」ボタンが表示される", () => {
      render(<LoginPage />);
      expect(screen.getByRole("button", { name: "ログインする" })).toBeInTheDocument();
    });

    it("初期表示でエラーメッセージは表示されない", () => {
      render(<LoginPage />);
      expect(screen.queryByText("メールアドレスまたはパスワードが正しくありません")).not.toBeInTheDocument();
    });
  });

  describe("ログイン成功", () => {
    it("成功時は / にリダイレクトされ refresh が呼ばれる", async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });
      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText("メールアドレス"), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByLabelText("パスワード"), {
        target: { value: "password123" },
      });
      fireEvent.submit(screen.getByRole("button", { name: "ログインする" }).closest("form")!);

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "user@example.com",
          password: "password123",
        });
        expect(mockPush).toHaveBeenCalledWith("/");
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe("ログイン失敗", () => {
    it("認証エラー時にエラーメッセージが表示される", async () => {
      mockSignInWithPassword.mockResolvedValue({ error: { message: "Invalid credentials" } });
      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText("メールアドレス"), {
        target: { value: "wrong@example.com" },
      });
      fireEvent.change(screen.getByLabelText("パスワード"), {
        target: { value: "wrongpass" },
      });
      fireEvent.submit(screen.getByRole("button", { name: "ログインする" }).closest("form")!);

      await waitFor(() => {
        expect(screen.getByText("メールアドレスまたはパスワードが正しくありません")).toBeInTheDocument();
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("エラー後に再送信すると前のエラーがクリアされる", async () => {
      mockSignInWithPassword
        .mockResolvedValueOnce({ error: { message: "Invalid" } })
        .mockResolvedValueOnce({ error: null });

      render(<LoginPage />);
      const form = screen.getByRole("button", { name: "ログインする" }).closest("form")!;

      fireEvent.change(screen.getByLabelText("メールアドレス"), { target: { value: "a@b.com" } });
      fireEvent.change(screen.getByLabelText("パスワード"), { target: { value: "pass" } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("メールアドレスまたはパスワードが正しくありません")).toBeInTheDocument();
      });

      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.queryByText("メールアドレスまたはパスワードが正しくありません")).not.toBeInTheDocument();
      });
    });
  });
});
