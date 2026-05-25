import type { TaxRate } from "@/types/product";

export type BillingStatus = "unbilled" | "billed";

export type SalesInvoiceRow = {
  id: string;
  invoiceNo: string;
  customerCode: string;
  customerName: string;
  invoiceDate: string;
  sourceOrderNo: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  billingStatus: BillingStatus;
  staffName: string | null;
  lineCount: number;
};

export type SalesInvoiceLine = {
  id: string;
  lineNo: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: TaxRate;
  amount: number;
};

export type SalesInvoiceDetail = SalesInvoiceRow & {
  lines: SalesInvoiceLine[];
};

export type SalesSummary = {
  totalAmount: number;
  invoiceCount: number;
  customerCount: number;
  periodLabel: string;
};

export type DeliverableOrder = {
  id: string;
  orderNo: string;
  customerCode: string;
  customerName: string;
  orderDate: string;
  deliveryDate: string;
  totalAmount: number;
  lineCount: number;
  urgency: "today" | "tomorrow" | "future" | "past";
};
