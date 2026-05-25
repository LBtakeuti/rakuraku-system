import type { TaxRate } from "@/types/product";

export type PurchaseOrderStatus =
  | "draft"
  | "ordered"
  | "partial"
  | "received"
  | "cancelled";

export const PO_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft: "下書き",
  ordered: "発注済み",
  partial: "一部入荷",
  received: "全量入荷",
  cancelled: "取消し済み",
};

export type PurchaseOrderRow = {
  id: string;
  purchaseOrderNo: string;
  supplierCode: string;
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate: string | null;
  status: PurchaseOrderStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  note: string | null;
  totalQuantity: number;
  receivedQuantity: number;
};

export type PurchaseOrderLine = {
  id: string;
  lineNo: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: TaxRate;
  amount: number;
  receivedQuantity: number;
  isLotManaged: boolean;
};

export type PurchaseOrderDetail = PurchaseOrderRow & {
  lines: PurchaseOrderLine[];
};
