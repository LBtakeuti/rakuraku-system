import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import {
  listSalesInvoices,
  getSalesSummary,
} from "@/lib/supabase/queries/sales-invoice";
import { SalesView } from "./sales-view";

type SearchParams = {
  q?: string;
  period?: string;
  page?: string;
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

  return (
    <>
      <TopHeader />
      <PageBar title="売上を見る" />
      <main className="mx-auto w-full max-w-[1280px] px-8 py-8">
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
