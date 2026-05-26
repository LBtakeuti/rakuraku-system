import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import { listDeliverableOrders } from "@/lib/supabase/queries/delivery";
import { DeliveriesView } from "./deliveries-view";

type SearchParams = {
  q?: string;
  range?: string;
};

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const range = (
    sp.range === "today" || sp.range === "all" ? sp.range : "this_week"
  ) as "today" | "this_week" | "all";
  const query = sp.q?.trim() ?? "";

  const orders = await listDeliverableOrders({ query, range });

  return (
    <>
      <TopHeader />
      <PageBar title="納品する" />
      <main className="mx-auto w-full max-w-[1280px] px-10 py-10">
        <DeliveriesView orders={orders} query={query} range={range} />
      </main>
    </>
  );
}
