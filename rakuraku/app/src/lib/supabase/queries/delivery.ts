import { createClient } from "@/lib/supabase/server";
import type { DeliverableOrder } from "@/types/sales-invoice";

type DbOrder = {
  id: string;
  order_no: string;
  customer_code: string;
  order_date: string;
  delivery_date: string;
  total_amount: number | string;
  customer?: { customer_code: string; name: string } | null;
};

function computeUrgency(deliveryDate: string, today: Date): DeliverableOrder["urgency"] {
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(deliveryDate);
  const dd = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.floor((dd - t) / 86400000);
  if (diff < 0) return "past";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return "future";
}

export type DeliverableFilter = {
  query?: string;
  range?: "today" | "this_week" | "all";
};

export async function listDeliverableOrders(
  filter: DeliverableFilter = {}
): Promise<DeliverableOrder[]> {
  const supabase = await createClient();
  let q = supabase
    .from("sales_order")
    .select(
      "id,order_no,customer_code,order_date,delivery_date,total_amount,customer:customer_code(customer_code,name)"
    )
    .in("status", ["pending", "partial"])
    .order("delivery_date", { ascending: true });

  const term = filter.query?.trim() ?? "";
  if (term) {
    q = q.or(`order_no.ilike.%${term}%,customer_code.ilike.%${term}%`);
  }

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (filter.range === "today") {
    q = q.lte("delivery_date", todayIso);
  } else if (filter.range === "this_week") {
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay() + 6);
    const sundayIso = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}`;
    q = q.lte("delivery_date", sundayIso);
  }

  const { data, error } = await q;
  if (error) throw error;
  const orders = (data ?? []) as unknown as DbOrder[];
  if (orders.length === 0) return [];

  const ids = orders.map((o) => o.id);
  const { data: lineRows, error: lineErr } = await supabase
    .from("sales_order_line")
    .select("sales_order_id")
    .in("sales_order_id", ids);
  if (lineErr) throw lineErr;
  const lineCountMap = new Map<string, number>();
  for (const r of (lineRows ?? []) as { sales_order_id: string }[]) {
    lineCountMap.set(r.sales_order_id, (lineCountMap.get(r.sales_order_id) ?? 0) + 1);
  }

  return orders.map((o) => ({
    id: o.id,
    orderNo: o.order_no,
    customerCode: o.customer_code,
    customerName: o.customer?.name ?? o.customer_code,
    orderDate: o.order_date,
    deliveryDate: o.delivery_date,
    totalAmount: typeof o.total_amount === "string" ? Number(o.total_amount) : o.total_amount,
    lineCount: lineCountMap.get(o.id) ?? 0,
    urgency: computeUrgency(o.delivery_date, today),
  }));
}
