import { describe, it, expect } from "vitest";
import {
  salesOrderFormSchema,
  type SalesOrderFormValues,
  type SalesOrderLineInput,
} from "../sales-order";

function baseLine(
  overrides: Partial<SalesOrderLineInput> = {}
): SalesOrderLineInput {
  return {
    productCode: "00000001",
    productName: "サンプル商品",
    productMeta: "",
    quantity: 1,
    unitPrice: 1000,
    taxRate: 0.1,
    orderType: "stock",
    ...overrides,
  };
}

function baseValues(
  overrides: Partial<SalesOrderFormValues> = {}
): SalesOrderFormValues {
  return {
    customerCode: "000001",
    deliveryAddressId: "",
    orderDate: "2026-05-22",
    deliveryDate: "2026-05-24",
    note: "",
    lines: [baseLine()],
    ...overrides,
  };
}

describe("salesOrderFormSchema（親）", () => {
  it("最小構成で safeParse が成功する", () => {
    const r = salesOrderFormSchema.safeParse(baseValues());
    expect(r.success).toBe(true);
  });

  it("customerCode が空文字で失敗する", () => {
    const r = salesOrderFormSchema.safeParse(
      baseValues({ customerCode: "" })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((e) => e.path[0] === "customerCode")
      ).toBe(true);
    }
  });

  it("orderDate が ISO 形式（YYYY-MM-DD）でないと失敗", () => {
    const r = salesOrderFormSchema.safeParse(
      baseValues({ orderDate: "2026/05/22" })
    );
    expect(r.success).toBe(false);
  });

  it("deliveryDate が ISO 形式でないと失敗", () => {
    const r = salesOrderFormSchema.safeParse(
      baseValues({ deliveryDate: "20260524" })
    );
    expect(r.success).toBe(false);
  });

  it("lines が 0 件だと失敗（最低1行必要）", () => {
    const r = salesOrderFormSchema.safeParse(baseValues({ lines: [] }));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((e) => e.path[0] === "lines")).toBe(true);
    }
  });

  it("deliveryAddressId は省略可（空文字で通る）", () => {
    const r = salesOrderFormSchema.safeParse(
      baseValues({ deliveryAddressId: "" })
    );
    expect(r.success).toBe(true);
  });

  it("note は省略可", () => {
    const r = salesOrderFormSchema.safeParse(baseValues({ note: undefined }));
    expect(r.success).toBe(true);
  });
});

describe("salesOrderFormSchema 内 lineSchema（行）", () => {
  it("行の必須項目が揃えば通る", () => {
    const r = salesOrderFormSchema.safeParse(baseValues({ lines: [baseLine()] }));
    expect(r.success).toBe(true);
  });

  it("productCode が空で失敗", () => {
    const r = salesOrderFormSchema.safeParse(
      baseValues({ lines: [baseLine({ productCode: "" })] })
    );
    expect(r.success).toBe(false);
  });

  it("productName が空で失敗", () => {
    const r = salesOrderFormSchema.safeParse(
      baseValues({ lines: [baseLine({ productName: "" })] })
    );
    expect(r.success).toBe(false);
  });

  it("quantity=0 は失敗（1以上）", () => {
    const r = salesOrderFormSchema.safeParse(
      baseValues({ lines: [baseLine({ quantity: 0 })] })
    );
    expect(r.success).toBe(false);
  });

  it("quantity が小数だと失敗（整数のみ）", () => {
    const r = salesOrderFormSchema.safeParse(
      baseValues({ lines: [baseLine({ quantity: 1.5 })] })
    );
    expect(r.success).toBe(false);
  });

  it("unitPrice が負だと失敗", () => {
    const r = salesOrderFormSchema.safeParse(
      baseValues({ lines: [baseLine({ unitPrice: -1 })] })
    );
    expect(r.success).toBe(false);
  });

  it("unitPrice=0 は許可", () => {
    const r = salesOrderFormSchema.safeParse(
      baseValues({ lines: [baseLine({ unitPrice: 0 })] })
    );
    expect(r.success).toBe(true);
  });

  it("taxRate は 0.1 / 0.08 以外を拒否", () => {
    const r = salesOrderFormSchema.safeParse(
      baseValues({ lines: [baseLine({ taxRate: 0.05 as never })] })
    );
    expect(r.success).toBe(false);
  });

  it("orderType の enum 違反は失敗", () => {
    const r = salesOrderFormSchema.safeParse(
      baseValues({ lines: [baseLine({ orderType: "unknown" as never })] })
    );
    expect(r.success).toBe(false);
  });

  it("productMeta は省略可", () => {
    const r = salesOrderFormSchema.safeParse(
      baseValues({ lines: [baseLine({ productMeta: undefined })] })
    );
    expect(r.success).toBe(true);
  });

  it("数値が文字列でも coerce で通る", () => {
    const r = salesOrderFormSchema.safeParse(
      baseValues({
        lines: [
          baseLine({
            quantity: "5" as never,
            unitPrice: "120" as never,
          }),
        ],
      })
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.lines[0].quantity).toBe(5);
      expect(r.data.lines[0].unitPrice).toBe(120);
    }
  });

  it("複数行を扱える（10% / 8% 混在）", () => {
    const r = salesOrderFormSchema.safeParse(
      baseValues({
        lines: [
          baseLine({ taxRate: 0.1 }),
          baseLine({ productCode: "00000002", taxRate: 0.08 }),
        ],
      })
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.lines).toHaveLength(2);
      expect(r.data.lines.map((l) => l.taxRate)).toEqual([0.1, 0.08]);
    }
  });
});
