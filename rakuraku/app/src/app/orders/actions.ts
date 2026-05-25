"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { salesOrderFormSchema } from "@/lib/validations/sales-order";
import {
  nextSalesOrderNumber,
  nextPurchaseOrderNumber,
} from "@/lib/utils/numbering";
import { findFifoLots } from "@/lib/supabase/queries/sales-order";

type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

export type SalesOrderActionResult =
  | { ok: true; orderId: string; orderNo: string }
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

function round(n: number) {
  return Math.round(n);
}

type Compensation =
  | { kind: "delete-sales-order"; id: string }
  | { kind: "delete-sales-order-line"; id: string }
  | { kind: "delete-allocation"; id: string }
  | {
      kind: "restore-stock-allocated";
      id: string;
      previousAllocated: number;
    }
  | { kind: "delete-movement"; id: string }
  | { kind: "delete-purchase-order"; id: string }
  | { kind: "delete-po-line"; id: string };

async function rollback(
  supabase: SupabaseLike,
  ops: Compensation[]
): Promise<void> {
  for (const op of ops.slice().reverse()) {
    try {
      switch (op.kind) {
        case "delete-sales-order":
          await supabase.from("sales_order").delete().eq("id", op.id);
          break;
        case "delete-sales-order-line":
          await supabase.from("sales_order_line").delete().eq("id", op.id);
          break;
        case "delete-allocation":
          await supabase
            .from("sales_order_line_allocation")
            .delete()
            .eq("id", op.id);
          break;
        case "restore-stock-allocated":
          await supabase
            .from("product_stock")
            .update({ quantity_allocated: op.previousAllocated })
            .eq("id", op.id);
          break;
        case "delete-movement":
          await supabase.from("stock_movement").delete().eq("id", op.id);
          break;
        case "delete-purchase-order":
          await supabase.from("purchase_order").delete().eq("id", op.id);
          break;
        case "delete-po-line":
          await supabase.from("purchase_order_line").delete().eq("id", op.id);
          break;
      }
    } catch (rollbackErr) {
      console.error("[orders] rollback step failed:", op, rollbackErr);
    }
  }
}

