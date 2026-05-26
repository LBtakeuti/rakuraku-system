import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCompanySetting } from "@/lib/supabase/queries/company-setting";
import { aggregateBillingForPeriod } from "@/lib/supabase/queries/billing";
import { ensureFontsRegistered } from "@/lib/documents/font-loader";
import {
  buildBillingListDocument,
  type BillingListBuilderInput,
} from "@/lib/documents/builders/billing-list-builder";
import { BillingListPdf } from "@/lib/documents/templates/billing-list";
import type { BillingListRow } from "@/lib/documents/types";
import React from "react";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const periodFrom = sp.get("periodFrom");
  const periodTo = sp.get("periodTo");
  const closingDayParam = sp.get("closingDay");

  if (!periodFrom || !periodTo || !closingDayParam) {
    return NextResponse.json(
      { error: "periodFrom, periodTo, closingDay パラメータが必要です" },
      { status: 400 }
    );
  }

  const closingDay = Math.min(31, Math.max(1, Number(closingDayParam) || 31));

  const summary = await aggregateBillingForPeriod(
    closingDay,
    periodFrom,
    periodTo
  );

  const company = await getCompanySetting();

  const today = new Date();
  const issueDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const rows: BillingListRow[] = summary.map((s) => ({
    customerCode: s.customerCode,
    customerName: s.customerName,
    invoiceTaxType: s.invoiceTaxType,
    invoiceCount: s.invoiceIds.length,
    paymentDueDate: s.paymentDueDate,
    previousBalance: s.previousBalance,
    paymentAmount: s.paymentAmount,
    carryOver: s.carryOver,
    currentSubtotal: s.currentSubtotal,
    currentTax: s.currentTax,
    currentTotal: s.currentTotal,
    totalDue: s.totalDue,
  }));

  const input: BillingListBuilderInput = {
    company,
    periodFrom,
    periodTo,
    closingDay,
    issueDate,
    rows,
  };

  const docData = buildBillingListDocument(input);

  ensureFontsRegistered();
  const buffer = await renderToBuffer(
    React.createElement(BillingListPdf, { data: docData }) as any
  );

  return new NextResponse(Buffer.from(buffer) as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="billing-list-${periodFrom}-${periodTo}.pdf"`,
    },
  });
}
