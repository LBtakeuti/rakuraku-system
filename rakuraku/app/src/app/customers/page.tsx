import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import { listCustomers } from "@/lib/supabase/queries/customer";
import { CustomersTable } from "./customers-table";

type SearchParams = {
  q?: string;
  status?: string;
  page?: string;
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 20;
  const statusValue = (
    sp.status === "active" ||
    sp.status === "paused" ||
    sp.status === "rank_ab"
      ? sp.status
      : "all"
  ) as "all" | "active" | "paused" | "rank_ab";
  const query = sp.q?.trim() ?? "";

  const { rows, total } = await listCustomers({
    query,
    status: statusValue,
    page,
    pageSize,
  });

  return (
    <>
      <TopHeader />
      <PageBar title="お客様を管理する" />
      <main className="mx-auto w-full max-w-[1280px] px-10 py-10">
        <CustomersTable
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