export async function createSalesOrder(
  _prev: SalesOrderActionResult | null,
  formData: FormData
): Promise<SalesOrderActionResult> {
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
  const parsed = salesOrderFormSchema.safeParse(parsedRaw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const compensations: Compensation[] = [];
  let salesOrderId = "";
  let orderNo = "";

  try {
    let subtotal = 0;
    let taxAmount = 0;
    const lineRecords = v.lines.map((line, idx) => {
      const lineSubtotal = round(line.unitPrice * line.quantity);
      const lineTax = round(lineSubtotal * line.taxRate);
      subtotal += lineSubtotal;
      taxAmount += lineTax;
      return {
        lineNo: idx + 1,
        productCode: line.productCode,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        amount: lineSubtotal,
        orderType: line.orderType,
      };
    });
    const totalAmount = subtotal + taxAmount;

    orderNo = await nextSalesOrderNumber();
    const { data: orderInserted, error: orderErr } = await supabase
      .from("sales_order")
      .insert({
        order_no: orderNo,
        customer_code: v.customerCode,
        delivery_address_id: v.deliveryAddressId || null,
        order_date: v.orderDate,
        delivery_date: v.deliveryDate,
        status: "pending",
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        note: v.note || null,
      })
      .select("id")
      .single();
    if (orderErr || !orderInserted) {
      throw new Error(orderErr?.message ?? "受注の作成に失敗しました");
    }
    salesOrderId = orderInserted.id as string;
    compensations.push({ kind: "delete-sales-order", id: salesOrderId });

    const insertedLines: { id: string; productCode: string; quantity: number }[] =
      [];
    for (const line of lineRecords) {
      const { data: lineRow, error: lineErr } = await supabase
        .from("sales_order_line")
        .insert({
          sales_order_id: salesOrderId,
          line_no: line.lineNo,
          product_code: line.productCode,
          product_name_snapshot: line.productName,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          tax_rate: line.taxRate,
          amount: line.amount,
          order_type: line.orderType,
        })
        .select("id")
        .single();
      if (lineErr || !lineRow) {
        throw new Error(lineErr?.message ?? "明細の作成に失敗しました");
      }
      const lineId = lineRow.id as string;
      compensations.push({ kind: "delete-sales-order-line", id: lineId });
      insertedLines.push({
        id: lineId,
        productCode: line.productCode,
        quantity: line.quantity,
      });
    }

    for (let i = 0; i < lineRecords.length; i++) {
      const line = lineRecords[i];
      if (line.orderType !== "stock") continue;
      const lineId = insertedLines[i].id;
      const lots = await findFifoLots(line.productCode);
      let remaining = line.quantity;
      for (const lot of lots) {
        if (remaining <= 0) break;
        if (lot.available <= 0) continue;
        const take = Math.min(remaining, lot.available);
        const { data: allocRow, error: allocErr } = await supabase
          .from("sales_order_line_allocation")
          .insert({
            sales_order_line_id: lineId,
            product_stock_id: lot.productStockId,
            quantity: take,
          })
          .select("id")
          .single();
        if (allocErr || !allocRow) {
          throw new Error(allocErr?.message ?? "引当の作成に失敗しました");
        }
        compensations.push({
          kind: "delete-allocation",
          id: allocRow.id as string,
        });
        const { data: currentStock, error: readErr } = await supabase
          .from("product_stock")
          .select("quantity_allocated")
          .eq("id", lot.productStockId)
          .single();
        if (readErr || !currentStock) {
          throw new Error(
            readErr?.message ?? "在庫情報を読み込めませんでした"
          );
        }
        const previousAllocated = currentStock.quantity_allocated as number;
        const { error: updateErr } = await supabase
          .from("product_stock")
          .update({
            quantity_allocated: previousAllocated + take,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lot.productStockId);
        if (updateErr) throw new Error(updateErr.message);
        compensations.push({
          kind: "restore-stock-allocated",
          id: lot.productStockId,
          previousAllocated,
        });
        const { data: mv, error: mvErr } = await supabase
          .from("stock_movement")
          .insert({
            product_stock_id: lot.productStockId,
            movement_type: "allocate",
            quantity: take,
            reference_type: "sales_order",
            reference_id: salesOrderId,
          })
          .select("id")
          .single();
        if (mvErr || !mv) {
          throw new Error(mvErr?.message ?? "在庫移動履歴の作成に失敗しました");
        }
        compensations.push({ kind: "delete-movement", id: mv.id as string });
        remaining -= take;
      }
      // remaining > 0 でも処理は止めない（オーバー引当許容、フロー1 仕様）
    }

    const autoOrderLines = lineRecords.filter(
      (l) => l.orderType === "order_at_sale"
    );
    if (autoOrderLines.length > 0) {
      const productCodes = Array.from(
        new Set(autoOrderLines.map((l) => l.productCode))
      );
      const { data: prodRows, error: prodErr } = await supabase
        .from("product")
        .select("product_code,supplier_code")
        .in("product_code", productCodes);
      if (prodErr) throw new Error(prodErr.message);
      const supplierByProduct = new Map<string, string | null>();
      for (const p of (prodRows ?? []) as {
        product_code: string;
        supplier_code: string | null;
      }[]) {
        supplierByProduct.set(p.product_code, p.supplier_code);
      }

      const grouped = new Map<string, typeof autoOrderLines>();
      for (const l of autoOrderLines) {
        const sup = supplierByProduct.get(l.productCode) ?? "__no_supplier__";
        const key = sup ?? "__no_supplier__";
        const list = grouped.get(key) ?? [];
        list.push(l);
        grouped.set(key, list);
      }

      for (const [supplierKey, lines] of grouped.entries()) {
        if (supplierKey === "__no_supplier__") continue;
        const poNo = await nextPurchaseOrderNumber();
        let poSubtotal = 0;
        let poTax = 0;
        for (const l of lines) {
          const sub = round(l.unitPrice * l.quantity);
          poSubtotal += sub;
          poTax += round(sub * l.taxRate);
        }
        const { data: poRow, error: poErr } = await supabase
          .from("purchase_order")
          .insert({
            purchase_order_no: poNo,
            supplier_code: supplierKey,
            order_date: v.orderDate,
            status: "ordered",
            subtotal: poSubtotal,
            tax_amount: poTax,
            total_amount: poSubtotal + poTax,
            source_sales_order_id: salesOrderId,
          })
          .select("id")
          .single();
        if (poErr || !poRow) {
          throw new Error(poErr?.message ?? "発注書の作成に失敗しました");
        }
        const poId = poRow.id as string;
        compensations.push({ kind: "delete-purchase-order", id: poId });
        let lineNo = 0;
        for (const l of lines) {
          lineNo += 1;
          const sub = round(l.unitPrice * l.quantity);
          const { data: poLineRow, error: poLineErr } = await supabase
            .from("purchase_order_line")
            .insert({
              purchase_order_id: poId,
              line_no: lineNo,
              product_code: l.productCode,
              product_name_snapshot: l.productName,
              quantity: l.quantity,
              unit_price: l.unitPrice,
              tax_rate: l.taxRate,
              amount: sub,
            })
            .select("id")
            .single();
          if (poLineErr || !poLineRow) {
            throw new Error(poLineErr?.message ?? "発注明細の作成に失敗しました");
          }
          compensations.push({
            kind: "delete-po-line",
            id: poLineRow.id as string,
          });
        }
      }
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "受注処理に失敗しました";
    console.error("[orders] failed, rolling back:", message, {
      compensations: compensations.length,
    });
    await rollback(supabase, compensations);
    return { ok: false, fieldErrors: {}, formError: message };
  }

  revalidatePath("/orders");
  revalidatePath("/purchase-orders");
  redirect(`/orders/${salesOrderId}`);
}
