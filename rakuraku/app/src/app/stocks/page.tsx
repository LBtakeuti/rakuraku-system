import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import {
  listStockByProduct,
  listStockByLot,
  getExpiryWarningCounts,
} from "@/lib/supabase/queries/stock";
import { StocksView } from "./stocks-view";

type SearchParams = {
  q?: string;
  view?: string;
  expiry?: string;
};

export default async function StocksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const view = (sp.view === "lot" ? "lot" : "product") as "product" | "lot";
  const expiryFilter = (
    sp.expiry === "danger" || sp.expiry === "warning" ? sp.expiry : "all"
  ) as "all" | "danger" | "warning";
  const query = sp.q?.trim() ?? "";

  const [summary, lots, warningCounts] = await Promise.all([
    listStockByProduct({ query, expiryFilter }),
    listStockByLot({ query, expiryFilter }),
    getExpiryWarningCounts(),
  ]);

  return (
    <>
      <TopHeader />
      <PageBar title="在庫を見る" />
      <main className="mx-auto w-full max-w-[1280px] px-10 py-12">
        <StocksView
          summary={summary}
          lots={lots}
          warningCounts={warningCounts}
          query={query}
          view={view}
          expiryFilter={expiryFilter}
        />
      </main>
    </>
  );
}
