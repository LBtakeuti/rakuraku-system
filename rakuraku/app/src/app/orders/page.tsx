import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import { listSalesOrders } from "@/lib/supabase/queries/sales-order";
import { OrdersTable } from "./orders-table";

type SearchParams = {
  q?: string;
  status?: string;
  period?: string;
  page?: string;
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 20;
  const statusValue = (
    sp.status === "pending" ||
    sp.status === "fulfilled" ||
    sp.status === "cancelled"
      ? sp.status
      : "all"
  ) as "all" | "pending" | "fulfilled" | "cancelled";
  const periodValue = (
    sp.period === "today" ||
    sp.period === "this_week" ||
    sp.period === "this_month" ||
    sp.period === "last_month"
      ? sp.period
      : "all"
  ) as "today" | "this_week" | "this_month" | "last_month" | "all";
  const query = sp.q?.trim() ?? "";

  const { rows, total } = await listSalesOrders({
    query,
    status: statusValue,
    period: periodValue,
    page,
    pageSize,
  });

  return (
    <>
      <TopHeader />
      <PageBar title="注文を見る" />
      <main className="mx-auto w-full max-w-[1280px] px-10 py-10">
        <OrdersTable
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          query={query}
          status={statusValue}
          period={periodValue}
        />
      </main>
    </>
  );
}
