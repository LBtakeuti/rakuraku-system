import { describe, it, expect } from "vitest";
import { productFormSchema, type ProductFormValues } from "../product";

function baseValues(
  overrides: Partial<ProductFormValues> = {}
): ProductFormValues {
  return {
    productCode: "",
    name: "サンプル商品",
    janCode: "",
    unitsPerCase: 1,
    defaultSalesUnitPrice: 1000,
    defaultPurchaseUnitPrice: 500,
    defaultTaxRate: 0.1,
    defaultOrderType: "stock",
    initialStock: 0,
    ...overrides,
  };
}

describe("productFormSchema", () => {
  it("最小構成で safeParse が成功する", () => {
    const r = productFormSchema.safeParse(baseValues());
    expect(r.success).toBe(true);
  });

  it("name 未入力で失敗する", () => {
    const r = productFormSchema.safeParse(baseValues({ name: "" }));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((e) => e.path[0] === "name")).toBe(true);
    }
  });

  it("productCode が空なら通る（採番に委ねる）", () => {
    const r = productFormSchema.safeParse(baseValues({ productCode: "" }));
    expect(r.success).toBe(true);
  });

  it("productCode が 8桁数字なら通る", () => {
    const r = productFormSchema.safeParse(
      baseValues({ productCode: "00012345" })
    );
    expect(r.success).toBe(true);
  });

  it("productCode が 7桁だと失敗する", () => {
    const r = productFormSchema.safeParse(
      baseValues({ productCode: "1234567" })
    );
    expect(r.success).toBe(false);
  });

  it("janCode が空なら許可", () => {
    const r = productFormSchema.safeParse(baseValues({ janCode: "" }));
    expect(r.success).toBe(true);
  });

  it("janCode が 8〜13桁の数字なら通る（13桁）", () => {
    const r = productFormSchema.safeParse(
      baseValues({ janCode: "4901234567890" })
    );
    expect(r.success).toBe(true);
  });

  it("janCode が 8桁ちょうどでも通る", () => {
    const r = productFormSchema.safeParse(baseValues({ janCode: "12345678" }));
    expect(r.success).toBe(true);
  });

  it("janCode が 7桁だと失敗する", () => {
    const r = productFormSchema.safeParse(baseValues({ janCode: "1234567" }));
    expect(r.success).toBe(false);
  });

  it("janCode が 14桁だと失敗する", () => {
    const r = productFormSchema.safeParse(
      baseValues({ janCode: "12345678901234" })
    );
    expect(r.success).toBe(false);
  });

  it("janCode に英字を含むと失敗する", () => {
    const r = productFormSchema.safeParse(
      baseValues({ janCode: "ABCD1234" })
    );
    expect(r.success).toBe(false);
  });

  it("unitsPerCase が 0 だと失敗する（1以上）", () => {
    const r = productFormSchema.safeParse(baseValues({ unitsPerCase: 0 }));
    expect(r.success).toBe(false);
  });

  it("unitsPerCase が小数だと失敗する（整数のみ）", () => {
    const r = productFormSchema.safeParse(baseValues({ unitsPerCase: 1.5 }));
    expect(r.success).toBe(false);
  });

  it("defaultSalesUnitPrice が負だと失敗する", () => {
    const r = productFormSchema.safeParse(
      baseValues({ defaultSalesUnitPrice: -1 })
    );
    expect(r.success).toBe(false);
  });

  it("defaultSalesUnitPrice=0 は許可", () => {
    const r = productFormSchema.safeParse(
      baseValues({ defaultSalesUnitPrice: 0 })
    );
    expect(r.success).toBe(true);
  });

  it("defaultPurchaseUnitPrice は省略可（null/undefined）", () => {
    const r1 = productFormSchema.safeParse(
      baseValues({ defaultPurchaseUnitPrice: null })
    );
    expect(r1.success).toBe(true);

    const r2 = productFormSchema.safeParse(
      baseValues({ defaultPurchaseUnitPrice: undefined })
    );
    expect(r2.success).toBe(true);
  });

  it("defaultPurchaseUnitPrice が負だと失敗する", () => {
    const r = productFormSchema.safeParse(
      baseValues({ defaultPurchaseUnitPrice: -100 })
    );
    expect(r.success).toBe(false);
  });

  it("defaultTaxRate は 0.1 か 0.08 のみ許可", () => {
    expect(
      productFormSchema.safeParse(baseValues({ defaultTaxRate: 0.1 })).success
    ).toBe(true);
    expect(
      productFormSchema.safeParse(baseValues({ defaultTaxRate: 0.08 })).success
    ).toBe(true);
    expect(
      productFormSchema.safeParse(
        baseValues({ defaultTaxRate: 0.05 } as never)
      ).success
    ).toBe(false);
  });

  it("defaultOrderType の enum 違反は失敗する", () => {
    const r = productFormSchema.safeParse(
      baseValues({ defaultOrderType: "other" } as never)
    );
    expect(r.success).toBe(false);
  });

  it("initialStock が負だと失敗する", () => {
    const r = productFormSchema.safeParse(baseValues({ initialStock: -1 }));
    expect(r.success).toBe(false);
  });

  it("initialStock が小数だと失敗する", () => {
    const r = productFormSchema.safeParse(baseValues({ initialStock: 1.5 }));
    expect(r.success).toBe(false);
  });

  it("数値フィールドが文字列でも coerce で通る", () => {
    const r = productFormSchema.safeParse(
      baseValues({
        unitsPerCase: "10" as never,
        defaultSalesUnitPrice: "1500" as never,
      })
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.unitsPerCase).toBe(10);
      expect(r.data.defaultSalesUnitPrice).toBe(1500);
    }
  });
});
