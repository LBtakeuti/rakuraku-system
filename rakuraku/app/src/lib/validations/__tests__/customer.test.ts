import { describe, it, expect } from "vitest";
import {
  customerFormSchema,
  isStep1Valid,
  isStep2Valid,
  type CustomerFormValues,
} from "../customer";

function baseValues(
  overrides: Partial<CustomerFormValues> = {}
): CustomerFormValues {
  return {
    customerCode: "",
    name: "株式会社サンプル",
    nameKana: "カブシキガイシャサンプル",
    rank: "A",
    staffId: "",
    status: "active",
    postalCode: "100-0005",
    address: "東京都千代田区丸の内1-1-1",
    building: "",
    phone: "03-1234-5678",
    fax: "",
    contactPerson: "",
    email: "",
    invoiceFormat: "invoice_only",
    closingDay: 31,
    paymentCycle: "翌月末",
    invoiceTaxType: "per_line",
    taxRounding: "floor",
    ...overrides,
  };
}

describe("customerFormSchema", () => {
  it("最小構成（必須項目あり）で safeParse が成功する", () => {
    const r = customerFormSchema.safeParse(baseValues());
    expect(r.success).toBe(true);
  });

  it("name 未入力で失敗する", () => {
    const r = customerFormSchema.safeParse(baseValues({ name: "" }));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((e) => e.path[0] === "name")).toBe(true);
    }
  });

  it("address 未入力で失敗する", () => {
    const r = customerFormSchema.safeParse(baseValues({ address: "" }));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((e) => e.path[0] === "address")).toBe(true);
    }
  });

  it("phone 未入力で失敗する", () => {
    const r = customerFormSchema.safeParse(baseValues({ phone: "" }));
    expect(r.success).toBe(false);
  });

  it("customerCode が空文字なら通る（採番に委ねる）", () => {
    const r = customerFormSchema.safeParse(baseValues({ customerCode: "" }));
    expect(r.success).toBe(true);
  });

  it("customerCode が 6桁数字なら通る", () => {
    const r = customerFormSchema.safeParse(
      baseValues({ customerCode: "000123" })
    );
    expect(r.success).toBe(true);
  });

  it("customerCode が 5桁数字だと失敗する", () => {
    const r = customerFormSchema.safeParse(
      baseValues({ customerCode: "12345" })
    );
    expect(r.success).toBe(false);
  });

  it("customerCode に非数字を含むと失敗する", () => {
    const r = customerFormSchema.safeParse(
      baseValues({ customerCode: "ABC123" })
    );
    expect(r.success).toBe(false);
  });

  it("nameKana が空なら許可される", () => {
    const r = customerFormSchema.safeParse(baseValues({ nameKana: "" }));
    expect(r.success).toBe(true);
  });

  it("nameKana にカタカナ以外（ひらがな）を含むと失敗する", () => {
    const r = customerFormSchema.safeParse(
      baseValues({ nameKana: "かぶしき" })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((e) => e.path[0] === "nameKana")).toBe(true);
    }
  });

  it("nameKana の長音「ー」と濁点「゛」が許可される", () => {
    const r = customerFormSchema.safeParse(
      baseValues({ nameKana: "サンプルー゛" })
    );
    expect(r.success).toBe(true);
  });

  it("email が空文字なら許可される", () => {
    const r = customerFormSchema.safeParse(baseValues({ email: "" }));
    expect(r.success).toBe(true);
  });

  it("email が不正な形式だと失敗する", () => {
    const r = customerFormSchema.safeParse(
      baseValues({ email: "not-an-email" })
    );
    expect(r.success).toBe(false);
  });

  it("email が正しい形式なら通る", () => {
    const r = customerFormSchema.safeParse(
      baseValues({ email: "user@example.co.jp" })
    );
    expect(r.success).toBe(true);
  });

  it("staffId が空文字なら通る", () => {
    const r = customerFormSchema.safeParse(baseValues({ staffId: "" }));
    expect(r.success).toBe(true);
  });

  it("staffId が UUID なら通る", () => {
    const r = customerFormSchema.safeParse(
      // version 桁・variant 桁を含む有効な UUID v4 形式
      baseValues({ staffId: "11111111-1111-4111-8111-111111111111" })
    );
    expect(r.success).toBe(true);
  });

  it("staffId が UUID でない文字列なら失敗する", () => {
    const r = customerFormSchema.safeParse(
      baseValues({ staffId: "not-a-uuid" })
    );
    expect(r.success).toBe(false);
  });

  it.each([
    ["rank", "Z"],
    ["status", "frozen"],
    ["invoiceFormat", "other"],
    ["invoiceTaxType", "per_year"],
    ["taxRounding", "trunc"],
  ])("enum %s に未定義値（%s）を渡すと失敗する", (field, badValue) => {
    const r = customerFormSchema.safeParse(
      baseValues({ [field]: badValue } as Partial<CustomerFormValues>)
    );
    expect(r.success).toBe(false);
  });

  it("closingDay が文字列でも数値に変換される", () => {
    const r = customerFormSchema.safeParse(
      baseValues({ closingDay: "20" } as never)
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.closingDay).toBe(20);
    }
  });

  it("closingDay=0 は失敗（1以上）", () => {
    const r = customerFormSchema.safeParse(baseValues({ closingDay: 0 }));
    expect(r.success).toBe(false);
  });

  it("closingDay=32 は失敗（31以下）", () => {
    const r = customerFormSchema.safeParse(baseValues({ closingDay: 32 }));
    expect(r.success).toBe(false);
  });
});

describe("isStep1Valid（基本情報ステップ）", () => {
  it("ステップ1必須が揃えば true", () => {
    expect(isStep1Valid(baseValues())).toBe(true);
  });

  it("name が空なら false", () => {
    expect(isStep1Valid(baseValues({ name: "" }))).toBe(false);
  });

  it("ステップ2の項目（address 等）が空でも true", () => {
    expect(
      isStep1Valid(baseValues({ address: "", phone: "" }))
    ).toBe(true);
  });

  it("customerCode が不正なら false", () => {
    expect(
      isStep1Valid(baseValues({ customerCode: "abc" }))
    ).toBe(false);
  });
});

describe("isStep2Valid（連絡先ステップ）", () => {
  it("ステップ2必須が揃えば true", () => {
    expect(isStep2Valid(baseValues())).toBe(true);
  });

  it("address が空なら false", () => {
    expect(isStep2Valid(baseValues({ address: "" }))).toBe(false);
  });

  it("phone が空なら false", () => {
    expect(isStep2Valid(baseValues({ phone: "" }))).toBe(false);
  });

  it("ステップ1の項目（name 等）が空でも true", () => {
    expect(isStep2Valid(baseValues({ name: "" }))).toBe(true);
  });

  it("email が不正なら false", () => {
    expect(
      isStep2Valid(baseValues({ email: "bad@" }))
    ).toBe(false);
  });
});
