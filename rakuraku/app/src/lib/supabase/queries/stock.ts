import { createClient } from "@/lib/supabase/server";
import type {
  ProductStockSummary,
  ProductStockLot,
  ExpiryStatus,
} from "@/types/stock";

export function computeExpiryStatus(
  expiry: string | null,
  today: Date = new Date()
): ExpiryStatus {
  if (!expiry) return "none";
  const expiryDate = new Date(expiry);
  if (Number.isNaN(expiryDate.getTime())) return "none";
  const todayMs = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const expiryMs = Date.UTC(
    expiryDate.getFullYear(),
    expiryDate.getMonth(),
    expiryDate.getDate()
  );
  const days = Math.floor((expiryMs - todayMs) / 86400000);
  if (days <= 14) return "danger";
  if (days <= 60) return "warning";
  return "ok";
}

type DbStockRow = {
  id: string;
  product_code: string;
  warehouse_id: string;
  lot_no: string | null;
  expiry_date: string | null;
  quantity_on_hand: number;
  quantity_allocated: number;
  received_at: string | null;
  product?: {
    product_code: string;
    name: string;
    jan_code: string | null;
    is_lot_managed: boolean;
  } | null;
  warehouse?: { id: string; name: string } | null;
};

export type StockListFilter = {
  query?: string;
  expiryFilter?: "all" | "danger" | "warning";
};

export async function listStockByProduct(
  filter: StockListFilter = {}
): Promise<ProductStockSummary[]> {
  const supabase = await createClient();
  let q = supabase
    .from("product_stock")
    .select(
      "id,product_code,warehouse_id,lot_no,expiry_date,quantity_on_hand,quantity_allocated,received_at,product:product_code(product_code,name,jan_code,is_lot_managed)"
    );
  const term = filter.query?.trim() ?? "";
  if (term) {
    q = q.or(`product_code.ilike.%${term}%,lot_no.ilike.%${term}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as DbStockRow[];

  type Acc = {
    productCode: string;
    productName: string;
    janCode: string | null;
    isLotManaged: boolean;
    quantityOnHand: number;
    quantityAllocated: number;
    nearestExpiry: string | null;
  };
  const map = new Map<string, Acc>();
  for (const r of rows) {
    if (!r.product) continue;
    const cur = map.get(r.product_code) ?? {
      productCode: r.product_code,
      productName: r.product.name,
      janCode: r.product.jan_code,
      isLotManaged: r.product.is_lot_managed,
      quantityOnHand: 0,
      quantityAllocated: 0,
      nearestExpiry: null,
    };
    cur.quantityOnHand += r.quantity_on_hand;
    cur.quantityAllocated += r.quantity_allocated;
    if (r.expiry_date) {
      if (!cur.nearestExpiry || r.expiry_date < cur.nearestExpiry) {
        cur.nearestExpiry = r.expiry_date;
      }
    }
    map.set(r.product_code, cur);
  }
  const today = new Date();
  let results: ProductStockSummary[] = Array.from(map.values()).map((a) => ({
    ...a,
    quantityAvailable: Math.max(0, a.quantityOnHand - a.quantityAllocated),
    expiryStatus: computeExpiryStatus(a.nearestExpiry, today),
  }));

  if (term) {
    const t = term.toLowerCase();
    results = results.filter(
      (r) =>
        r.productCode.toLowerCase().includes(t) ||
        r.productName.toLowerCase().includes(t) ||
        (r.janCode ? r.janCode.toLowerCase().includes(t) : false)
    );
  }
  if (filter.expiryFilter === "danger") {
    results = results.filter((r) => r.expiryStatus === "danger");
  } else if (filter.expiryFilter === "warning") {
    results = results.filter(
      (r) => r.expiryStatus === "danger" || r.expiryStatus === "warning"
    );
  }

  results.sort((a, b) => a.productCode.localeCompare(b.productCode));
  return results;
}

export async function listStockByLot(
  filter: StockListFilter = {}
): Promise<ProductStockLot[]> {
  const supabase = await createClient();
  let q = supabase
    .from("product_stock")
    .select(
      "id,product_code,warehouse_id,lot_no,expiry_date,quantity_on_hand,quantity_allocated,received_at,product:product_code(product_code,name,jan_code,is_lot_managed),warehouse:warehouse_id(id,name)"
    );
  const term = filter.query?.trim() ?? "";
  if (term) {
    q = q.or(`product_code.ilike.%${term}%,lot_no.ilike.%${term}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as DbStockRow[];

  const today = new Date();
  let results: ProductStockLot[] = rows.map((r) => ({
    id: r.id,
    productCode: r.product_code,
    productName: r.product?.name ?? r.product_code,
    warehouseName: r.warehouse?.name ?? "",
    lotNo: r.lot_no,
    expiryDate: r.expiry_date,
    quantityOnHand: r.quantity_on_hand,
    quantityAllocated: r.quantity_allocated,
    quantityAvailable: Math.max(0, r.quantity_on_hand - r.quantity_allocated),
    expiryStatus: computeExpiryStatus(r.expiry_date, today),
    receivedAt: r.received_at,
  }));

  if (term) {
    const t = term.toLowerCase();
    results = results.filter(
      (r) =>
        r.productCode.toLowerCase().includes(t) ||
        r.productName.toLowerCase().includes(t) ||
        (r.lotNo ? r.lotNo.toLowerCase().includes(t) : false)
    );
  }
  if (filter.expiryFilter === "danger") {
    results = results.filter((r) => r.expiryStatus === "danger");
  } else if (filter.expiryFilter === "warning") {
    results = results.filter(
      (r) => r.expiryStatus === "danger" || r.expiryStatus === "warning"
    );
  }

  results.sort((a, b) => {
    if (a.productCode !== b.productCode)
      return a.productCode.localeCompare(b.productCode);
    if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
    if (a.expiryDate) return -1;
    if (b.expiryDate) return 1;
    return 0;
  });
  return results;
}

export async function getExpiryWarningCounts(): Promise<{
  danger: number;
  warning: number;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_stock")
    .select("expiry_date,quantity_on_hand")
    .gt("quantity_on_hand", 0);
  if (error) throw error;
  const today = new Date();
  let danger = 0;
  let warning = 0;
  for (const r of (data ?? []) as {
    expiry_date: string | null;
    quantity_on_hand: number;
  }[]) {
    const status = computeExpiryStatus(r.expiry_date, today);
    if (status === "danger") danger += 1;
    else if (status === "warning") warning += 1;
  }
  return { danger, warning };
}
