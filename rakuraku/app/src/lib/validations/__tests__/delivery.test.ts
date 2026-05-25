import { describe, it, expect } from "vitest";
import { deliveryConfirmSchema } from "../delivery";

const UUID1 = "11111111-1111-4111-8111-111111111111";
const UUID2 = "22222222-2222-4222-8222-222222222222";

describe("deliveryConfirmSchema", () => {
  it("最小構成（1件の UUID）で safeParse 成功", () => {
    const r = deliveryConfirmSchema.safeParse({
      orderIds: [UUID1],
      deliveryDate: "2026-05-22",
    });
    expect(r.success).toBe(true);
  });

  it("複数の UUID も通る", () => {
    const r = deliveryConfirmSchema.safeParse({
      orderIds: [UUID1, UUID2],
      deliveryDate: "2026-05-22",
    });
    expect(r.success).toBe(true);
  });

  it("orderIds が 0 件だと失敗", () => {
    const r = deliveryConfirmSchema.safeParse({
      orderIds: [],
      deliveryDate: "2026-05-22",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msgs = r.error.issues.map((e) => e.message);
      expect(msgs).toContain("納品する注文を1件以上選んでください");
    }
  });

  it("orderIds に非 UUID が含まれると失敗", () => {
    const r = deliveryConfirmSchema.safeParse({
      orderIds: [UUID1, "not-a-uuid"],
      deliveryDate: "2026-05-22",
    });
    expect(r.success).toBe(false);
  });

  it("deliveryDate が ISO 形式（YYYY-MM-DD）でないと失敗", () => {
    const r = deliveryConfirmSchema.safeParse({
      orderIds: [UUID1],
      deliveryDate: "2026/05/22",
    });
    expect(r.success).toBe(false);
  });

  it("deliveryDate 欠落で失敗", () => {
    const r = deliveryConfirmSchema.safeParse({
      orderIds: [UUID1],
    });
    expect(r.success).toBe(false);
  });
});
