import type { OrderType, TaxRate } from "@/types/product";

export type SalesOrderStatus =
  | "draft"
  | "pending"
  | "partial"
  | "fulfilled"
  | "cancelled";

export const SALES_ORDER_STATUS_LABEL: Record<SalesOrderStatus, string> = {
  draft: "下書き",
  pending: "納品待ち",
  partial: "一部納品",
  fulfilled: "納品済み",
  cancelled: "取消し済み",
};

export type SalesOrderRow = {
  id: string;
  orderNo: string;
  customerCode: string;
  customerName: string;
  deliveryAddressId: string | null;
  orderDate: string;
  deliveryDate: string;
  status: SalesOrderStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  note: string | null;
  staffName: string | null;
};

export type SalesOrderLine = {
  id: string;
  lineNo: number;
  productCode: string;
  productNameSnapshot: string;
  quantity: number;
  unitPrice: number;
  taxRate: TaxRate;
  amount: number;
  orderType: OrderType;
  fulfilledQuantity: number;
  note: string | null;
};

export type SalesOrderDetail = SalesOrderRow & {
  lines: SalesOrderLine[];
};

export type DeliveryAddressOption = {
  id: string;
  name: string;
  address: string | null;
  isDefault: boolean;
};

export type ProductSearchResult = {
  productCode: string;
  name: string;
  janCode: string | null;
  unitsPerCase: number;
  defaultSalesUnitPrice: number | null;
  defaultTaxRate: TaxRate;
  defaultOrderType: OrderType;
  isStocked: boolean;
  totalOnHand: number;
  totalAllocated: number;
  supplierCode: string | null;
};
