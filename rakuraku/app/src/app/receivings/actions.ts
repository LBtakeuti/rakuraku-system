"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { receivingFormSchema } from "@/lib/validations/receiving";

export type ReceivingActionResult =
  | { ok: true; purchaseOrderId: string }
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

function autoLotNo(receivedAt: string, seq: number): string {
  const date = receivedAt.replaceAll("-", "");
  return `${date}-${String(seq).padStart(3, "0")}`;
}

export async function confirmReceiving(
  _prev: ReceivingActionResult | null,
  formData: FormData
): Promise<ReceivingActionResult> {
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
  const parsed = receivingFormSchema.safeParse(parsedRaw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const v = parsed.data;

  const supabase = await createClient();

  // 既定倉庫を取得
  const { data: defaultWh, error: whErr } = await supabase
    .from("warehouse")
    .select("id")
    .eq("is_default", true)
    .maybeSingle();
  if (whErr || !defaultWh) {
    return {
      ok: false,
      fieldErrors: {},
      formError:
        whErr?.message ?? "既定の倉庫が見つかりません。倉庫マスターを確認してください。",
    };
  }
  const warehouseId = defaultWh.id as string;

  // 発注ヘッダを取得（仕入先確認用）
  const { data: po, error: poErr } = await supabase
    .from("purchase_order")
    .select("id,supplier_code,status")
    .eq("id", v.purchaseOrderId)
    .maybeSingle();
  if (poErr || !po) {
    return {
      ok: false,
      fieldErrors: {},
      formError: poErr?.message ?? "発注書が見つかりません",
    };
  }

  let autoLotSeq = 1;

  for (const line of v.lines) {
    if (line.quantity <= 0) continue;

    // 入荷先の在庫ロットを決める
    let stockId: string | null = null;
    if (line.isLotManaged) {
      // ロット番号 + 賞味期限で既存ロットを探す
      const lotNo = line.lotNo || autoLotNo(v.receivedAt, autoLotSeq++);
      const expiry = line.expiryDate || null;
      const { data: existing, error: exErr } = await supabase
        .from("product_stock")
        .select("id,quantity_on_hand")
        .eq("product_code", line.productCode)
        .eq("warehouse_id", warehouseId)
        .eq("lot_no", lotNo)
        .eq("expiry_date", expiry as string)
        .maybeSingle();
      if (exErr) {
        return { ok: false, fieldErrors: {}, formError: exErr.message };
      }
      if (existing) {
        stockId = existing.id as string;
        const { error: updErr } = await supabase
          .from("product_stock")
          .update({
            quantity_on_hand:
              (existing.quantity_on_hand as number) + line.quantity,
            received_at: v.receivedAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", stockId);
        if (updErr) {
          return { ok: false, fieldErrors: {}, formError: updErr.message };
        }
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
          return {
            ok: false,
            fieldErrors: {},
            formError: insErr?.message ?? "在庫ロットの作成に失敗しました",
          };
        }
        stockId = created.id as string;
      }
    } else {
      // ロット管理なし：商品×倉庫で1行
      const { data: existing, error: exErr } = await supabase
        .from("product_stock")
        .select("id,quantity_on_hand")
        .eq("product_code", line.productCode)
        .eq("warehouse_id", warehouseId)
        .is("lot_no", null)
        .is("expiry_date", null)
        .maybeSingle();
      if (exErr) {
        return { ok: false, fieldErrors: {}, formError: exErr.message };
      }
      if (existing) {
        stockId = existing.id as string;
        const { error: updErr } = await supabase
          .from("product_stock")
          .update({
            quantity_on_hand:
              (existing.quantity_on_hand as number) + line.quantity,
            received_at: v.receivedAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", stockId);
        if (updErr) {
          return { ok: false, fieldErrors: {}, formError: updErr.message };
        }
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
          return {
            ok: false,
            fieldErrors: {},
            formError: insErr?.message ?? "在庫の作成に失敗しました",
          };
        }
        stockId = created.id as string;
      }
    }

    // stock_movement に in タイプで記録
    const { error: mvErr } = await supabase.from("stock_movement").insert({
      product_stock_id: stockId,
      movement_type: "in",
      quantity: line.quantity,
      reference_type: "purchase_order",
      reference_id: v.purchaseOrderId,
      note: line.note || null,
    });
    if (mvErr) {
      return { ok: false, fieldErrors: {}, formError: mvErr.message };
    }

    // purchase_order_line の received_quantity を加算
    const { data: poLine, error: poLineErr } = await supabase
      .from("purchase_order_line")
      .select("received_quantity")
      .eq("id", line.purchaseOrderLineId)
      .single();
    if (poLineErr || !poLine) {
      return {
        ok: false,
        fieldErrors: {},
        formError: poLineErr?.message ?? "発注明細が見つかりません",
      };
    }
    const { error: poLineUpdErr } = await supabase
      .from("purchase_order_line")
      .update({
        received_quantity:
          (poLine.received_quantity as number) + line.quantity,
      })
      .eq("id", line.purchaseOrderLineId);
    if (poLineUpdErr) {
      return { ok: false, fieldErrors: {}, formError: poLineUpdErr.message };
    }
  }

  // 全明細の入荷状況を見て purchase_order.status を更新
  const { data: allLines, error: allErr } = await supabase
    .from("purchase_order_line")
    .select("quantity,received_quantity")
    .eq("purchase_order_id", v.purchaseOrderId);
  if (allErr) {
    return { ok: false, fieldErrors: {}, formError: allErr.message };
  }
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
  if (statusErr) {
    return { ok: false, fieldErrors: {}, formError: statusErr.message };
  }

  revalidatePath("/purchase-orders");
  revalidatePath("/stocks");
  revalidatePath("/receivings");
  redirect(`/purchase-orders/${v.purchaseOrderId}`);
}
