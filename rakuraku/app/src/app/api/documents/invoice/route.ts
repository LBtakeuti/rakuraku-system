import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCompanySetting } from "@/lib/supabase/queries/company-setting";
import { ensureFontsRegistered } from "@/lib/documents/font-loader";
import {
  buildInvoiceDocument,
  type InvoiceBuilderInput,
} from "@/lib/documents/builders/invoice-builder";
import { InvoicePdf } from "@/lib/documents/templates/invoice";
import { InvoiceWithDeliveryPdf } from "@/lib/documents/templates/invoice-with-delivery";
import type { InvoiceFormat, InvoiceTaxType, TaxRounding } from "@/types/customer";
import type { TaxRate } from "@/types/product";
import React from "react";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const statementId = sp.get("statementId");
  const customerCode = sp.get("customerCode");
  const periodTo = sp.get("periodTo");

  if (!statementId && (!customerCode || !periodTo)) {
    return NextResponse.json(
      { error: "statementId または customerCode+periodTo パラメータが必要です" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  let stmtQuery = supabase
    .from("billing_statement")
    .select(
      "id,statement_no,customer_code,period_from,period_to,issue_date,due_date,previous_balance,current_amount,total_due"
    );

  if (statementId) {
    stmtQuery = stmtQuery.eq("id", statementId);
  } else {
    stmtQuery = stmtQuery
      .eq("customer_code", customerCode!)
      .eq("period_to", periodTo!);
  }

  const { data: stmt, error: stmtErr } = await stmtQuery
    .order("issue_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (stmtErr) throw stmtErr;
  if (!stmt) {
    return NextResponse.json(
      { error: "請求書が見つかりません" },
      { status: 404 }
    );
  }

  const { data: customer, error: custErr } = await supabase
    .from("customer")
    .select(
      "customer_code,name,postal_code,address,invoice_format,invoice_tax_type,tax_rounding"
    )
    .eq("customer_code", stmt.customer_code as string)
    .maybeSingle();
  if (custErr) throw custErr;

  const invoiceFormat: InvoiceFormat =
    (customer?.invoice_format as InvoiceFormat) ?? "invoice_only";

  // billing_statement_line → sales_invoice
  const { data: stmtLines, error: slErr } = await supabase
    .from("billing_statement_line")
    .select("sales_invoice_id")
    .eq("billing_statement_id", statementId)
    .order("line_no");
  if (slErr) throw slErr;
  const invoiceIds = (stmtLines ?? []).map(
    (l) => l.sales_invoice_id as string
  );

  // sales_invoice + lines
  type InvoiceWithLines = {
    invoiceNo: string;
    invoiceDate: string;
    deliveryNote: string | null;
    lines: Array<{
      productCode: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      amount: number;
      taxRate: TaxRate;
    }>;
  };
  const invoices: InvoiceWithLines[] = [];
  if (invoiceIds.length > 0) {
    const { data: invRows, error: invErr } = await supabase
      .from("sales_invoice")
      .select("id,invoice_no,invoice_date,delivery_note")
      .in("id", invoiceIds)
      .order("invoice_date");
    if (invErr) throw invErr;

    const { data: allLines, error: alErr } = await supabase
      .from("sales_invoice_line")
      .select(
        "sales_invoice_id,product_code,product_name_snapshot,quantity,unit_price,amount,tax_rate"
      )
      .in("sales_invoice_id", invoiceIds)
      .order("line_no");
    if (alErr) throw alErr;

    const linesByInv = new Map<string, typeof allLines>();
    for (const l of allLines ?? []) {
      const id = l.sales_invoice_id as string;
      const arr = linesByInv.get(id) ?? [];
      arr.push(l);
      linesByInv.set(id, arr);
    }

    for (const inv of invRows ?? []) {
      const lines = linesByInv.get(inv.id as string) ?? [];
      invoices.push({
        invoiceNo: inv.invoice_no as string,
        invoiceDate: inv.invoice_date as string,
        deliveryNote: (inv.delivery_note as string | null) ?? null,
        lines: lines.map((l) => {
          const rate =
            typeof l.tax_rate === "string"
              ? Number(l.tax_rate)
              : (l.tax_rate as number);
          return {
            productCode: l.product_code as string,
            productName: l.product_name_snapshot as string,
            quantity: l.quantity as number,
            unitPrice:
              typeof l.unit_price === "string"
                ? Number(l.unit_price)
                : (l.unit_price as number),
            amount:
              typeof l.amount === "string"
                ? Number(l.amount)
                : (l.amount as number),
            taxRate: (rate === 0.08 ? 0.08 : 0.1) as TaxRate,
          };
        }),
      });
    }
  }

  // 入金額を計算
  const { data: payments, error: payErr } = await supabase
    .from("payment")
    .select("amount")
    .eq("customer_code", stmt.customer_code as string)
    .gte("received_date", stmt.period_from as string)
    .lte("received_date", stmt.period_to as string);
  if (payErr) throw payErr;
  const paymentAmount = (payments ?? []).reduce(
    (sum, p) =>
      sum +
      (typeof p.amount === "string" ? Number(p.amount) : (p.amount as number)),
    0
  );

  const company = await getCompanySetting();

  const input: InvoiceBuilderInput = {
    company,
    statement: {
      statementNo: stmt.statement_no as string,
      periodFrom: stmt.period_from as string,
      periodTo: stmt.period_to as string,
      issueDate: stmt.issue_date as string,
      dueDate: (stmt.due_date as string | null) ?? null,
      previousBalance:
        typeof stmt.previous_balance === "string"
          ? Number(stmt.previous_balance)
          : (stmt.previous_balance as number),
      currentAmount:
        typeof stmt.current_amount === "string"
          ? Number(stmt.current_amount)
          : (stmt.current_amount as number),
      totalDue:
        typeof stmt.total_due === "string"
          ? Number(stmt.total_due)
          : (stmt.total_due as number),
    },
    customer: {
      customerCode: (customer?.customer_code as string) ?? "",
      name: (customer?.name as string) ?? "",
      postalCode: (customer?.postal_code as string | null) ?? null,
      address: (customer?.address as string | null) ?? null,
      invoiceTaxType:
        (customer?.invoice_tax_type as InvoiceTaxType) ?? "per_invoice",
      taxRounding: (customer?.tax_rounding as TaxRounding) ?? "floor",
    },
    paymentAmount,
    invoices,
  };

  const docData = buildInvoiceDocument(input);

  ensureFontsRegistered();

  const element =
    invoiceFormat === "invoice_delivery"
      ? React.createElement(InvoiceWithDeliveryPdf, { data: docData })
      : React.createElement(InvoicePdf, { data: docData });

  const buffer = await renderToBuffer(element as any);

  return new NextResponse(Buffer.from(buffer) as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${docData.statementNo}.pdf"`,
    },
  });
}
