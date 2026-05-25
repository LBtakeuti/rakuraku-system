import { createClient } from "@/lib/supabase/server";
import type {
  SalesOrderRow,
  SalesOrderDetail,
  SalesOrderLine,
  SalesOrderStatus,
  DeliveryAddressOption,
  ProductSearchResult,
} from "@/types/sales-order";
import type { OrderType, TaxRate } from "@/types/product";

type DbSalesOrder = {
  id: string;
  order_no: string;
  customer_code: string;
  delivery_address_id: string | null;
  order_date: string;
  delivery_date: string;
  status: SalesOrderStatus;
  subtotal: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  note: string | null;
  customer?: { customer_code: string; name: string } | null;
  staff?: { id: string; name: string } | null;
};

function n(v: number | string | null): number {
  if (v === null) return 0;
  return typeof v === "string" ? Number(v) : v;
}

function mapOrder(r: DbSalesOrder): SalesOrderRow {
  return {
    id: r.id,
    orderNo: r.order_no,
    customerCode: r.customer_code,
    customerName: r.customer?.name ?? r.customer_code,
    deliveryAddressId: r.delivery_address_id,
    orderDate: r.order_date,
    deliveryDate: r.delivery_date,
    status: r.status,
    subtotal: n(r.subtotal),
    taxAmount: n(r.tax_amount),
    totalAmount: n(r.total_amount),
    note: r.note,
    staffName: r.staff?.name ?? null,
  };
}

export type SalesOrderListFilter = {
  query?: string;
  status?: "all" | "pending" | "fulfilled" | "cancelled";
  period?: "today" | "this_week" | "this_month" | "last_month" | "all";
  page?: number;
  pageSize?: number;
};

function periodRange(period: SalesOrderListFilter["period"]): {
  from: string;
  to: string;
} | null {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (period === "today") {
    const d = new Date(year, month, day);
    return { from: fmt(d), to: fmt(d) };
  }
  if (period === "this_week") {
    const start = new Date(year, month, day - now.getDay());
    const end = new Date(year, month, day - now.getDay() + 6);
    return { from: fmt(start), to: fmt(end) };
  }
  if (period === "this_month") {
    return {
      from: fmt(new Date(year, month, 1)),
      to: fmt(new Date(year, month + 1, 0)),
    };
  }
  if (period === "last_month") {
    return {
      from: fmt(new Date(year, month - 1, 1)),
      to: fmt(new Date(year, month, 0)),
    };
  }
  return null;
}

export async function listSalesOrders(
  filter: SalesOrderListFilter = {}
): Promise<{ rows: SalesOrderRow[]; total: number }> {
  const supabase = await createClient();
  const pageSize = filter.pageSize ?? 20;
  const page = Math.max(1, filter.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("sales_order")
    .select(
      "id,order_no,customer_code,delivery_address_id,order_date,delivery_date,status,subtotal,tax_amount,total_amount,note,customer:customer_code(customer_code,name),staff:staff_id(id,name)",
      { count: "exact" }
    )
    .order("order_no", { ascending: false });

  if (filter.query) {
    const term = filter.query.trim();
    if (term) {
      q = q.or(`order_no.ilike.%${term}%,customer_code.ilike.%${term}%`);
    }
  }
  if (filter.status === "pending") q = q.in("status", ["pending", "partial"]);
  if (filter.status === "fulfilled") q = q.eq("status", "fulfilled");
  if (filter.status === "cancelled") q = q.eq("status", "cancelled");

  const range = periodRange(filter.period ?? "all");
  if (range) q = q.gte("order_date", range.from).lte("order_date", range.to);

  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  return {
    rows: (data ?? []).map((r) => mapOrder(r as unknown as DbSalesOrder)),
    total: count ?? 0,
  };
}

type DbSalesOrderLine = {
  id: string;
  line_no: number;
  product_code: string;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number | string;
  tax_rate: number | string;
  amount: number | string;
  order_type: OrderType;
  fulfilled_quantity: number;
  note: string | null;
};

function mapLine(l: DbSalesOrderLine): SalesOrderLine {
  const rate = typeof l.tax_rate === "string" ? Number(l.tax_rate) : l.tax_rate;
  return {
    id: l.id,
    lineNo: l.line_no,
    productCode: l.product_code,
    productNameSnapshot: l.product_name_snapshot,
    quantity: l.quantity,
    unitPrice: n(l.unit_price),
    taxRate: (rate === 0.08 ? 0.08 : 0.1) as TaxRate,
    amount: n(l.amount),
    orderType: l.order_type,
    fulfilledQuantity: l.fulfilled_quantity,
    note: l.note,
  };
}

export async function getSalesOrder(id: string): Promise<SalesOrderDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_order")
    .select(
      "id,order_no,customer_code,delivery_address_id,order_date,delivery_date,status,subtotal,tax_amount,total_amount,note,customer:customer_code(customer_code,name),staff:staff_id(id,name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const header = mapOrder(data as unknown as DbSalesOrder);

  const { data: lineRows, error: lineErr } = await supabase
    .from("sales_order_line")
    .select(
      "id,line_no,product_code,product_name_snapshot,quantity,unit_price,tax_rate,amount,order_type,fulfilled_quantity,note"
    )
    .eq("sales_order_id", id)
    .order("line_no");
  if (lineErr) throw lineErr;

  return {
    ...header,
    lines: (lineRows ?? []).map((l) => mapLine(l as unknown as DbSalesOrderLine)),
  };
}

export type CustomerSearchResult = {
  customerCode: string;
  name: string;
  nameKana: string | null;
  address: string | null;
  phone: string | null;
};

export async function searchCustomers(
  term: string,
  limit = 10
): Promise<CustomerSearchResult[]> {
  const supabase = await createClient();
  let q = supabase
    .from("customer")
    .select("customer_code,name,name_kana,address,phone")
    .eq("status", "active")
    .order("name")
    .limit(limit);
  const t = term.trim();
  if (t) {
    q = q.or(
      `name.ilike.%${t}%,name_kana.ilike.%${t}%,customer_code.ilike.%${t}%`
    );
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    customerCode: r.customer_code as string,
    name: r.name as string,
    nameKana: r.name_kana as string | null,
    address: r.address as string | null,
    phone: r.phone as string | null,
  }));
}

