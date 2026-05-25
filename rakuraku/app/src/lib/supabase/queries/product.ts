import { createClient } from "@/lib/supabase/server";
import type { ProductRow, OrderType, TaxRate } from "@/types/product";

type DbProduct = {
  product_code: string;
  name: string;
  jan_code: string | null;
  units_per_case: number;
  default_sales_unit_price: number | string | null;
  default_purchase_unit_price: number | string | null;
  default_tax_rate: number | string;
  default_order_type: OrderType;
  is_stocked: boolean;
  is_lot_managed: boolean;
  safety_stock: number;
  status: "active" | "discontinued";
};

function toNumberOrNull(v: number | string | null): number | null {
  if (v === null) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

function mapRow(r: DbProduct, stock: number | null): ProductRow {
  const rate = typeof r.default_tax_rate === "string"
    ? Number(r.default_tax_rate)
    : r.default_tax_rate;
  return {
    productCode: r.product_code,
    name: r.name,
    janCode: r.jan_code,
    unitsPerCase: r.units_per_case,
    defaultSalesUnitPrice: toNumberOrNull(r.default_sales_unit_price),
    defaultPurchaseUnitPrice: toNumberOrNull(r.default_purchase_unit_price),
    defaultTaxRate: (rate === 0.08 ? 0.08 : 0.1) as TaxRate,
    defaultOrderType: r.default_order_type,
    isStocked: r.is_stocked,
    isLotManaged: r.is_lot_managed,
    safetyStock: r.safety_stock,
    status: r.status,
    totalStock: stock,
  };
}

export type ProductListFilter = {
  query?: string;
  filter?: "all" | "stocked" | "order_at_sale" | "no_price";
  page?: number;
  pageSize?: number;
};

export async function listProducts(
  f: ProductListFilter = {}
): Promise<{ rows: ProductRow[]; total: number }> {
  const supabase = await createClient();
  const pageSize = f.pageSize ?? 20;
  const page = Math.max(1, f.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("product")
    .select(
      "product_code,name,jan_code,units_per_case,default_sales_unit_price,default_purchase_unit_price,default_tax_rate,default_order_type,is_stocked,is_lot_managed,safety_stock,status",
      { count: "exact" }
    )
    .order("product_code", { ascending: true });

  if (f.query) {
    const term = f.query.trim();
    if (term) {
      q = q.or(
        `name.ilike.%${term}%,product_code.ilike.%${term}%,jan_code.ilike.%${term}%`
      );
    }
  }
  if (f.filter === "stocked") q = q.eq("is_stocked", true);
  if (f.filter === "order_at_sale") q = q.eq("default_order_type", "order_at_sale");
  if (f.filter === "no_price") q = q.is("default_sales_unit_price", null);

  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  const products = (data ?? []) as DbProduct[];

  const codes = products.map((p) => p.product_code);
  const stockMap = new Map<string, number>();
  if (codes.length > 0) {
    const { data: stockRows, error: stockErr } = await supabase
      .from("product_stock")
      .select("product_code,quantity_on_hand")
      .in("product_code", codes);
    if (stockErr) throw stockErr;
    for (const r of (stockRows ?? []) as { product_code: string; quantity_on_hand: number }[]) {
      stockMap.set(r.product_code, (stockMap.get(r.product_code) ?? 0) + r.quantity_on_hand);
    }
  }

  return {
    rows: products.map((r) => mapRow(r, r.is_stocked ? stockMap.get(r.product_code) ?? 0 : null)),
    total: count ?? 0,
  };
}

export async function getProduct(code: string): Promise<ProductRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product")
    .select(
      "product_code,name,jan_code,units_per_case,default_sales_unit_price,default_purchase_unit_price,default_tax_rate,default_order_type,is_stocked,is_lot_managed,safety_stock,status"
    )
    .eq("product_code", code)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const p = data as DbProduct;

  let total: number | null = null;
  if (p.is_stocked) {
    const { data: s, error: sErr } = await supabase
      .from("product_stock")
      .select("quantity_on_hand")
      .eq("product_code", p.product_code);
    if (sErr) throw sErr;
    total = ((s ?? []) as { quantity_on_hand: number }[]).reduce(
      (a, r) => a + r.quantity_on_hand,
      0
    );
  }
  return mapRow(p, total);
}
