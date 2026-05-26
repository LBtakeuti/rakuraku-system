import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import { listProducts } from "@/lib/supabase/queries/product";
import { ProductsTable } from "./products-table";

type SearchParams = {
  q?: string;
  filter?: string;
  page?: string;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 20;
  const filterValue = (
    sp.filter === "stocked" ||
    sp.filter === "order_at_sale" ||
    sp.filter === "no_price"
      ? sp.filter
      : "all"
  ) as "all" | "stocked" | "order_at_sale" | "no_price";
  const query = sp.q?.trim() ?? "";

  const { rows, total } = await listProducts({
    query,
    filter: filterValue,
    page,
    pageSize,
  });

  return (
    <>
      <TopHeader />
      <PageBar title="商品を管理する" />
      <main className="mx-auto w-full max-w-[1280px] px-10 py-12">
        <ProductsTable
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          query={query}
          filter={filterValue}
        />
      </main>
    </>
  );
}
