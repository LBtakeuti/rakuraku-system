import { createClient } from "@/lib/supabase/server";

function pad(num: number, width: number) {
  return String(num).padStart(width, "0");
}

export async function nextCustomerCode(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer")
    .select("customer_code")
    .order("customer_code", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.customer_code;
  const lastNum = last && /^\d+$/.test(last) ? Number(last) : 0;
  return pad(lastNum + 1, 6);
}

export async function nextProductCode(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product")
    .select("product_code")
    .order("product_code", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.product_code;
  const lastNum = last && /^\d+$/.test(last) ? Number(last) : 0;
  return pad(lastNum + 1, 8);
}

const SALES_ORDER_PREFIX = "8";
const PURCHASE_ORDER_PREFIX = "P";
const SALES_INVOICE_PREFIX = "N";
const BILLING_PREFIX = "B";

export async function nextSalesOrderNumber(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_order")
    .select("order_number")
    .like("order_number", `${SALES_ORDER_PREFIX}%`)
    .order("order_number", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.order_number as string | undefined;
  const lastNum = last ? Number(last.slice(SALES_ORDER_PREFIX.length)) : 0;
  return `${SALES_ORDER_PREFIX}${pad(lastNum + 1, 8)}`;
}

export async function nextPurchaseOrderNumber(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_order")
    .select("po_number")
    .like("po_number", `${PURCHASE_ORDER_PREFIX}%`)
    .order("po_number", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.po_number as string | undefined;
  const lastNum = last ? Number(last.slice(PURCHASE_ORDER_PREFIX.length)) : 0;
  return `${PURCHASE_ORDER_PREFIX}${pad(lastNum + 1, 8)}`;
}

export async function nextSalesInvoiceNumber(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_invoice")
    .select("invoice_number")
    .like("invoice_number", `${SALES_INVOICE_PREFIX}%`)
    .order("invoice_number", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.invoice_number as string | undefined;
  const lastNum = last ? Number(last.slice(SALES_INVOICE_PREFIX.length)) : 0;
  return `${SALES_INVOICE_PREFIX}${pad(lastNum + 1, 8)}`;
}

export async function nextBillingNumber(yearMonth: string): Promise<string> {
  const supabase = await createClient();
  const prefix = `${BILLING_PREFIX}${yearMonth}`;
  const { data, error } = await supabase
    .from("billing_statement")
    .select("statement_number")
    .like("statement_number", `${prefix}%`)
    .order("statement_number", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.statement_number as string | undefined;
  const lastNum = last ? Number(last.slice(prefix.length)) : 0;
  return `${prefix}${pad(lastNum + 1, 3)}`;
}
