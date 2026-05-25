export type TaxRate = 0.1 | 0.08;
export type OrderType = "stock" | "order_at_sale" | "manual_order";
export type ProductStatus = "active" | "discontinued";

export type ProductRow = {
  productCode: string;
  name: string;
  janCode: string | null;
  unitsPerCase: number;
  defaultSalesUnitPrice: number | null;
  defaultPurchaseUnitPrice: number | null;
  defaultTaxRate: TaxRate;
  defaultOrderType: OrderType;
  isStocked: boolean;
  isLotManaged: boolean;
  safetyStock: number;
  status: ProductStatus;
  totalStock: number | null;
};

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  stock: "在庫から出荷",
  order_at_sale: "注文時に発注",
  manual_order: "注文後に手動",
};

export const ORDER_TYPE_DESCRIPTION: Record<OrderType, string> = {
  order_at_sale: "注文を受けるたびに、自動で仕入先へ発注します",
  manual_order: "注文後に、ボタンを押して発注します",
  stock: "在庫を持っている商品。在庫から引きます",
};
