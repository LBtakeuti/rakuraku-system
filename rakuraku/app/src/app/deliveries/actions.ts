"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deliveryConfirmSchema } from "@/lib/validations/delivery";
import { nextSalesInvoiceNumber } from "@/lib/utils/numbering";

type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

export type DeliveryActionResult =
  | { ok: true; invoiceCount: number; invoiceIds: string[] }
  | {
      ok: false;
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
  | { kind: "delete-invoice"; id: string }
  | { kind: "delete-invoice-line"; id: string }
  | {
      kind: "restore-stock";
      id: string;
      previousOnHand: number;
      previousAllocated: number;
    }
  | { kind: "delete-movement"; id: string }
  | { kind: "restore-order-status"; id: string; previousStatus: string };

async function rollback(supabase: SupabaseLike, ops: Compensation[]) {
  for (const op of ops.slice().reverse()) {
    try {
      switch (op.kind) {
        case "delete-invoice":
          await supabase.from("sales_invoice").delete().eq("id", op.id);
          break;
        case "delete-invoice-line":
          await supabase.from("sales_invoice_line").delete().eq("id", op.id);
          break;
        case "restore-stock":
          await supabase
            .from("product_stock")
            .update({
              quantity_on_hand: op.previousOnHand,
              quantity_allocated: op.previousAllocated,
            })
            .eq("id", op.id);
          break;
        case "delete-movement":
          await supabase.from("stock_movement").delete().eq("id", op.id);
          break;
        case "restore-order-status":
          await supabase
            .from("sales_order")
            .update({ status: op.previousStatus })
            .eq("id", op.id);
          break;
      }
    } catch (rollbackErr) {
      console.error("[deliveries] rollback step failed:", op, rollbackErr);
    }
  }
}

type DbLine = {
  id: string;
  line_no: number;
  product_code: string;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number | string;
  tax_rate: number | string;
  amount: number | string;
  fulfilled_quantity: number;
  order_type: string;
};

type DbAlloc = {
  id: string;
  sales_order_line_id: string;
  product_stock_id: string;
  quantity: number;
};

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "string" ? Number(v) : v;
}

