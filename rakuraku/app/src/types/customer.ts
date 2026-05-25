export type CustomerRank = "A" | "B" | "C" | "D";
export type CustomerStatus = "active" | "paused" | "closed";
export type InvoiceFormat = "invoice_only" | "invoice_delivery";
export type InvoiceTaxType = "per_line" | "per_voucher" | "per_invoice";
export type TaxRounding = "floor" | "round" | "ceil";

export type CustomerRow = {
  customerCode: string;
  name: string;
  nameKana: string | null;
  postalCode: string | null;
  address: string | null;
  building: string | null;
  phone: string | null;
  fax: string | null;
  contactPerson: string | null;
  email: string | null;
  rank: CustomerRank;
  status: CustomerStatus;
  staffId: string | null;
  staffName: string | null;
  invoiceFormat: InvoiceFormat;
  closingDay: number;
  paymentCycle: string | null;
  invoiceTaxType: InvoiceTaxType;
  taxRounding: TaxRounding;
};

export const RANK_LABEL: Record<CustomerRank, string> = {
  A: "特に大切",
  B: "大切",
  C: "標準",
  D: "小規模",
};

export const STATUS_LABEL: Record<CustomerStatus, string> = {
  active: "取引中",
  paused: "休止中",
  closed: "取引なし",
};

export const INVOICE_FORMAT_LABEL: Record<InvoiceFormat, string> = {
  invoice_only: "請求書のみ",
  invoice_delivery: "請求書＋納品書",
};

export const INVOICE_TAX_TYPE_LABEL: Record<InvoiceTaxType, string> = {
  per_line: "明細ごとに計算",
  per_voucher: "伝票ごとに計算",
  per_invoice: "請求書ごとに計算",
};

export const TAX_ROUNDING_LABEL: Record<TaxRounding, string> = {
  floor: "切り捨て",
  round: "四捨五入",
  ceil: "切り上げ",
};

export const CLOSING_DAY_OPTIONS: { value: number; label: string }[] = [
  { value: 31, label: "末日締め" },
  { value: 20, label: "20日締め" },
  { value: 25, label: "25日締め" },
  { value: 15, label: "15日締め" },
  { value: 10, label: "10日締め" },
  { value: 5, label: "5日締め" },
];

export const PAYMENT_CYCLE_OPTIONS: string[] = [
  "翌月末",
  "翌月20日",
  "翌月10日",
  "翌々月末",
];
