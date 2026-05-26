import { createClient } from "@/lib/supabase/server";

export async function nextCustomerCode(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_customer_code");
  if (error) throw new Error(`お客様コードの採番に失敗しました: ${error.message}`);
  return data as string;
}

export async function nextProductCode(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_product_code");
  if (error) throw new Error(`商品コードの採番に失敗しました: ${error.message}`);
  return data as string;
}

export async function nextSalesOrderNumber(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_order_number");
  if (error) throw new Error(`受注番号の採番に失敗しました: ${error.message}`);
  return data as string;
}

export async function nextPurchaseOrderNumber(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_purchase_order_number");
  if (error) throw new Error(`発注番号の採番に失敗しました: ${error.message}`);
  return data as string;
}

export async function nextSalesInvoiceNumber(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_delivery_number");
  if (error) throw new Error(`納品書番号の採番に失敗しました: ${error.message}`);
  return data as string;
}

export async function nextBillingNumber(yearMonth: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_billing_number", {
    year_month: yearMonth,
  });
  if (error) throw new Error(`請求書番号の採番に失敗しました: ${error.message}`);
  return data as string;
}
