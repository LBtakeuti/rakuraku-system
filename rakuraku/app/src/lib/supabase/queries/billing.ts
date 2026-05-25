import { createClient } from "@/lib/supabase/server";
import type { BillingSummaryRow } from "@/types/billing";
import type {
  InvoiceFormat,
  InvoiceTaxType,
  TaxRounding,
} from "@/types/customer";
import { calculateTax } from "@/lib/utils/tax-calculation";
import { computePaymentDueDate } from "@/lib/utils/payment-due-date";

type DbCustomer = {
  customer_code: string;
  name: string;
  invoice_format: InvoiceFormat;
  closing_day: number;
  payment_cycle: string | null;
  invoice_tax_type: InvoiceTaxType;
  tax_rounding: TaxRounding;
};

type DbInvoice = {
  id: string;
  customer_code: string;
};

type DbInvoiceLine = {
  sales_invoice_id: string;
  quantity: number;
  unit_price: number | string;
  tax_rate: number | string;
  amount: number | string;
};

type DbBillingStatement = {
  customer_code: string;
  total_due: number | string;
};

type DbPayment = {
  customer_code: string;
  amount: number | string;
};

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "string" ? Number(v) : v;
}

/**
 * 集計：対象期間（periodFrom..periodTo）に納品日がある sales_invoice を
 * お客様ごとにまとめて、税計算ロジックに基づき今回請求額を算出する。
 *
 * - 締め日でお客様を絞り込む（closingDay 一致）
 * - billing_statement_id IS NULL の sales_invoice のみが対象
 * - 前回請求額 = 過去の billing_statement.total_due の最新 1 件（簡易実装）
 * - 入金額 = 期間内 payment.amount の合計
 * - 繰越額 = 前回請求 - 入金（負値は 0 にクランプ）
 */
export async function aggregateBillingForPeriod(
  closingDay: number,
  periodFrom: string,
  periodTo: string
): Promise<BillingSummaryRow[]> {
  const supabase = await createClient();

  // 1. 対象顧客（締め日一致 + active）
  const { data: customers, error: custErr } = await supabase
    .from("customer")
    .select(
      "customer_code,name,invoice_format,closing_day,payment_cycle,invoice_tax_type,tax_rounding"
    )
    .eq("status", "active")
    .eq("closing_day", closingDay);
  if (custErr) throw custErr;
  const customerList = (customers ?? []) as DbCustomer[];
  if (customerList.length === 0) return [];

  const customerCodes = customerList.map((c) => c.customer_code);

  // 2. 期間内・未請求 sales_invoice
  const { data: invoices, error: invErr } = await supabase
    .from("sales_invoice")
    .select("id,customer_code")
    .in("customer_code", customerCodes)
    .gte("invoice_date", periodFrom)
    .lte("invoice_date", periodTo)
    .is("billing_statement_id", null);
  if (invErr) throw invErr;
  const invoiceList = (invoices ?? []) as DbInvoice[];

  // 3. 明細を取得
  const invoiceIds = invoiceList.map((i) => i.id);
  const linesByInvoice = new Map<string, DbInvoiceLine[]>();
  if (invoiceIds.length > 0) {
    const { data: lines, error: lineErr } = await supabase
      .from("sales_invoice_line")
      .select("sales_invoice_id,quantity,unit_price,tax_rate,amount")
      .in("sales_invoice_id", invoiceIds);
    if (lineErr) throw lineErr;
    for (const l of (lines ?? []) as DbInvoiceLine[]) {
      const arr = linesByInvoice.get(l.sales_invoice_id) ?? [];
      arr.push(l);
      linesByInvoice.set(l.sales_invoice_id, arr);
    }
  }

  // 4. 前回請求 (最新 1 件) と 期間内入金 を取得
  const { data: prevStmts, error: prevErr } = await supabase
    .from("billing_statement")
    .select("customer_code,total_due,issue_date")
    .in("customer_code", customerCodes)
    .order("issue_date", { ascending: false });
  if (prevErr) throw prevErr;
  const prevByCustomer = new Map<string, number>();
  for (const s of (prevStmts ?? []) as (DbBillingStatement & { issue_date: string })[]) {
    if (!prevByCustomer.has(s.customer_code)) {
      prevByCustomer.set(s.customer_code, num(s.total_due));
    }
  }

  const { data: payments, error: payErr } = await supabase
    .from("payment")
    .select("customer_code,amount,received_date")
    .in("customer_code", customerCodes)
    .gte("received_date", periodFrom)
    .lte("received_date", periodTo);
  if (payErr) throw payErr;
  const paymentByCustomer = new Map<string, number>();
  for (const p of (payments ?? []) as (DbPayment & { received_date: string })[]) {
    paymentByCustomer.set(
      p.customer_code,
      (paymentByCustomer.get(p.customer_code) ?? 0) + num(p.amount)
    );
  }

  // 5. お客様ごとに集計
  const invoicesByCustomer = new Map<string, string[]>();
  for (const inv of invoiceList) {
    const arr = invoicesByCustomer.get(inv.customer_code) ?? [];
    arr.push(inv.id);
    invoicesByCustomer.set(inv.customer_code, arr);
  }

  const result: BillingSummaryRow[] = [];
  for (const c of customerList) {
    const invIds = invoicesByCustomer.get(c.customer_code) ?? [];
    if (invIds.length === 0) continue;

    // 伝票単位でまとめる
    const vouchers = invIds.map((id) => ({
      lines: (linesByInvoice.get(id) ?? []).map((l) => ({
        amount: num(l.amount),
        taxRate: num(l.tax_rate),
      })),
    }));

    const { subtotal, taxAmount } = calculateTax(
      vouchers,
      c.invoice_tax_type,
      c.tax_rounding
    );
    const currentTotal = subtotal + taxAmount;

    const previousBalance = prevByCustomer.get(c.customer_code) ?? 0;
    const paymentAmount = paymentByCustomer.get(c.customer_code) ?? 0;
    const carryOver = Math.max(0, previousBalance - paymentAmount);
    const totalDue = carryOver + currentTotal;

    result.push({
      customerCode: c.customer_code,
      customerName: c.name,
      invoiceFormat: c.invoice_format,
      closingDay: c.closing_day,
      paymentCycle: c.payment_cycle,
      invoiceTaxType: c.invoice_tax_type,
      taxRounding: c.tax_rounding,
      previousBalance,
      paymentAmount,
      carryOver,
      currentSubtotal: subtotal,
      currentTax: taxAmount,
      currentTotal,
      totalDue,
      invoiceIds: invIds,
      paymentDueDate: computePaymentDueDate(periodTo, c.payment_cycle),
    });
  }

  result.sort((a, b) => a.customerCode.localeCompare(b.customerCode));
  return result;
}
