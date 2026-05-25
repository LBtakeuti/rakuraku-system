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
    .select("order_no")
    .like("order_no", `${SALES_ORDER_PREFIX}%`)
    .order("order_no", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.order_no as string | undefined;
  const lastNum = last ? Number(last.slice(SALES_ORDER_PREFIX.length)) : 0;
  return `${SALES_ORDER_PREFIX}${pad(lastNum + 1, 8)}`;
}

export async function nextPurchaseOrderNumber(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_order")
    .select("purchase_order_no")
    .like("purchase_order_no", `${PURCHASE_ORDER_PREFIX}%`)
    .order("purchase_order_no", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.purchase_order_no as string | undefined;
  const lastNum = last ? Number(last.slice(PURCHASE_ORDER_PREFIX.length)) : 0;
  return `${PURCHASE_ORDER_PREFIX}${pad(lastNum + 1, 8)}`;
}

export async function nextSalesInvoiceNumber(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_invoice")
    .select("invoice_no")
    .like("invoice_no", `${SALES_INVOICE_PREFIX}%`)
    .order("invoice_no", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.invoice_no as string | undefined;
  const lastNum = last ? Number(last.slice(SALES_INVOICE_PREFIX.length)) : 0;
  return `${SALES_INVOICE_PREFIX}${pad(lastNum + 1, 8)}`;
}

export async function nextBillingNumber(yearMonth: string): Promise<string> {
  const supabase = await createClient();
  const prefix = `${BILLING_PREFIX}${yearMonth}`;
  const { data, error } = await supabase
    .from("billing_statement")
    .select("statement_no")
    .like("statement_no", `${prefix}%`)
    .order("statement_no", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.statement_no as string | undefined;
  const lastNum = last ? Number(last.slice(prefix.length)) : 0;
  return `${prefix}${pad(lastNum + 1, 3)}`;
}
