"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { billingIssueSchema } from "@/lib/validations/billing";
import { nextBillingNumber } from "@/lib/utils/numbering";
import { aggregateBillingForPeriod } from "@/lib/supabase/queries/billing";
import { computePaymentDueDate } from "@/lib/utils/payment-due-date";

type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

export type BillingActionResult =
  | {
      success: true;
      issuedCount: number;
      failedCount: number;
      statementIds: string[];
    }
  | {
      success: false;
      fieldErrors: Record<string, string[] | undefined>;
      formError?: string;
    };

function toFieldErrors(
  errors: readonly { path: readonly PropertyKey[]; message: string }[]
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const e of errors) {
    const key = e.path[0] === undefined ? "" : String(e.path[0]);
    if (!key) continue;
    (out[key] ??= []).push(e.message);
  }
  return out;
}

type Compensation =
  | { kind: "delete-statement"; id: string }
  | { kind: "delete-statement-line"; id: string }
  | {
      kind: "restore-invoice";
      id: string;
      previousBillingStatementId: string | null;
      previousBillingStatus: string;
    };

async function rollback(supabase: SupabaseLike, ops: Compensation[]) {
  for (const op of ops.slice().reverse()) {
    try {
      switch (op.kind) {
        case "delete-statement":
          await supabase.from("billing_statement").delete().eq("id", op.id);
          break;
        case "delete-statement-line":
          await supabase
            .from("billing_statement_line")
            .delete()
            .eq("id", op.id);
          break;
        case "restore-invoice":
          await supabase
            .from("sales_invoice")
            .update({
              billing_statement_id: op.previousBillingStatementId,
              billing_status: op.previousBillingStatus,
            })
            .eq("id", op.id);
          break;
      }
    } catch (rollbackErr) {
      console.error("[billing] rollback step failed:", op, rollbackErr);
    }
  }
}

async function issueOneCustomer(
  supabase: SupabaseLike,
  customer: {
    customer_code: string;
    invoice_ids: string[];
    previous_balance: number;
    current_total: number;
    total_due: number;
    payment_cycle: string | null;
  },
  periodFrom: string,
  periodTo: string,
  issueDate: string,
  compensations: Compensation[]
): Promise<string> {
  // 1. billing_statement INSERT
  const yearMonth = periodTo.replace(/-/g, "").slice(0, 6);
  const statementNo = await nextBillingNumber(yearMonth);
  const dueDate = computePaymentDueDate(periodTo, customer.payment_cycle);

  const { data: stmt, error: stmtErr } = await supabase
    .from("billing_statement")
    .insert({
      statement_no: statementNo,
      customer_code: customer.customer_code,
      period_from: periodFrom,
      period_to: periodTo,
      issue_date: issueDate,
      due_date: dueDate,
      previous_balance: customer.previous_balance,
      current_amount: customer.current_total,
      total_due: customer.total_due,
      status: "unpaid",
    })
    .select("id")
    .single();
  if (stmtErr || !stmt) {
    throw new Error(stmtErr?.message ?? "請求書の作成に失敗しました");
  }
  const statementId = stmt.id as string;
  compensations.push({ kind: "delete-statement", id: statementId });

  // 2. billing_statement_line INSERT × invoices
  let lineNo = 0;
  for (const invoiceId of customer.invoice_ids) {
    lineNo += 1;
    const { data: line, error: lineErr } = await supabase
      .from("billing_statement_line")
      .insert({
        billing_statement_id: statementId,
        sales_invoice_id: invoiceId,
        line_no: lineNo,
      })
      .select("id")
      .single();
    if (lineErr || !line) {
      throw new Error(lineErr?.message ?? "請求明細の作成に失敗しました");
    }
    compensations.push({
      kind: "delete-statement-line",
      id: line.id as string,
    });
  }

  // 3. sales_invoice の billing_statement_id と billing_status を更新
  for (const invoiceId of customer.invoice_ids) {
    const { data: prev, error: prevErr } = await supabase
      .from("sales_invoice")
      .select("billing_statement_id,billing_status")
      .eq("id", invoiceId)
      .single();
    if (prevErr || !prev) {
      throw new Error(prevErr?.message ?? "納品書情報を読み込めませんでした");
    }
    const { error: updErr } = await supabase
      .from("sales_invoice")
      .update({
        billing_statement_id: statementId,
        billing_status: "billed",
      })
      .eq("id", invoiceId);
    if (updErr) throw new Error(updErr.message);
    compensations.push({
      kind: "restore-invoice",
      id: invoiceId,
      previousBillingStatementId:
        (prev.billing_statement_id as string | null) ?? null,
      previousBillingStatus: prev.billing_status as string,
    });
  }

  return statementId;
}

export async function issueBillingStatements(
  _prev: BillingActionResult | null,
  formData: FormData
): Promise<BillingActionResult> {
  const payloadJson = formData.get("payload");
  if (typeof payloadJson !== "string") {
    return { success: false, fieldErrors: {}, formError: "送信データが壊れています" };
  }
  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(payloadJson);
  } catch {
    return { success: false, fieldErrors: {}, formError: "送信データの形式が不正です" };
  }
  const parsed = billingIssueSchema.safeParse(parsedRaw);
  if (!parsed.success) {
    return { success: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const v = parsed.data;

  const supabase = await createClient();

  // 集計を再実行（クライアントから受け取った金額を鵜呑みにせず、サーバー側で再計算）
  const summary = await aggregateBillingForPeriod(
    v.closingDay,
    v.periodFrom,
    v.periodTo
  );
  const summaryByCustomer = new Map<string, (typeof summary)[number]>();
  for (const s of summary) {
    summaryByCustomer.set(s.customerCode, s);
  }

  const todayIso = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const statementIds: string[] = [];
  let failedCount = 0;

  for (const customerCode of v.customerCodes) {
    const target = summaryByCustomer.get(customerCode);
    if (!target) {
      failedCount += 1;
      console.error("[billing] customer not found in aggregate:", customerCode);
      continue;
    }
    const compensations: Compensation[] = [];
    try {
      const id = await issueOneCustomer(
        supabase,
        {
          customer_code: target.customerCode,
          invoice_ids: target.invoiceIds,
          previous_balance: target.previousBalance,
          current_total: target.currentTotal,
          total_due: target.totalDue,
          payment_cycle: target.paymentCycle,
        },
        v.periodFrom,
        v.periodTo,
        todayIso,
        compensations
      );
      statementIds.push(id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "請求書発行に失敗しました";
      console.error(
        "[billing] customer failed, rolling back:",
        customerCode,
        message,
        { compensations: compensations.length }
      );
      await rollback(supabase, compensations);
      failedCount += 1;
    }
  }

  if (statementIds.length === 0 && failedCount === 0) {
    return {
      success: false,
      fieldErrors: {},
      formError: "発行対象がありませんでした",
    };
  }

  revalidatePath("/billing");
  revalidatePath("/sales");
  redirect(`/billing?issued=${statementIds.length}&failed=${failedCount}`);
}
