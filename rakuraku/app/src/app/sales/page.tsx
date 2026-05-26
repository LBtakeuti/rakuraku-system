import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import { ResultBanner } from "@/components/common/result-banner";
import {
  listSalesInvoices,
  getSalesSummary,
} from "@/lib/supabase/queries/sales-invoice";
import { SalesView } from "./sales-view";

type SearchParams = {
  q?: string;
  period?: string;
  page?: string;
  invoiced?: string;
  failed?: string;
};

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const period = (
    sp.period === "today" ||
    sp.period === "last_month" ||
    sp.period === "this_year" ||
    sp.period === "all"
      ? sp.period
      : "this_month"
  ) as "today" | "this_month" | "last_month" | "this_year" | "all";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 20;
  const query = sp.q?.trim() ?? "";

  const [{ rows, total, periodLabel }, summary] = await Promise.all([
    listSalesInvoices({ query, period, page, pageSize }),
    getSalesSummary(period),
  ]);

  const invoiced = Math.max(0, Number(sp.invoiced ?? "0") || 0);
  const failed = Math.max(0, Number(sp.failed ?? "0") || 0);

  return (
    <>
      <TopHeader />
      <PageBar title="売上を見る" />
      <main className="mx-auto w-full max-w-[1280px] px-10 py-10">
        <ResultBanner
          issued={invoiced}
          failed={failed}
          successLabel="件の納品を確定"
          failedLabel="件で納品失敗"
          paramKeys={{ issued: "invoiced", failed: "failed" }}
        />
        <SalesView
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          query={query}
          period={period}
          summary={summary}
          periodLabel={periodLabel}
        />
      </main>
    </>
  );
}
