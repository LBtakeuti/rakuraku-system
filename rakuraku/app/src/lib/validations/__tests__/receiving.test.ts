import { describe, it, expect } from "vitest";
import {
  receivingFormSchema,
  type ReceivingFormValues,
  type ReceivingLineInput,
} from "../receiving";

const PO_ID = "11111111-1111-4111-8111-111111111111";
const POL_ID = "22222222-2222-4222-8222-222222222222";

function baseLine(
  overrides: Partial<ReceivingLineInput> = {}
): ReceivingLineInput {
  return {
    purchaseOrderLineId: POL_ID,
    productCode: "00000001",
    productName: "サンプル商品",
    quantity: 1,
    lotNo: "",
    expiryDate: "",
    isLotManaged: false,
    note: "",
    ...overrides,
  };
}

function baseValues(
  overrides: Partial<ReceivingFormValues> = {}
): ReceivingFormValues {
  return {
    purchaseOrderId: PO_ID,
    receivedAt: "2026-05-22",
    lines: [baseLine()],
    ...overrides,
  };
}

describe("receivingFormSchema（親）", () => {
  it("最小構成で safeParse が成功する", () => {
    const r = receivingFormSchema.safeParse(baseValues());
    expect(r.success).toBe(true);
  });

  it("purchaseOrderId が UUID でないと失敗", () => {
    const r = receivingFormSchema.safeParse(
      baseValues({ purchaseOrderId: "not-a-uuid" })
    );
    expect(r.success).toBe(false);
  });

  it("receivedAt が ISO 形式（YYYY-MM-DD）でないと失敗", () => {
    const r = receivingFormSchema.safeParse(
      baseValues({ receivedAt: "2026/05/22" })
    );
    expect(r.success).toBe(false);
  });

  it("lines が 0 件だと失敗（最低1行必要）", () => {
    const r = receivingFormSchema.safeParse(baseValues({ lines: [] }));
    expect(r.success).toBe(false);
  });
});

describe("receivingFormSchema 内 lineSchema", () => {
  it("行の必須項目が揃えば通る", () => {
    const r = receivingFormSchema.safeParse(baseValues({ lines: [baseLine()] }));
    expect(r.success).toBe(true);
  });

  it("purchaseOrderLineId が UUID でないと失敗", () => {
    const r = receivingFormSchema.safeParse(
      baseValues({
        lines: [baseLine({ purchaseOrderLineId: "not-a-uuid" })],
      })
    );
    expect(r.success).toBe(false);
  });

  it("productCode が空だと失敗", () => {
    const r = receivingFormSchema.safeParse(
      baseValues({ lines: [baseLine({ productCode: "" })] })
    );
    expect(r.success).toBe(false);
  });

  it("quantity=0 でも通る（数量ゼロ行はスキップ、別行で >0 があれば OK）", () => {
    const r = receivingFormSchema.safeParse(
      baseValues({
        lines: [
          baseLine({ quantity: 0 }),
          baseLine({ purchaseOrderLineId: PO_ID, quantity: 5 }),
        ],
      })
    );
    expect(r.success).toBe(true);
  });

  it("quantity が負の値だと失敗", () => {
    const r = receivingFormSchema.safeParse(
      baseValues({ lines: [baseLine({ quantity: -1 })] })
    );
    expect(r.success).toBe(false);
  });

  it("quantity が小数だと失敗（整数のみ）", () => {
    const r = receivingFormSchema.safeParse(
      baseValues({ lines: [baseLine({ quantity: 1.5 })] })
    );
    expect(r.success).toBe(false);
  });

  it("expiryDate が空文字なら通る", () => {
    const r = receivingFormSchema.safeParse(
      baseValues({ lines: [baseLine({ expiryDate: "" })] })
    );
    expect(r.success).toBe(true);
  });

  it("expiryDate の形式違反は失敗", () => {
    const r = receivingFormSchema.safeParse(
      baseValues({ lines: [baseLine({ expiryDate: "2027/01/31" })] })
    );
    expect(r.success).toBe(false);
  });

  it("数値が文字列でも coerce で通る", () => {
    const r = receivingFormSchema.safeParse(
      baseValues({
        lines: [baseLine({ quantity: "7" as never })],
      })
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.lines[0].quantity).toBe(7);
    }
  });
});

describe("receivingFormSchema superRefine", () => {
  it("数量がすべて 0 だと『1行以上で入荷数量を入力してください』エラー", () => {
    const r = receivingFormSchema.safeParse(
      baseValues({
        lines: [baseLine({ quantity: 0 })],
      })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      const msgs = r.error.issues.map((e) => e.message);
      expect(msgs).toContain("1行以上で入荷数量を入力してください");
    }
  });

  it("isLotManaged=true && quantity>0 で expiryDate が空だとエラー", () => {
    const r = receivingFormSchema.safeParse(
      baseValues({
        lines: [
          baseLine({
            isLotManaged: true,
            lotNo: "L1",
            expiryDate: "",
            quantity: 5,
          }),
        ],
      })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find(
        (e) =>
          e.path[0] === "lines" &&
          e.path[1] === 0 &&
          e.path[2] === "expiryDate"
      );
      expect(issue?.message).toBe(
        "期限管理商品は賞味期限を入力してください"
      );
    }
  });

  it("isLotManaged=true でも quantity=0 なら expiryDate チェックはスキップ（数量ゼロ行）", () => {
    // ただし 0 だけだと別の superRefine（totalNonZero === 0）でも失敗するので、
    // もう 1 行 quantity>0 を入れて検証する
    const r = receivingFormSchema.safeParse(
      baseValues({
        lines: [
          baseLine({
            isLotManaged: true,
            lotNo: "L1",
            expiryDate: "",
            quantity: 0,
          }),
          baseLine({
            purchaseOrderLineId: PO_ID,
            isLotManaged: false,
            quantity: 5,
          }),
        ],
      })
    );
    expect(r.success).toBe(true);
  });

  it("isLotManaged=true && quantity>0 && expiryDate あり なら通る", () => {
    const r = receivingFormSchema.safeParse(
      baseValues({
        lines: [
          baseLine({
            isLotManaged: true,
            lotNo: "L1",
            expiryDate: "2027-12-31",
            quantity: 5,
          }),
        ],
      })
    );
    expect(r.success).toBe(true);
  });
});
