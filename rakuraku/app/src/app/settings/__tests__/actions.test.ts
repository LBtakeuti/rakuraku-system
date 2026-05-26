import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock } from "@/test-utils/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { updateCompanySetting } from "../actions";

const mockedCreate = vi.mocked(createClient);
const mockedRevalidate = vi.mocked(revalidatePath);

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.set(k, v);
  }
  return fd;
}

const validFields = {
  companyName: "テスト株式会社",
  registrationNo: "T1234567890123",
  postalCode: "100-0001",
  address: "東京都千代田区1-1",
  tel: "03-1234-5678",
  fax: "",
  bankInfo: "○○銀行",
};

beforeEach(() => {
  mockedCreate.mockReset();
  mockedRevalidate.mockClear();
});

describe("updateCompanySetting（バリデーション）", () => {
  it("companyName が空だと formError を返す", async () => {
    const r = await updateCompanySetting(null, makeFormData({ ...validFields, companyName: "" }));
    expect(r).toEqual({ success: false, formError: "必須項目をすべて入力してください" });
  });

  it("registrationNo が空だと formError を返す", async () => {
    const r = await updateCompanySetting(null, makeFormData({ ...validFields, registrationNo: "" }));
    expect(r).toEqual({ success: false, formError: "必須項目をすべて入力してください" });
  });

  it("postalCode が空だと formError を返す", async () => {
    const r = await updateCompanySetting(null, makeFormData({ ...validFields, postalCode: "" }));
    expect(r).toEqual({ success: false, formError: "必須項目をすべて入力してください" });
  });

  it("address が空だと formError を返す", async () => {
    const r = await updateCompanySetting(null, makeFormData({ ...validFields, address: "" }));
    expect(r).toEqual({ success: false, formError: "必須項目をすべて入力してください" });
  });

  it("tel が空だと formError を返す", async () => {
    const r = await updateCompanySetting(null, makeFormData({ ...validFields, tel: "" }));
    expect(r).toEqual({ success: false, formError: "必須項目をすべて入力してください" });
  });

  it("bankInfo が空だと formError を返す", async () => {
    const r = await updateCompanySetting(null, makeFormData({ ...validFields, bankInfo: "" }));
    expect(r).toEqual({ success: false, formError: "必須項目をすべて入力してください" });
  });

  it("バリデーションエラー時は supabase を呼び出さない", async () => {
    await updateCompanySetting(null, makeFormData({ ...validFields, companyName: "" }));
    expect(mockedCreate).not.toHaveBeenCalled();
  });
});

describe("updateCompanySetting（正常系）", () => {
  it("全項目入力で success: true を返す", async () => {
    const sb = createSupabaseMock({ company_setting: { data: null, error: null } });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await updateCompanySetting(null, makeFormData(validFields));
    expect(r).toEqual({ success: true });
  });

  it("正常更新後に revalidatePath('/settings') が呼ばれる", async () => {
    const sb = createSupabaseMock({ company_setting: { data: null, error: null } });
    mockedCreate.mockResolvedValue(sb as never);

    await updateCompanySetting(null, makeFormData(validFields));
    expect(mockedRevalidate).toHaveBeenCalledWith("/settings");
  });

  it("fax が空文字のとき null として UPDATE される", async () => {
    const sb = createSupabaseMock({ company_setting: { data: null, error: null } });
    mockedCreate.mockResolvedValue(sb as never);

    await updateCompanySetting(null, makeFormData({ ...validFields, fax: "" }));

    const updateCall = sb._calls.update.find((c) => c.table === "company_setting");
    expect(updateCall).toBeDefined();
    expect((updateCall!.payload as Record<string, unknown>).fax).toBeNull();
  });

  it("fax が入力されているときはその値が UPDATE される", async () => {
    const sb = createSupabaseMock({ company_setting: { data: null, error: null } });
    mockedCreate.mockResolvedValue(sb as never);

    await updateCompanySetting(null, makeFormData({ ...validFields, fax: "03-9999-9999" }));

    const updateCall = sb._calls.update.find((c) => c.table === "company_setting");
    expect((updateCall!.payload as Record<string, unknown>).fax).toBe("03-9999-9999");
  });

  it("前後の空白はトリムされて保存される", async () => {
    const sb = createSupabaseMock({ company_setting: { data: null, error: null } });
    mockedCreate.mockResolvedValue(sb as never);

    await updateCompanySetting(
      null,
      makeFormData({ ...validFields, companyName: "  スペース株式会社  " })
    );

    const updateCall = sb._calls.update.find((c) => c.table === "company_setting");
    expect((updateCall!.payload as Record<string, unknown>).company_name).toBe("スペース株式会社");
  });
});

describe("updateCompanySetting（エラー系）", () => {
  it("supabase が error を返すと formError を返す", async () => {
    const sb = createSupabaseMock({
      company_setting: { data: null, error: { message: "DB接続失敗" } },
    });
    mockedCreate.mockResolvedValue(sb as never);

    const r = await updateCompanySetting(null, makeFormData(validFields));
    expect(r).toEqual({
      success: false,
      formError: "設定の保存に失敗しました。通信状態を確認して、もう一度お試しください",
    });
  });

  it("supabase エラー時は revalidatePath が呼ばれない", async () => {
    const sb = createSupabaseMock({
      company_setting: { data: null, error: { message: "DB接続失敗" } },
    });
    mockedCreate.mockResolvedValue(sb as never);

    await updateCompanySetting(null, makeFormData(validFields));
    expect(mockedRevalidate).not.toHaveBeenCalled();
  });
});
