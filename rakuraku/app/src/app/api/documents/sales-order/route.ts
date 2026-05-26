import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCompanySetting } from "@/lib/supabase/queries/company-setting";
import { ensureFontsRegistered } from "@/lib/documents/font-loader";
import {
  buildSalesOrderDocument,
  type SalesOrderBuilderInput,
} from "@/lib/documents/builders/sales-order-builder";
import { SalesOrderPdf } from "@/lib/documents/templates/sales-order";
import React from "react";

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json(
      { error: "orderId パラメータが必要です" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: order, error: orderErr } = await supabase
    .from("sales_order")
    .select(
      "id,order_no,customer_code,delivery_address_id,order_date,subtotal,tax_amount,total_amount,note"
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr) throw orderErr;
  if (!order) {
    return NextResponse.json(
      { error: "受注が見つかりません" },
      { status: 404 }
    );
  }

  const { data: customer, error: custErr } = await supabase
    .from("customer")
    .select("customer_code,name,postal_code,address,phone")
    .eq("customer_code", order.customer_code as string)
    .maybeSingle();
  if (custErr) throw custErr;

  let deliveryAddress: SalesOrderBuilderInput["deliveryAddress"] = null;
  if (order.delivery_address_id) {
    const { data: addr } = await supabase
      .from("delivery_address")
      .select("name,postal_code,address,phone")
      .eq("id", order.delivery_address_id as string)
      .maybeSingle();
    if (addr) {
      deliveryAddress = {
        name: (addr.name as string | null) ?? null,
        postalCode: (addr.postal_code as string | null) ?? null,
        address: (addr.address as string | null) ?? null,
        phone: (addr.phone as string | null) ?? null,
      };
    }
  }

  const { data: lineRows, error: lineErr } = await supabase
    .from("sales_order_line")
    .select(
      "line_no,product_code,product_name_snapshot,quantity,unit_price,tax_rate,amount,note"
    )
    .eq("sales_order_id", orderId)
    .order("line_no");
  if (lineErr) throw lineErr;

  const productCodes = (lineRows ?? []).map(
    (l) => l.product_code as string
  );
  const productMap = new Map<
    string,
    { jan_code: string | null; units_per_case: number }
  >();
  if (productCodes.length > 0) {
    const { data: products } = await supabase
      .from("product")
      .select("product_code,jan_code,units_per_case")
      .in("product_code", productCodes);
    for (const p of products ?? []) {
      productMap.set(p.product_code as string, {
        jan_code: p.jan_code as string | null,
        units_per_case: p.units_per_case as number,
      });
    }
  }

  // 紐づく発注番号を取得（purchase_order_line → purchase_order 経由）
  const { data: poLinks } = await supabase
    .from("sales_order_line")
    .select("line_no,purchase_order_id")
    .eq("sales_order_id", orderId)
    .not("purchase_order_id", "is", null);
  const poIdSet = new Set<string>();
  for (const link of poLinks ?? []) {
    if (link.purchase_order_id) poIdSet.add(link.purchase_order_id as string);
  }
  const poNoMap = new Map<string, string>();
  if (poIdSet.size > 0) {
    const { data: pos } = await supabase
      .from("purchase_order")
      .select("id,purchase_order_no")
      .in("id", Array.from(poIdSet));
    for (const p of pos ?? []) {
      poNoMap.set(p.id as string, p.purchase_order_no as string);
    }
  }
  const linePoMap = new Map<number, string | null>();
  for (const link of poLinks ?? []) {
    const poNo = link.purchase_order_id
      ? poNoMap.get(link.purchase_order_id as string) ?? null
      : null;
    linePoMap.set(link.line_no as number, poNo);
  }

  const company = await getCompanySetting();

  const input: SalesOrderBuilderInput = {
    company,
    salesOrder: {
      orderNo: order.order_no as string,
      orderDate: order.order_date as string,
      subtotal:
        typeof order.subtotal === "string"
          ? Number(order.subtotal)
          : (order.subtotal as number),
      taxAmount:
        typeof order.tax_amount === "string"
          ? Number(order.tax_amount)
          : (order.tax_amount as number),
      totalAmount:
        typeof order.total_amount === "string"
          ? Number(order.total_amount)
          : (order.total_amount as number),
      note: (order.note as string | null) ?? null,
    },
    customer: {
      customerCode: (customer?.customer_code as string) ?? "",
      name: (customer?.name as string) ?? "",
      postalCode: (customer?.postal_code as string | null) ?? null,
      address: (customer?.address as string | null) ?? null,
      phone: (customer?.phone as string | null) ?? null,
    },
    deliveryAddress,
    lines: (lineRows ?? []).map((l) => {
      const prod = productMap.get(l.product_code as string);
      const rate =
        typeof l.tax_rate === "string"
          ? Number(l.tax_rate)
          : (l.tax_rate as number);
      return {
        lineNo: l.line_no as number,
        productCode: l.product_code as string,
        productName: l.product_name_snapshot as string,
        janCode: prod?.jan_code ?? null,
        unitsPerCase: prod?.units_per_case ?? 0,
        quantity: l.quantity as number,
        unitPrice:
          typeof l.unit_price === "string"
            ? Number(l.unit_price)
            : (l.unit_price as number),
        taxRate: (rate === 0.08 ? 0.08 : 0.1) as 0.1 | 0.08,
        amount:
          typeof l.amount === "string"
            ? Number(l.amount)
            : (l.amount as number),
        linkedPurchaseOrderNo: linePoMap.get(l.line_no as number) ?? null,
        note: (l.note as string | null) ?? null,
      };
    }),
  };

  const docData = buildSalesOrderDocument(input);

  ensureFontsRegistered();
  const buffer = await renderToBuffer(
    React.createElement(SalesOrderPdf, { data: docData }) as any
  );

  return new NextResponse(Buffer.from(buffer) as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="sales-order-${docData.orderNo}.pdf"`,
    },
  });
}
