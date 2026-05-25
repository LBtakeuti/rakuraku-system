import { describe, it, expect } from "vitest";
import {
  billingPeriodSchema,
  billingIssueSchema,
} from "../billing";

describe("billingPeriodSchema", () => {
  it("正常値で safeParse 成功", () => {
    const r = billingPeriodSchema.safeParse({
      closingDay: 31,
      periodFrom: "2026-05-01",
      periodTo: "2026-05-31",
    });
    expect(r.success).toBe(true);
  });

  it("closingDay が string でも coerce で通る", () => {
    const r = billingPeriodSchema.safeParse({
      closingDay: "20",
      periodFrom: "2026-05-01",
      periodTo: "2026-05-20",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.closingDay).toBe(20);
  });

  it("closingDay=0 / 32 は範囲外で失敗", () => {
    expect(
      billingPeriodSchema.safeParse({
        closingDay: 0,
        periodFrom: "2026-05-01",
        periodTo: "2026-05-31",
      }).success
    ).toBe(false);
    expect(
      billingPeriodSchema.safeParse({
        closingDay: 32,
        periodFrom: "2026-05-01",
        periodTo: "2026-05-31",
      }).success
    ).toBe(false);
  });

  it("periodFrom / periodTo の形式違反は失敗", () => {
    expect(
      billingPeriodSchema.safeParse({
        closingDay: 31,
        periodFrom: "2026/05/01",
        periodTo: "2026-05-31",
      }).success
    ).toBe(false);
    expect(
      billingPeriodSchema.safeParse({
        closingDay: 31,
        periodFrom: "2026-05-01",
        periodTo: "20260531",
      }).success
    ).toBe(false);
  });
});

describe("billingIssueSchema", () => {
  it("正常値で safeParse 成功", () => {
    const r = billingIssueSchema.safeParse({
      customerCodes: ["000001", "000002"],
      periodFrom: "2026-05-01",
      periodTo: "2026-05-31",
      closingDay: 31,
    });
    expect(r.success).toBe(true);
  });

  it("customerCodes 0 件で失敗", () => {
    const r = billingIssueSchema.safeParse({
      customerCodes: [],
      periodFrom: "2026-05-01",
      periodTo: "2026-05-31",
      closingDay: 31,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msgs = r.error.issues.map((e) => e.message);
      expect(msgs).toContain("発行するお客様を1社以上選んでください");
    }
  });

  it("customerCodes に空文字を含むと失敗", () => {
    const r = billingIssueSchema.safeParse({
      customerCodes: ["000001", ""],
      periodFrom: "2026-05-01",
      periodTo: "2026-05-31",
      closingDay: 31,
    });
    expect(r.success).toBe(false);
  });

  it("periodFrom / periodTo の形式違反は失敗", () => {
    expect(
      billingIssueSchema.safeParse({
        customerCodes: ["000001"],
        periodFrom: "bad",
        periodTo: "2026-05-31",
        closingDay: 31,
      }).success
    ).toBe(false);
  });

  it("closingDay の coerce が効く", () => {
    const r = billingIssueSchema.safeParse({
      customerCodes: ["000001"],
      periodFrom: "2026-05-01",
      periodTo: "2026-05-31",
      closingDay: "31",
    });
    expect(r.success).toBe(true);
  });
});
