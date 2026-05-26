import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import { OrderNewForm } from "../order-new-form";

export default function OrdersNewPage() {
  return (
    <>
      <TopHeader />
      <PageBar title="注文を受ける" />
      <main className="mx-auto w-full max-w-[1100px] px-10 py-10">
        <OrderNewForm />
      </main>
    </>
  );
}
