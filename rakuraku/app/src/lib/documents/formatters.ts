/**
 * 帳票PDFで用いる表示用のフォーマッタ群（pure 関数）。
 * 帳票表示時のみ使用し、内部計算は raw 値で扱う。
 */

export function formatCurrency(value: number): string {
  return value.toLocaleString("ja-JP");
}

export function formatCurrencyWithSymbol(value: number): string {
  return `￥${formatCurrency(value)}`;
}

/**
 * ISO 形式（YYYY-MM-DD）の日付文字列を「YYYY年 M月 D日」へ整形する。
 * 不正な入力は空文字を返す。
 */
export function formatDateJP(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const year = m[1];
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  return `${year}年 ${month}月${day}日`;
}

/**
 * ISO 形式を「YYYY/MM/DD」に整形する（明細行など狭い場所向け）。
 */
export function formatDateSlash(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[1]}/${m[2]}/${m[3]}`;
}

export function formatTaxRatePct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}
