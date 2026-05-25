import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import { listPurchaseOrders } from "@/lib/supabase/queries/purchase-order";
import { PurchaseOrdersTable } from "./purchase-orders-table";

type SearchParams = {
  q?: string;
  status?: string;
  page?: string;
};

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 20;
  const statusValue = (
    sp.status === "ordered" ||
    sp.status === "partial" ||
    sp.status === "received" ||
    sp.status === "cancelled"
      ? sp.status
      : "all"
  ) as "all" | "ordered" | "partial" | "received" | "cancelled";
  const query = sp.q?.trim() ?? "";

  const { rows, total } = await listPurchaseOrders({
    query,
    status: statusValue,
    page,
    pageSize,
  });

  return (
    <>
      <TopHeader />
      <PageBar title="発注を見る" />
      <main className="mx-auto w-full max-w-[1280px] px-8 py-8">
        <PurchaseOrdersTable
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          query={query}
          status={statusValue}
        />
      </main>
    </>
  );
}
