import type { TaxRate } from "@/types/product";
import type { CompanySetting } from "@/types/company-setting";

export type DocumentCompany = CompanySetting;

export type DocumentLineCommon = {
  lineNo: number;
  productCode: string;
  productName: string;
  janCode: string | null;
  unitsPerCase: number;
  quantity: number;
  unitPrice: number;
  taxRate: TaxRate;
  amount: number;
  note: string | null;
};

export type PurchaseOrderDocumentData = {
  company: DocumentCompany;
  purchaseOrderNo: string;
  orderDate: string;
  expectedDeliveryDate: string | null;
  note: string | null;
  supplier: {
    supplierCode: string;
    name: string;
    postalCode: string | null;
    address: string | null;
    phone: string | null;
  };
  lines: PurchaseOrderDocumentLine[];
};

export type PurchaseOrderDocumentLine = DocumentLineCommon & {
  caseCount: number;
};

export type SalesOrderDocumentData = {
  company: DocumentCompany;
  orderNo: string;
  orderDate: string;
  customer: {
    customerCode: string;
    name: string;
    postalCode: string | null;
    address: string | null;
    phone: string | null;
  };
  deliveryAddress: {
    name: string | null;
    postalCode: string | null;
    address: string | null;
    phone: string | null;
  } | null;
  lines: SalesOrderDocumentLine[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  note: string | null;
};

export type SalesOrderDocumentLine = DocumentLineCommon & {
  caseCount: number;
  linkedPurchaseOrderNo: string | null;
};

export type InvoiceDocumentData = {
  company: DocumentCompany;
  statementNo: string;
  customer: {
    customerCode: string;
    name: string;
    postalCode: string | null;
    address: string | null;
  };
  periodFrom: string;
  periodTo: string;
  issueDate: string;
  dueDate: string | null;
  previousBalance: number;
  paymentAmount: number;
  carryOver: number;
  taxBreakdown: TaxBreakdown[];
  currentTotal: number;
  totalDue: number;
  detailLines: InvoiceDetailLine[];
};

export type TaxBreakdown = {
  taxRate: TaxRate;
  subtotal: number;
  taxAmount: number;
};

export type InvoiceDetailLine = {
  invoiceDate: string;
  invoiceNo: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  deliveryNote: string | null;
};

export type BillingListDocumentData = {
  company: DocumentCompany;
  periodFrom: string;
  periodTo: string;
  closingDay: number;
  issueDate: string;
  rows: BillingListRow[];
  totals: BillingListTotals;
};

export type BillingListRow = {
  customerCode: string;
  customerName: string;
  invoiceTaxType: string;
  invoiceCount: number;
  paymentDueDate: string | null;
  previousBalance: number;
  paymentAmount: number;
  carryOver: number;
  currentSubtotal: number;
  currentTax: number;
  currentTotal: number;
  totalDue: number;
};

export type BillingListTotals = {
  invoiceCount: number;
  previousBalance: number;
  paymentAmount: number;
  carryOver: number;
  currentSubtotal: number;
  currentTax: number;
  currentTotal: number;
  totalDue: number;
};