async function confirmOneOrder(
  supabase: SupabaseLike,
  orderId: string,
  deliveryDate: string,
  compensations: Compensation[]
): Promise<string> {
  // 受注ヘッダ取得
  const { data: order, error: orderErr } = await supabase
    .from("sales_order")
    .select("id,order_no,customer_code,delivery_address_id,status,staff_id")
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr || !order) {
    throw new Error(orderErr?.message ?? "受注が見つかりません");
  }
  const previousOrderStatus = order.status as string;

  // 明細取得
  const { data: lines, error: linesErr } = await supabase
    .from("sales_order_line")
    .select(
      "id,line_no,product_code,product_name_snapshot,quantity,unit_price,tax_rate,amount,fulfilled_quantity,order_type"
    )
    .eq("sales_order_id", orderId)
    .order("line_no");
  if (linesErr) throw new Error(linesErr.message);
  const orderLines = (lines ?? []) as DbLine[];
  if (orderLines.length === 0) {
    throw new Error(`受注 ${order.order_no} に明細がありません`);
  }

  // 集計
  let subtotal = 0;
  let taxAmount = 0;
  for (const l of orderLines) {
    const lineSubtotal = num(l.amount);
    subtotal += lineSubtotal;
    const rate = num(l.tax_rate);
    taxAmount += Math.round(lineSubtotal * rate);
  }
  const totalAmount = subtotal + taxAmount;

  // 1. 納品書ヘッダ INSERT
  const invoiceNo = await nextSalesInvoiceNumber();
  const { data: inv, error: invErr } = await supabase
    .from("sales_invoice")
    .insert({
      invoice_no: invoiceNo,
      customer_code: order.customer_code,
      delivery_address_id: order.delivery_address_id,
      invoice_date: deliveryDate,
      source_order_no: order.order_no,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      billing_status: "unbilled",
      staff_id: order.staff_id,
    })
    .select("id")
    .single();
  if (invErr || !inv) {
    throw new Error(invErr?.message ?? "納品書の作成に失敗しました");
  }
  const invoiceId = inv.id as string;
  compensations.push({ kind: "delete-invoice", id: invoiceId });

  // 2. 明細を複製
  for (const l of orderLines) {
    const { data: invLine, error: invLineErr } = await supabase
      .from("sales_invoice_line")
      .insert({
        sales_invoice_id: invoiceId,
        line_no: l.line_no,
        product_code: l.product_code,
        product_name_snapshot: l.product_name_snapshot,
        quantity: l.quantity,
        unit_price: num(l.unit_price),
        tax_rate: num(l.tax_rate),
        amount: num(l.amount),
        source_sales_order_line_id: l.id,
      })
      .select("id")
      .single();
    if (invLineErr || !invLine) {
      throw new Error(invLineErr?.message ?? "納品明細の作成に失敗しました");
    }
    compensations.push({
      kind: "delete-invoice-line",
      id: invLine.id as string,
    });
  }

  // 3. 在庫を実減（引当ロット分のみ）
  const lineIds = orderLines.map((l) => l.id);
  const { data: allocs, error: allocErr } = await supabase
    .from("sales_order_line_allocation")
    .select("id,sales_order_line_id,product_stock_id,quantity")
    .in("sales_order_line_id", lineIds);
  if (allocErr) throw new Error(allocErr.message);
  const allocations = (allocs ?? []) as DbAlloc[];

  for (const alloc of allocations) {
    const { data: stock, error: stockErr } = await supabase
      .from("product_stock")
      .select("id,quantity_on_hand,quantity_allocated")
      .eq("id", alloc.product_stock_id)
      .single();
    if (stockErr || !stock) {
      throw new Error(stockErr?.message ?? "在庫情報を読み込めませんでした");
    }
    const onHand = stock.quantity_on_hand as number;
    const allocated = stock.quantity_allocated as number;
    if (onHand < alloc.quantity) {
      throw new Error(
        `在庫不足のため納品確定できません（product_stock=${alloc.product_stock_id}、必要=${alloc.quantity}、在庫=${onHand}）`
      );
    }
    const { error: updErr } = await supabase
      .from("product_stock")
      .update({
        quantity_on_hand: onHand - alloc.quantity,
        quantity_allocated: Math.max(0, allocated - alloc.quantity),
        updated_at: new Date().toISOString(),
      })
      .eq("id", alloc.product_stock_id);
    if (updErr) throw new Error(updErr.message);
    compensations.push({
      kind: "restore-stock",
      id: alloc.product_stock_id,
      previousOnHand: onHand,
      previousAllocated: allocated,
    });

    // stock_movement に out + deallocate の 2 レコード
    const { data: mvOut, error: mvOutErr } = await supabase
      .from("stock_movement")
      .insert({
        product_stock_id: alloc.product_stock_id,
        movement_type: "out",
        quantity: alloc.quantity,
        reference_type: "sales_invoice",
        reference_id: invoiceId,
      })
      .select("id")
      .single();
    if (mvOutErr || !mvOut) {
      throw new Error(mvOutErr?.message ?? "在庫移動(out)の記録に失敗しました");
    }
    compensations.push({ kind: "delete-movement", id: mvOut.id as string });

    const { data: mvDe, error: mvDeErr } = await supabase
      .from("stock_movement")
      .insert({
        product_stock_id: alloc.product_stock_id,
        movement_type: "deallocate",
        quantity: alloc.quantity,
        reference_type: "sales_invoice",
        reference_id: invoiceId,
      })
      .select("id")
      .single();
    if (mvDeErr || !mvDe) {
      throw new Error(mvDeErr?.message ?? "在庫移動(deallocate)の記録に失敗しました");
    }
    compensations.push({ kind: "delete-movement", id: mvDe.id as string });
  }

  // 4. 受注明細の fulfilled_quantity を更新（受注単位の一括納品なので全数を fulfilled）
  for (const l of orderLines) {
    const { error: lineErr } = await supabase
      .from("sales_order_line")
      .update({ fulfilled_quantity: l.quantity })
      .eq("id", l.id);
    if (lineErr) throw new Error(lineErr.message);
  }

  // 受注のステータスを fulfilled に
  const { error: statusErr } = await supabase
    .from("sales_order")
    .update({ status: "fulfilled", updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (statusErr) throw new Error(statusErr.message);
  compensations.push({
    kind: "restore-order-status",
    id: orderId,
    previousStatus: previousOrderStatus,
  });

  return invoiceId;
}

export async function confirmDelivery(
  _prev: DeliveryActionResult | null,
  formData: FormData
): Promise<DeliveryActionResult> {
  const payloadJson = formData.get("payload");
  if (typeof payloadJson !== "string") {
    return { ok: false, fieldErrors: {}, formError: "送信データが壊れています" };
  }
  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(payloadJson);
  } catch {
    return { ok: false, fieldErrors: {}, formError: "送信データの形式が不正です" };
  }
  const parsed = deliveryConfirmSchema.safeParse(parsedRaw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const compensations: Compensation[] = [];
  const invoiceIds: string[] = [];

  try {
    for (const orderId of v.orderIds) {
      const id = await confirmOneOrder(
        supabase,
        orderId,
        v.deliveryDate,
        compensations
      );
      invoiceIds.push(id);
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "納品処理に失敗しました";
    console.error("[deliveries] failed, rolling back:", message, {
      compensations: compensations.length,
    });
    await rollback(supabase, compensations);
    return { ok: false, fieldErrors: {}, formError: message };
  }

  revalidatePath("/orders");
  revalidatePath("/deliveries");
  revalidatePath("/sales");
  revalidatePath("/stocks");
  redirect("/sales");
}
