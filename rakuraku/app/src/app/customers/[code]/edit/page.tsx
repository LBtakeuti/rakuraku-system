import { notFound } from "next/navigation";
import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import {
  getCustomer,
  listActiveStaff,
} from "@/lib/supabase/queries/customer";
import { CustomerForm } from "../../customer-form";
import { updateCustomer } from "../../actions";

export default async function CustomerEditPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [customer, staffOptions] = await Promise.all([
    getCustomer(code),
    listActiveStaff(),
  ]);
  if (!customer) notFound();

  const boundAction = updateCustomer.bind(null, customer.customerCode);

  return (
    <>
      <TopHeader />
      <PageBar
        title={`お客様を編集する：${customer.name}`}
        backTo="/customers"
      />
      <main className="mx-auto w-full max-w-[920px] px-10 py-10">
        <CustomerForm
          mode="edit"
          initial={customer}
          staffOptions={staffOptions}
          action={boundAction}
        />
      </main>
    </>
  );
}
