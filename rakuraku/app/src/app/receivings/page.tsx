import { notFound } from "next/navigation";
import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import {
  getPurchaseOrder,
  listReceivablePurchaseOrders,
} from "@/lib/supabase/queries/purchase-order";
import { PoPicker } from "./po-picker";
import { ReceivingForm } from "./receiving-form";

type SearchParams = {
  po?: string;
};

export default async function ReceivingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  if (sp.po) {
    const po = await getPurchaseOrder(sp.po);
    if (!po) notFound();
    return (
      <>
        <TopHeader />
        <PageBar title="入荷を登録する" />
        <main className="mx-auto w-full max-w-[1100px] px-10 py-10">
          <ReceivingForm po={po} />
        </main>
      </>
    );
  }
  const pos = await listReceivablePurchaseOrders();
  return (
    <>
      <TopHeader />
      <PageBar title="入荷を登録する" />
      <main className="mx-auto w-full max-w-[1100px] px-10 py-10">
        <PoPicker pos={pos} />
      </main>
    </>
  );
}
