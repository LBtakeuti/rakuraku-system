import { describe, it, expect } from "vitest";
import { computePaymentDueDate } from "../payment-due-date";

describe("computePaymentDueDate", () => {
  it("paymentCycle が null なら null", () => {
    expect(computePaymentDueDate("2026-05-31", null)).toBeNull();
  });

  it("不正な periodTo は null", () => {
    expect(computePaymentDueDate("not-a-date", "翌月末")).toBeNull();
  });

  it("未対応の paymentCycle は null", () => {
    expect(computePaymentDueDate("2026-05-31", "毎月15日")).toBeNull();
  });

  it("『翌月末』：2026-05-31 → 2026-06-30", () => {
    expect(computePaymentDueDate("2026-05-31", "翌月末")).toBe("2026-06-30");
  });

  it("『翌月末』：12月締めは翌年1月末になる", () => {
    expect(computePaymentDueDate("2026-12-31", "翌月末")).toBe("2027-01-31");
  });

  it("『翌月20日』：2026-05-31 → 2026-06-20", () => {
    expect(computePaymentDueDate("2026-05-31", "翌月20日")).toBe("2026-06-20");
  });

  it("『翌月10日』：2026-05-31 → 2026-06-10", () => {
    expect(computePaymentDueDate("2026-05-31", "翌月10日")).toBe("2026-06-10");
  });

  it("『翌々月末』：2026-05-31 → 2026-07-31", () => {
    expect(computePaymentDueDate("2026-05-31", "翌々月末")).toBe("2026-07-31");
  });

  it("『翌々月末』：11月締めは翌年1月末", () => {
    expect(computePaymentDueDate("2026-11-30", "翌々月末")).toBe("2027-01-31");
  });

  it("『翌月末』：閏月対応（2027年2月末は2/28）", () => {
    expect(computePaymentDueDate("2027-01-31", "翌月末")).toBe("2027-02-28");
  });
});
