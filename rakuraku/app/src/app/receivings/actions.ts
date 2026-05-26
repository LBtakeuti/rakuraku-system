"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { receivingFormSchema } from "@/lib/validations/receiving";

type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

export type ReceivingActionResult =
  | { success: true; purchaseOrderId: string }
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

function autoLotNo(receivedAt: string, seq: number): string {
  const date = receivedAt.replaceAll("-", "");
  return `${date}-${String(seq).padStart(3, "0")}`;
}

// 補償処理のためのオペレーション履歴
type Compensation =
  | { kind: "delete-stock"; id: string }
  | {
      kind: "restore-stock-quantity";
      id: string;
      previousQuantity: number;
      previousReceivedAt: string | null;
    }
  | { kind: "delete-movement"; id: string }
  | {
      kind: "restore-po-line-received";
      id: string;
      previousReceived: number;
    }
  | { kind: "restore-po-status"; id: string; previousStatus: string };

async function rollback(
  supabase: SupabaseLike,
  ops: Compensation[]
): Promise<void> {
  for (const op of ops.slice().reverse()) {
    try {
      switch (op.kind) {
        case "delete-stock":
          await supabase.from("product_stock").delete().eq("id", op.id);
          break;
        case "restore-stock-quantity":
          await supabase
            .from("product_stock")
            .update({
              quantity_on_hand: op.previousQuantity,
              received_at: op.previousReceivedAt,
            })
            .eq("id", op.id);
          break;
        case "delete-movement":
          await supabase.from("stock_movement").delete().eq("id", op.id);
          break;
        case "restore-po-line-received":
          await supabase
            .from("purchase_order_line")
            .update({ received_quantity: op.previousReceived })
            .eq("id", op.id);
          break;
        case "restore-po-status":
          await supabase
            .from("purchase_order")
            .update({ status: op.previousStatus })
            .eq("id", op.id);
          break;
      }
    } catch (rollbackErr) {
      console.error("[receivings] rollback step failed:", op, rollbackErr);
    }
  }
}

