import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCompanySetting } from "@/lib/supabase/queries/company-setting";
import { ensureFontsRegistered } from "@/lib/documents/font-loader";
import {
  buildPurchaseOrderDocument,
  type PurchaseOrderBuilderInput,
} from "@/lib/documents/builders/purchase-order-builder";
import { PurchaseOrderPdf } from "@/lib/documents/templates/purchase-order";
import React from "react";

export async function GET(request: NextRequest) {
  const purchaseOrderId = request.nextUrl.searchParams.get("purchaseOrderId");
  if (!purchaseOrderId) {
    return NextResponse.json(
      { error: "purchaseOrderId パラメータが必要です" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: po, error: poErr } = await supabase
    .from("purchase_order")
    .select(
      "id,purchase_order_no,order_date,expected_delivery_date,note,supplier_code"
    )
    .eq("id", purchaseOrderId)
    .maybeSingle();
  if (poErr) throw poErr;
  if (!po) {
    return NextResponse.json(
      { error: "発注書が見つかりません" },
      { status: 404 }
    );
  }

  const { data: supplier, error: supErr } = await supabase
    .from("supplier")
    .select("supplier_code,name,postal_code,address,phone")
    .eq("supplier_code", po.supplier_code as string)
    .maybeSingle();
  if (supErr) throw supErr;

  const { data: lineRows, error: lineErr } = await supabase
    .from("purchase_order_line")
    .select(
      "line_no,product_code,product_name_snapshot,quantity,unit_price,tax_rate,amount,note"
    )
    .eq("purchase_order_id", purchaseOrderId)
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

  const company = await getCompanySetting();

  const input: PurchaseOrderBuilderInput = {
    company,
    purchaseOrder: {
      purchaseOrderNo: po.purchase_order_no as string,
      orderDate: po.order_date as string,
      expectedDeliveryDate: (po.expected_delivery_date as string | null) ?? null,
      note: (po.note as string | null) ?? null,
    },
    supplier: {
      supplierCode: (supplier?.supplier_code as string) ?? "",
      name: (supplier?.name as string) ?? "",
      postalCode: (supplier?.postal_code as string | null) ?? null,
      address: (supplier?.address as string | null) ?? null,
      phone: (supplier?.phone as string | null) ?? null,
    },
    lines: (lineRows ?? []).map((l) => {
      const prod = productMap.get(l.product_code as string);
      const rate =
        typeof l.tax_rate === "string" ? Number(l.tax_rate) : (l.tax_rate as number);
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
        note: (l.note as string | null) ?? null,
      };
    }),
  };

  const docData = buildPurchaseOrderDocument(input);

  ensureFontsRegistered();
  const buffer = await renderToBuffer(
    React.createElement(PurchaseOrderPdf, { data: docData }) as any
  );

  return new NextResponse(Buffer.from(buffer) as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="purchase-order-${docData.purchaseOrderNo}.pdf"`,
    },
  });
}
