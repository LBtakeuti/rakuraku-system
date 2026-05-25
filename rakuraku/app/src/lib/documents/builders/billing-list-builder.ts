import type {
  BillingListDocumentData,
  BillingListRow,
  BillingListTotals,
} from "@/lib/documents/types";
import type { CompanySetting } from "@/types/company-setting";

export type BillingListBuilderInput = {
  company: CompanySetting;
  periodFrom: string;
  periodTo: string;
  closingDay: number;
  issueDate: string;
  rows: BillingListRow[];
};

export function buildBillingListDocument(
  input: BillingListBuilderInput
): BillingListDocumentData {
  const totals: BillingListTotals = {
    invoiceCount: 0,
    previousBalance: 0,
    paymentAmount: 0,
    carryOver: 0,
    currentSubtotal: 0,
    currentTax: 0,
    currentTotal: 0,
    totalDue: 0,
  };

  for (const row of input.rows) {
    totals.invoiceCount += row.invoiceCount;
    totals.previousBalance += row.previousBalance;
    totals.paymentAmount += row.paymentAmount;
    totals.carryOver += row.carryOver;
    totals.currentSubtotal += row.currentSubtotal;
    totals.currentTax += row.currentTax;
    totals.currentTotal += row.currentTotal;
    totals.totalDue += row.totalDue;
  }

  return {
    company: input.company,
    periodFrom: input.periodFrom,
    periodTo: input.periodTo,
    closingDay: input.closingDay,
    issueDate: input.issueDate,
    rows: input.rows,
    totals,
  };
}
