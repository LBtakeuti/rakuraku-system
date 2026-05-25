import type {
  PurchaseOrderDocumentData,
  PurchaseOrderDocumentLine,
} from "@/lib/documents/types";
import type { CompanySetting } from "@/types/company-setting";

export type PurchaseOrderBuilderInput = {
  company: CompanySetting;
  purchaseOrder: {
    purchaseOrderNo: string;
    orderDate: string;
    expectedDeliveryDate: string | null;
    note: string | null;
  };
  supplier: {
    supplierCode: string;
    name: string;
    postalCode: string | null;
    address: string | null;
    phone: string | null;
  };
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
    note: string | null;
  }>;
};

export function buildPurchaseOrderDocument(
  input: PurchaseOrderBuilderInput
): PurchaseOrderDocumentData {
  const lines: PurchaseOrderDocumentLine[] = input.lines.map((line) => ({
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
  }));

  return {
    company: input.company,
    purchaseOrderNo: input.purchaseOrder.purchaseOrderNo,
    orderDate: input.purchaseOrder.orderDate,
    expectedDeliveryDate: input.purchaseOrder.expectedDeliveryDate,
    note: input.purchaseOrder.note,
    supplier: input.supplier,
    lines,
  };
}
