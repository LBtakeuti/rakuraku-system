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

  const orderNo = await nextSalesOrderNumber();
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
    return {
      ok: false,
      fieldErrors: {},
      formError: orderErr?.message ?? "受注の作成に失敗しました",
    };
  }
  const salesOrderId = orderInserted.id as string;

  const insertedLines: { id: string; productCode: string; quantity: number }[] = [];
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
      return {
        ok: false,
        fieldErrors: {},
        formError: lineErr?.message ?? "明細の作成に失敗しました",
      };
    }
    insertedLines.push({
      id: lineRow.id as string,
      productCode: line.productCode,
      quantity: line.quantity,
    });
  }

  // 在庫商品は FIFO で引き当て
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
      const { error: allocErr } = await supabase
        .from("sales_order_line_allocation")
        .insert({
          sales_order_line_id: lineId,
          product_stock_id: lot.productStockId,
          quantity: take,
        });
      if (allocErr) {
        return {
          ok: false,
          fieldErrors: {},
          formError: allocErr.message,
        };
      }
      const { data: currentStock, error: readErr } = await supabase
        .from("product_stock")
        .select("quantity_allocated")
        .eq("id", lot.productStockId)
        .single();
      if (readErr || !currentStock) {
        return {
          ok: false,
          fieldErrors: {},
          formError: readErr?.message ?? "在庫情報を読み込めませんでした",
        };
      }
      const { error: updateErr } = await supabase
        .from("product_stock")
        .update({
          quantity_allocated:
            (currentStock.quantity_allocated as number) + take,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lot.productStockId);
      if (updateErr) {
        return { ok: false, fieldErrors: {}, formError: updateErr.message };
      }
      const { error: mvErr } = await supabase.from("stock_movement").insert({
        product_stock_id: lot.productStockId,
        movement_type: "allocate",
        quantity: take,
        reference_type: "sales_order",
        reference_id: salesOrderId,
      });
      if (mvErr) {
        return { ok: false, fieldErrors: {}, formError: mvErr.message };
      }
      remaining -= take;
    }
    // remaining > 0 でも処理は止めない（オーバー引当許容、フロー1 仕様）
  }

  // order_at_sale 商品は仕入先ごとにまとめて自動発注
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
    if (prodErr) {
      return { ok: false, fieldErrors: {}, formError: prodErr.message };
    }
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
      if (supplierKey === "__no_supplier__") {
        // 仕入先未設定の商品はスキップ。後で手動発注。
        continue;
      }
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
        return {
          ok: false,
          fieldErrors: {},
          formError: poErr?.message ?? "発注書の作成に失敗しました",
        };
      }
      const poId = poRow.id as string;
      let lineNo = 0;
      for (const l of lines) {
        lineNo += 1;
        const sub = round(l.unitPrice * l.quantity);
        const { error: poLineErr } = await supabase
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
          });
        if (poLineErr) {
          return { ok: false, fieldErrors: {}, formError: poLineErr.message };
        }
      }
    }
  }

  revalidatePath("/orders");
  revalidatePath("/purchase-orders");
  redirect(`/orders/${salesOrderId}`);
}
