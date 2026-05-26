import { escapeSearchTerm } from "@/lib/utils/escape-search";
import { createClient } from "@/lib/supabase/server";
import type {
  SalesInvoiceRow,
  SalesInvoiceDetail,
  SalesInvoiceLine,
  SalesSummary,
  BillingStatus,
} from "@/types/sales-invoice";
import type { TaxRate } from "@/types/product";

type DbInvoice = {
  id: string;
  invoice_no: string;
  customer_code: string;
  invoice_date: string;
  source_order_no: string | null;
  subtotal: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  billing_status: BillingStatus;
  customer?: { customer_code: string; name: string } | null;
  staff?: { id: string; name: string } | null;
};

type DbInvoiceLine = {
  id: string;
  line_no: number;
  product_code: string;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number | string;
  tax_rate: number | string;
  amount: number | string;
};

function n(v: number | string | null): number {
  if (v === null) return 0;
  return typeof v === "string" ? Number(v) : v;
}

function mapRow(r: DbInvoice, lineCount: number): SalesInvoiceRow {
  return {
    id: r.id,
    invoiceNo: r.invoice_no,
    customerCode: r.customer_code,
    customerName: r.customer?.name ?? r.customer_code,
    invoiceDate: r.invoice_date,
    sourceOrderNo: r.source_order_no,
    subtotal: n(r.subtotal),
    taxAmount: n(r.tax_amount),
    totalAmount: n(r.total_amount),
    billingStatus: r.billing_status,
    staffName: r.staff?.name ?? null,
    lineCount,
  };
}

function mapLine(l: DbInvoiceLine): SalesInvoiceLine {
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
  };
}

export type SalesInvoiceListFilter = {
  query?: string;
  period?: "today" | "this_month" | "last_month" | "this_year" | "all";
  page?: number;
  pageSize?: number;
};

function periodRange(period: SalesInvoiceListFilter["period"]): {
  from: string;
  to: string;
  label: string;
} | null {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (period === "today") {
    const d = new Date(year, month, day);
    return { from: fmt(d), to: fmt(d), label: "今日" };
  }
  if (period === "this_month" || !period || period === "all") {
    if (period === "all") {
      const d = new Date(1970, 0, 1);
      return { from: fmt(d), to: fmt(new Date(year + 100, 0, 1)), label: "全期間" };
    }
    return {
      from: fmt(new Date(year, month, 1)),
      to: fmt(new Date(year, month + 1, 0)),
      label: `${year}年${month + 1}月`,
    };
  }
  if (period === "last_month") {
    return {
      from: fmt(new Date(year, month - 1, 1)),
      to: fmt(new Date(year, month, 0)),
      label: `${month === 0 ? year - 1 : year}年${month === 0 ? 12 : month}月`,
    };
  }
  if (period === "this_year") {
    return {
      from: fmt(new Date(year, 0, 1)),
      to: fmt(new Date(year, 11, 31)),
      label: `${year}年`,
    };
  }
  return null;
}

export async function listSalesInvoices(
  filter: SalesInvoiceListFilter = {}
): Promise<{ rows: SalesInvoiceRow[]; total: number; periodLabel: string }> {
  const supabase = await createClient();
  const pageSize = filter.pageSize ?? 20;
  const page = Math.max(1, filter.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const range = periodRange(filter.period ?? "this_month");

  let q = supabase
    .from("sales_invoice")
    .select(
      "id,invoice_no,customer_code,invoice_date,source_order_no,subtotal,tax_amount,total_amount,billing_status,customer:customer_code(customer_code,name),staff:staff_id(id,name)",
      { count: "exact" }
    )
    .order("invoice_no", { ascending: false });

  if (range) {
    q = q.gte("invoice_date", range.from).lte("invoice_date", range.to);
  }
  if (filter.query) {
    const term = filter.query.trim();
    if (term) {
      q = q.or(
        `invoice_no.ilike.%${escapeSearchTerm(term)}%,customer_code.ilike.%${escapeSearchTerm(term)}%,source_order_no.ilike.%${escapeSearchTerm(term)}%`
      );
    }
  }

  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  const invoices = (data ?? []) as unknown as DbInvoice[];

  const ids = invoices.map((i) => i.id);
  const lineCountMap = new Map<string, number>();
  if (ids.length > 0) {
    const { data: lineRows, error: lineErr } = await supabase
      .from("sales_invoice_line")
      .select("sales_invoice_id")
      .in("sales_invoice_id", ids);
    if (lineErr) throw lineErr;
    for (const r of (lineRows ?? []) as { sales_invoice_id: string }[]) {
      lineCountMap.set(
        r.sales_invoice_id,
        (lineCountMap.get(r.sales_invoice_id) ?? 0) + 1
      );
    }
  }

  return {
    rows: invoices.map((r) => mapRow(r, lineCountMap.get(r.id) ?? 0)),
    total: count ?? 0,
    periodLabel: range?.label ?? "",
  };
}

export async function getSalesInvoice(id: string): Promise<SalesInvoiceDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_invoice")
    .select(
      "id,invoice_no,customer_code,invoice_date,source_order_no,subtotal,tax_amount,total_amount,billing_status,customer:customer_code(customer_code,name),staff:staff_id(id,name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const inv = data as unknown as DbInvoice;

  const { data: lineRows, error: lineErr } = await supabase
    .from("sales_invoice_line")
    .select(
      "id,line_no,product_code,product_name_snapshot,quantity,unit_price,tax_rate,amount"
    )
    .eq("sales_invoice_id", id)
    .order("line_no");
  if (lineErr) throw lineErr;
  const lines = ((lineRows ?? []) as unknown as DbInvoiceLine[]).map(mapLine);

  return {
    ...mapRow(inv, lines.length),
    lines,
  };
}

export async function getSalesSummary(
  period: SalesInvoiceListFilter["period"] = "this_month"
): Promise<SalesSummary> {
  const supabase = await createClient();
  const range = periodRange(period);
  let q = supabase
    .from("sales_invoice")
    .select("total_amount,customer_code");
  if (range) {
    q = q.gte("invoice_date", range.from).lte("invoice_date", range.to);
  }
  const { data, error } = await q;
  if (error) throw error;

  let totalAmount = 0;
  const customerSet = new Set<string>();
  const rows = (data ?? []) as { total_amount: number | string; customer_code: string }[];
  for (const r of rows) {
    totalAmount +=
      typeof r.total_amount === "string"
        ? Number(r.total_amount)
        : r.total_amount;
    customerSet.add(r.customer_code);
  }
  return {
    totalAmount,
    invoiceCount: rows.length,
    customerCount: customerSet.size,
    periodLabel: range?.label ?? "",
  };
}
