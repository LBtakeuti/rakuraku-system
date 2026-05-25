/**
 * 締め日と支払サイクルから支払期限を計算する。
 * - "翌月末" / "翌月20日" / "翌月10日" / "翌々月末" を解釈
 * - 該当しない（NULL / 解釈不能）場合は null を返す
 */

function endOfMonth(year: number, month: number): Date {
  // month は 0-indexed
  return new Date(year, month + 1, 0);
}

function fmtIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computePaymentDueDate(
  periodTo: string,
  paymentCycle: string | null
): string | null {
  if (!paymentCycle) return null;
  const periodToDate = new Date(periodTo);
  if (Number.isNaN(periodToDate.getTime())) return null;

  const year = periodToDate.getFullYear();
  const month = periodToDate.getMonth(); // 0-indexed

  switch (paymentCycle) {
    case "翌月末":
      return fmtIso(endOfMonth(year, month + 1));
    case "翌月20日":
      return fmtIso(new Date(year, month + 1, 20));
    case "翌月10日":
      return fmtIso(new Date(year, month + 1, 10));
    case "翌々月末":
      return fmtIso(endOfMonth(year, month + 2));
    default:
      return null;
  }
}
