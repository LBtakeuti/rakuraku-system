import type {
  InvoiceFormat,
  InvoiceTaxType,
  TaxRounding,
} from "@/types/customer";

export type BillingStatementStatus = "unpaid" | "partial" | "paid";

export const BILLING_STATEMENT_STATUS_LABEL: Record<
  BillingStatementStatus,
  string
> = {
  unpaid: "未入金",
  partial: "一部入金",
  paid: "入金済み",
};

export type BillingSummaryRow = {
  customerCode: string;
  customerName: string;
  invoiceFormat: InvoiceFormat;
  closingDay: number;
  paymentCycle: string | null;
  invoiceTaxType: InvoiceTaxType;
  taxRounding: TaxRounding;
  previousBalance: number;
  paymentAmount: number;
  carryOver: number;
  currentSubtotal: number;
  currentTax: number;
  currentTotal: number;
  totalDue: number;
  invoiceIds: string[];
  paymentDueDate: string | null;
};
