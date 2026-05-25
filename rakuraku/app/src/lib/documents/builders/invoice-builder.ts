import type {
  InvoiceDocumentData,
  InvoiceDetailLine,
  TaxBreakdown,
} from "@/lib/documents/types";
import type { CompanySetting } from "@/types/company-setting";
import type { InvoiceTaxType, TaxRounding } from "@/types/customer";
import type { TaxRate } from "@/types/product";
import { applyRounding } from "@/lib/utils/tax-calculation";

export type InvoiceBuilderInput = {
  company: CompanySetting;
  statement: {
    statementNo: string;
    periodFrom: string;
    periodTo: string;
    issueDate: string;
    dueDate: string | null;
    previousBalance: number;
    currentAmount: number;
    totalDue: number;
  };
  customer: {
    customerCode: string;
    name: string;
    postalCode: string | null;
    address: string | null;
    invoiceTaxType: InvoiceTaxType;
    taxRounding: TaxRounding;
  };
  paymentAmount: number;
  invoices: Array<{
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
  }>;
};

export function buildInvoiceDocument(
  input: InvoiceBuilderInput
): InvoiceDocumentData {
  const carryOver = Math.max(
    0,
    input.statement.previousBalance - input.paymentAmount
  );

  const taxBreakdown = computeTaxBreakdown(
    input.invoices,
    input.customer.invoiceTaxType,
    input.customer.taxRounding
  );

  const currentTotal = taxBreakdown.reduce(
    (sum, b) => sum + b.subtotal + b.taxAmount,
    0
  );

  const detailLines: InvoiceDetailLine[] = [];
  for (const invoice of input.invoices) {
    for (const line of invoice.lines) {
      detailLines.push({
        invoiceDate: invoice.invoiceDate,
        invoiceNo: invoice.invoiceNo,
        productCode: line.productCode,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        amount: line.amount,
        deliveryNote: invoice.deliveryNote,
      });
    }
  }

  return {
    company: input.company,
    statementNo: input.statement.statementNo,
    customer: {
      customerCode: input.customer.customerCode,
      name: input.customer.name,
      postalCode: input.customer.postalCode,
      address: input.customer.address,
    },
    periodFrom: input.statement.periodFrom,
    periodTo: input.statement.periodTo,
    issueDate: input.statement.issueDate,
    dueDate: input.statement.dueDate,
    previousBalance: input.statement.previousBalance,
    paymentAmount: input.paymentAmount,
    carryOver,
    taxBreakdown,
    currentTotal,
    totalDue: carryOver + currentTotal,
    detailLines,
  };
}

function computeTaxBreakdown(
  invoices: InvoiceBuilderInput["invoices"],
  invoiceTaxType: InvoiceTaxType,
  taxRounding: TaxRounding
): TaxBreakdown[] {
  const rates: TaxRate[] = [0.1, 0.08];
  const result: TaxBreakdown[] = [];

  for (const rate of rates) {
    const linesAtRate: Array<{ amount: number; taxRate: number }> = [];
    for (const invoice of invoices) {
      for (const line of invoice.lines) {
        if (Math.abs(line.taxRate - rate) < 1e-9) {
          linesAtRate.push({ amount: line.amount, taxRate: line.taxRate });
        }
      }
    }
    if (linesAtRate.length === 0) {
      result.push({ taxRate: rate, subtotal: 0, taxAmount: 0 });
      continue;
    }

    const subtotal = linesAtRate.reduce((s, l) => s + l.amount, 0);
    let taxAmount = 0;

    if (invoiceTaxType === "per_line") {
      for (const l of linesAtRate) {
        taxAmount += applyRounding(l.amount * rate, taxRounding);
      }
    } else {
      // per_voucher / per_invoice：同一税率の合計に対して 1 回だけ端数処理
      taxAmount = applyRounding(subtotal * rate, taxRounding);
    }

    result.push({ taxRate: rate, subtotal, taxAmount });
  }

  return result;
}
