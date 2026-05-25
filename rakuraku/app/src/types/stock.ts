export type ExpiryStatus = "danger" | "warning" | "ok" | "none";

export const EXPIRY_LABEL: Record<ExpiryStatus, string> = {
  danger: "期限切れ間近",
  warning: "期限要注意",
  ok: "正常",
  none: "期限なし",
};

export type ProductStockSummary = {
  productCode: string;
  productName: string;
  janCode: string | null;
  isLotManaged: boolean;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  nearestExpiry: string | null;
  expiryStatus: ExpiryStatus;
};

export type ProductStockLot = {
  id: string;
  productCode: string;
  productName: string;
  warehouseName: string;
  lotNo: string | null;
  expiryDate: string | null;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  expiryStatus: ExpiryStatus;
  receivedAt: string | null;
};
