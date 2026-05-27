import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import { ResultBanner } from "@/components/common/result-banner";
import { aggregateBillingForPeriod } from "@/lib/supabase/queries/billing";
import { BillingForm } from "./billing-form";

type SearchParams = {
  closingDay?: string;
  periodFrom?: string;
  periodTo?: string;
  issued?: string;
  failed?: string;
};

function defaultPeriod(): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  // 既定：先月の翌月1日〜末日相当（月次集計の想定）
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0);
  return { from: fmt(from), to: fmt(to) };
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const defaults = defaultPeriod();
  const closingDay = Math.min(
    31,
    Math.max(1, Number(sp.closingDay ?? "31") || 31)
  );
  const periodFrom = /^\d{4}-\d{2}-\d{2}$/.test(sp.periodFrom ?? "")
    ? (sp.periodFrom as string)
    : defaults.from;
  const periodTo = /^\d{4}-\d{2}-\d{2}$/.test(sp.periodTo ?? "")
    ? (sp.periodTo as string)
    : defaults.to;
  const hasAggregated =
    !!sp.closingDay || !!sp.periodFrom || !!sp.periodTo;

  const summary = hasAggregated
    ? await aggregateBillingForPeriod(closingDay, periodFrom, periodTo)
    : [];

  const issued = Math.max(0, Number(sp.issued ?? "0") || 0);
  const failed = Math.max(0, Number(sp.failed ?? "0") || 0);

  return (
    <>
      <TopHeader />
      <PageBar title="請求の業務" />
      <main className="mx-auto w-full max-w-[1280px] px-8 py-8">
        <ResultBanner
          issued={issued}
          failed={failed}
          successLabel="件の請求書を発行"
          failedLabel="件で発行失敗"
        />
        <BillingForm
          initialClosingDay={closingDay}
          initialPeriodFrom={periodFrom}
          initialPeriodTo={periodTo}
          summary={summary}
          hasAggregated={hasAggregated}
        />
      </main>
    </>
  );
}
