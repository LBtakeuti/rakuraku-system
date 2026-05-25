import type {
  SalesOrderDocumentData,
  SalesOrderDocumentLine,
} from "@/lib/documents/types";
import type { CompanySetting } from "@/types/company-setting";

export type SalesOrderBuilderInput = {
  company: CompanySetting;
  salesOrder: {
    orderNo: string;
    orderDate: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    note: string | null;
  };
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
  lines: Array<{
    lineNo: number;
    productCode: string;
    productName: string;
    janCode: string | null;
    unitsPerCase: number;
    quantity: number;
    unitPrice: number;
    taxRate: 0.1 | 0.08;
    amount: number;
    linkedPurchaseOrderNo: string | null;
    note: string | null;
  }>;
};

export function buildSalesOrderDocument(
  input: SalesOrderBuilderInput
): SalesOrderDocumentData {
  const lines: SalesOrderDocumentLine[] = input.lines.map((line) => ({
    lineNo: line.lineNo,
    productCode: line.productCode,
    productName: line.productName,
    janCode: line.janCode,
    unitsPerCase: line.unitsPerCase,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    taxRate: line.taxRate,
    amount: line.amount,
    note: line.note,
    caseCount:
      line.unitsPerCase > 0
        ? Math.floor(line.quantity / line.unitsPerCase)
        : 0,
    linkedPurchaseOrderNo: line.linkedPurchaseOrderNo,
  }));

  return {
    company: input.company,
    orderNo: input.salesOrder.orderNo,
    orderDate: input.salesOrder.orderDate,
    customer: input.customer,
    deliveryAddress: input.deliveryAddress,
    lines,
    subtotal: input.salesOrder.subtotal,
    taxAmount: input.salesOrder.taxAmount,
    totalAmount: input.salesOrder.totalAmount,
    note: input.salesOrder.note,
  };
}