export async function listCustomerDeliveryAddresses(
  customerCode: string
): Promise<DeliveryAddressOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("delivery_address")
    .select("id,name,address,is_default")
    .eq("customer_code", customerCode)
    .order("is_default", { ascending: false })
    .order("name");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    address: r.address as string | null,
    isDefault: Boolean(r.is_default),
  }));
}

export async function searchProductsForOrder(
  term: string,
  limit = 20
): Promise<ProductSearchResult[]> {
  const supabase = await createClient();
  let q = supabase
    .from("product")
    .select(
      "product_code,name,jan_code,units_per_case,default_sales_unit_price,default_tax_rate,default_order_type,is_stocked,supplier_code"
    )
    .eq("status", "active")
    .order("name")
    .limit(limit);
  const t = term.trim();
  if (t) {
    q = q.or(`name.ilike.%${t}%,product_code.ilike.%${t}%,jan_code.ilike.%${t}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  const products = data ?? [];
  if (products.length === 0) return [];

  const codes = products.map((p) => p.product_code as string);
  const { data: stockRows, error: stockErr } = await supabase
    .from("product_stock")
    .select("product_code,quantity_on_hand,quantity_allocated")
    .in("product_code", codes);
  if (stockErr) throw stockErr;
  const stockMap = new Map<string, { onHand: number; allocated: number }>();
  for (const r of (stockRows ?? []) as {
    product_code: string;
    quantity_on_hand: number;
    quantity_allocated: number;
  }[]) {
    const cur = stockMap.get(r.product_code) ?? { onHand: 0, allocated: 0 };
    cur.onHand += r.quantity_on_hand;
    cur.allocated += r.quantity_allocated;
    stockMap.set(r.product_code, cur);
  }

  return products.map((p) => {
    const rate =
      typeof p.default_tax_rate === "string"
        ? Number(p.default_tax_rate)
        : (p.default_tax_rate as number);
    const stock = stockMap.get(p.product_code as string) ?? {
      onHand: 0,
      allocated: 0,
    };
    return {
      productCode: p.product_code as string,
      name: p.name as string,
      janCode: (p.jan_code as string | null) ?? null,
      unitsPerCase: p.units_per_case as number,
      defaultSalesUnitPrice:
        p.default_sales_unit_price === null
          ? null
          : Number(p.default_sales_unit_price),
      defaultTaxRate: (rate === 0.08 ? 0.08 : 0.1) as TaxRate,
      defaultOrderType: p.default_order_type as OrderType,
      isStocked: Boolean(p.is_stocked),
      totalOnHand: stock.onHand,
      totalAllocated: stock.allocated,
      supplierCode: (p.supplier_code as string | null) ?? null,
    };
  });
}

export type FifoLot = {
  productStockId: string;
  available: number;
  expiryDate: string | null;
  lotNo: string | null;
};

export async function findFifoLots(productCode: string): Promise<FifoLot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_stock")
    .select("id,quantity_on_hand,quantity_allocated,expiry_date,lot_no")
    .eq("product_code", productCode)
    .order("expiry_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return ((data ?? []) as {
    id: string;
    quantity_on_hand: number;
    quantity_allocated: number;
    expiry_date: string | null;
    lot_no: string | null;
  }[]).map((r) => ({
    productStockId: r.id,
    available: Math.max(0, r.quantity_on_hand - r.quantity_allocated),
    expiryDate: r.expiry_date,
    lotNo: r.lot_no,
  }));
}