export async function confirmReceiving(
  _prev: ReceivingActionResult | null,
  formData: FormData
): Promise<ReceivingActionResult> {
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
  const parsed = receivingFormSchema.safeParse(parsedRaw);
  if (!parsed.success) {
    return { success: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const compensations: Compensation[] = [];

  try {
    const { data: defaultWh, error: whErr } = await supabase
      .from("warehouse")
      .select("id")
      .eq("is_default", true)
      .maybeSingle();
    if (whErr || !defaultWh) {
      throw new Error(
        whErr?.message ?? "既定の倉庫が見つかりません。倉庫マスターを確認してください。"
      );
    }
    const warehouseId = defaultWh.id as string;

    const { data: po, error: poErr } = await supabase
      .from("purchase_order")
      .select("id,status")
      .eq("id", v.purchaseOrderId)
      .maybeSingle();
    if (poErr || !po) {
      throw new Error(poErr?.message ?? "発注書が見つかりません");
    }
    const previousPoStatus = po.status as string;

    let autoLotSeq = 1;

    for (const line of v.lines) {
      if (line.quantity <= 0) continue;

      let stockId: string | null = null;
      if (line.isLotManaged) {
        const lotNo = line.lotNo || autoLotNo(v.receivedAt, autoLotSeq++);
        const expiry = line.expiryDate || null;
        const { data: existing, error: exErr } = await supabase
          .from("product_stock")
          .select("id,quantity_on_hand,received_at")
          .eq("product_code", line.productCode)
          .eq("warehouse_id", warehouseId)
          .eq("lot_no", lotNo)
          .eq("expiry_date", expiry as string)
          .maybeSingle();
        if (exErr) throw new Error(exErr.message);

        if (existing) {
          stockId = existing.id as string;
          const previousQty = existing.quantity_on_hand as number;
          const previousReceivedAt = existing.received_at as string | null;
          const { error: updErr } = await supabase
            .from("product_stock")
            .update({
              quantity_on_hand: previousQty + line.quantity,
              received_at: v.receivedAt,
              updated_at: new Date().toISOString(),
            })
            .eq("id", stockId);
          if (updErr) throw new Error(updErr.message);
          compensations.push({
            kind: "restore-stock-quantity",
            id: stockId,
            previousQuantity: previousQty,
            previousReceivedAt,
          });
        } else {
          const { data: created, error: insErr } = await supabase
            .from("product_stock")
            .insert({
              product_code: line.productCode,
              warehouse_id: warehouseId,
              lot_no: lotNo,
              expiry_date: expiry,
              quantity_on_hand: line.quantity,
              quantity_allocated: 0,
              received_at: v.receivedAt,
            })
            .select("id")
            .single();
          if (insErr || !created) {
            throw new Error(insErr?.message ?? "在庫ロットの作成に失敗しました");
          }
          stockId = created.id as string;
          compensations.push({ kind: "delete-stock", id: stockId });
        }
      } else {
        const { data: existing, error: exErr } = await supabase
          .from("product_stock")
          .select("id,quantity_on_hand,received_at")
          .eq("product_code", line.productCode)
          .eq("warehouse_id", warehouseId)
          .is("lot_no", null)
          .is("expiry_date", null)
          .maybeSingle();
        if (exErr) throw new Error(exErr.message);

        if (existing) {
          stockId = existing.id as string;
          const previousQty = existing.quantity_on_hand as number;
          const previousReceivedAt = existing.received_at as string | null;
          const { error: updErr } = await supabase
            .from("product_stock")
            .update({
              quantity_on_hand: previousQty + line.quantity,
              received_at: v.receivedAt,
              updated_at: new Date().toISOString(),
            })
            .eq("id", stockId);
          if (updErr) throw new Error(updErr.message);
          compensations.push({
            kind: "restore-stock-quantity",
            id: stockId,
            previousQuantity: previousQty,
            previousReceivedAt,
          });
        } else {
          const { data: created, error: insErr } = await supabase
            .from("product_stock")
            .insert({
              product_code: line.productCode,
              warehouse_id: warehouseId,
              lot_no: null,
              expiry_date: null,
              quantity_on_hand: line.quantity,
              quantity_allocated: 0,
              received_at: v.receivedAt,
            })
            .select("id")
            .single();
          if (insErr || !created) {
            throw new Error(insErr?.message ?? "在庫の作成に失敗しました");
          }
          stockId = created.id as string;
          compensations.push({ kind: "delete-stock", id: stockId });
        }
      }

      const { data: mv, error: mvErr } = await supabase
        .from("stock_movement")
        .insert({
          product_stock_id: stockId,
          movement_type: "in",
          quantity: line.quantity,
          reference_type: "purchase_order",
          reference_id: v.purchaseOrderId,
          note: line.note || null,
        })
        .select("id")
        .single();
      if (mvErr || !mv) {
        throw new Error(mvErr?.message ?? "在庫移動履歴の作成に失敗しました");
      }
      compensations.push({ kind: "delete-movement", id: mv.id as string });

      const { data: poLine, error: poLineErr } = await supabase
        .from("purchase_order_line")
        .select("received_quantity")
        .eq("id", line.purchaseOrderLineId)
        .single();
      if (poLineErr || !poLine) {
        throw new Error(poLineErr?.message ?? "発注明細が見つかりません");
      }
      const previousReceived = poLine.received_quantity as number;
      const { error: poLineUpdErr } = await supabase
        .from("purchase_order_line")
        .update({ received_quantity: previousReceived + line.quantity })
        .eq("id", line.purchaseOrderLineId);
      if (poLineUpdErr) throw new Error(poLineUpdErr.message);
      compensations.push({
        kind: "restore-po-line-received",
        id: line.purchaseOrderLineId,
        previousReceived,
      });
    }

    const { data: allLines, error: allErr } = await supabase
      .from("purchase_order_line")
      .select("quantity,received_quantity")
      .eq("purchase_order_id", v.purchaseOrderId);
    if (allErr) throw new Error(allErr.message);

    let allReceived = true;
    let anyReceived = false;
    for (const l of (allLines ?? []) as {
      quantity: number;
      received_quantity: number;
    }[]) {
      if (l.received_quantity >= l.quantity) {
        anyReceived = true;
      } else {
        allReceived = false;
        if (l.received_quantity > 0) anyReceived = true;
      }
    }
    const newStatus = allReceived
      ? "received"
      : anyReceived
        ? "partial"
        : "ordered";
    const { error: statusErr } = await supabase
      .from("purchase_order")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", v.purchaseOrderId);
    if (statusErr) throw new Error(statusErr.message);
    compensations.push({
      kind: "restore-po-status",
      id: v.purchaseOrderId,
      previousStatus: previousPoStatus,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "入荷処理に失敗しました";
    console.error("[receivings] failed, rolling back:", message, {
      compensations: compensations.length,
    });
    await rollback(supabase, compensations);
    return { success: false, fieldErrors: {}, formError: message };
  }

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${v.purchaseOrderId}`);
  revalidatePath("/stocks");
  revalidatePath("/receivings");
  redirect(`/purchase-orders/${v.purchaseOrderId}`);
}
