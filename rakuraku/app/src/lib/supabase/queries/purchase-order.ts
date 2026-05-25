import { createClient } from "@/lib/supabase/server";
import type {
  PurchaseOrderRow,
  PurchaseOrderDetail,
  PurchaseOrderLine,
  PurchaseOrderStatus,
} from "@/types/purchase-order";
import type { TaxRate } from "@/types/product";

type DbPO = {
  id: string;
  purchase_order_no: string;
  supplier_code: string;
  order_date: string;
  expected_delivery_date: string | null;
  status: PurchaseOrderStatus;
  subtotal: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  note: string | null;
  supplier?: { supplier_code: string; name: string } | null;
};

type DbPOLine = {
  id: string;
  purchase_order_id: string;
  line_no: number;
  product_code: string;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number | string;
  tax_rate: number | string;
  amount: number | string;
  received_quantity: number;
  note: string | null;
  product?: { product_code: string; is_lot_managed: boolean } | null;
};

function n(v: number | string | null): number {
  if (v === null) return 0;
  return typeof v === "string" ? Number(v) : v;
}

function aggregateLines(lines: DbPOLine[]): {
  totalQuantity: number;
  receivedQuantity: number;
} {
  let totalQuantity = 0;
  let receivedQuantity = 0;
  for (const l of lines) {
    totalQuantity += l.quantity;
    receivedQuantity += l.received_quantity;
  }
  return { totalQuantity, receivedQuantity };
}

function mapPO(r: DbPO, totals: { totalQuantity: number; receivedQuantity: number }): PurchaseOrderRow {
  return {
    id: r.id,
    purchaseOrderNo: r.purchase_order_no,
    supplierCode: r.supplier_code,
    supplierName: r.supplier?.name ?? r.supplier_code,
    orderDate: r.order_date,
    expectedDeliveryDate: r.expected_delivery_date,
    status: r.status,
    subtotal: n(r.subtotal),
    taxAmount: n(r.tax_amount),
    totalAmount: n(r.total_amount),
    note: r.note,
    totalQuantity: totals.totalQuantity,
    receivedQuantity: totals.receivedQuantity,
  };
}

function mapLine(l: DbPOLine): PurchaseOrderLine {
  const rate = typeof l.tax_rate === "string" ? Number(l.tax_rate) : l.tax_rate;
  return {
    id: l.id,
    lineNo: l.line_no,
    productCode: l.product_code,
    productName: l.product_name_snapshot,
    quantity: l.quantity,
    unitPrice: n(l.unit_price),
    taxRate: (rate === 0.08 ? 0.08 : 0.1) as TaxRate,
    amount: n(l.amount),
    receivedQuantity: l.received_quantity,
    isLotManaged: Boolean(l.product?.is_lot_managed),
  };
}

export type PurchaseOrderListFilter = {
  query?: string;
  status?: "all" | "ordered" | "partial" | "received" | "cancelled";
  page?: number;
  pageSize?: number;
};

export async function listPurchaseOrders(
  filter: PurchaseOrderListFilter = {}
): Promise<{ rows: PurchaseOrderRow[]; total: number }> {
  const supabase = await createClient();
  const pageSize = filter.pageSize ?? 20;
  const page = Math.max(1, filter.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("purchase_order")
    .select(
      "id,purchase_order_no,supplier_code,order_date,expected_delivery_date,status,subtotal,tax_amount,total_amount,note,supplier:supplier_code(supplier_code,name)",
      { count: "exact" }
    )
    .order("purchase_order_no", { ascending: false });

  if (filter.query) {
    const term = filter.query.trim();
    if (term) {
      q = q.or(
        `purchase_order_no.ilike.%${term}%,supplier_code.ilike.%${term}%`
      );
    }
  }
  if (filter.status === "ordered") q = q.eq("status", "ordered");
  if (filter.status === "partial") q = q.eq("status", "partial");
  if (filter.status === "received") q = q.eq("status", "received");
  if (filter.status === "cancelled") q = q.eq("status", "cancelled");

  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  const pos = (data ?? []) as unknown as DbPO[];

  // Sum lines for progress display
  const ids = pos.map((p) => p.id);
  const totalsByPO = new Map<
    string,
    { totalQuantity: number; receivedQuantity: number }
  >();
  if (ids.length > 0) {
    const { data: lineRows, error: lineErr } = await supabase
      .from("purchase_order_line")
      .select("purchase_order_id,quantity,received_quantity")
      .in("purchase_order_id", ids);
    if (lineErr) throw lineErr;
    for (const l of (lineRows ?? []) as {
      purchase_order_id: string;
      quantity: number;
      received_quantity: number;
    }[]) {
      const cur = totalsByPO.get(l.purchase_order_id) ?? {
        totalQuantity: 0,
        receivedQuantity: 0,
      };
      cur.totalQuantity += l.quantity;
      cur.receivedQuantity += l.received_quantity;
      totalsByPO.set(l.purchase_order_id, cur);
    }
  }

  return {
    rows: pos.map((p) =>
      mapPO(p, totalsByPO.get(p.id) ?? { totalQuantity: 0, receivedQuantity: 0 })
    ),
    total: count ?? 0,
  };
}

export async function getPurchaseOrder(
  id: string
): Promise<PurchaseOrderDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_order")
    .select(
      "id,purchase_order_no,supplier_code,order_date,expected_delivery_date,status,subtotal,tax_amount,total_amount,note,supplier:supplier_code(supplier_code,name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const po = data as unknown as DbPO;

  const { data: lineRows, error: lineErr } = await supabase
    .from("purchase_order_line")
    .select(
      "id,purchase_order_id,line_no,product_code,product_name_snapshot,quantity,unit_price,tax_rate,amount,received_quantity,note,product:product_code(product_code,is_lot_managed)"
    )
    .eq("purchase_order_id", id)
    .order("line_no");
  if (lineErr) throw lineErr;
  const lines = (lineRows ?? []) as unknown as DbPOLine[];

  const totals = aggregateLines(lines);
  return {
    ...mapPO(po, totals),
    lines: lines.map(mapLine),
  };
}

export async function listReceivablePurchaseOrders(): Promise<
  PurchaseOrderRow[]
> {
  // 入荷登録可能（ordered または partial）の発注一覧
  const { rows } = await listPurchaseOrders({
    status: "all",
    pageSize: 100,
  });
  return rows.filter((r) => r.status === "ordered" || r.status === "partial");
}
