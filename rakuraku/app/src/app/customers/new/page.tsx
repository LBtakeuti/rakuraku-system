import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import { listActiveStaff } from "@/lib/supabase/queries/customer";
import { CustomerForm } from "../customer-form";
import { createCustomer } from "../actions";

export default async function CustomerNewPage() {
  const staffOptions = await listActiveStaff();
  return (
    <>
      <TopHeader />
      <PageBar title="新しいお客様を追加する" backTo="/customers" />
      <main className="mx-auto w-full max-w-[920px] px-8 py-8">
        <CustomerForm mode="create" staffOptions={staffOptions} action={createCustomer} />
      </main>
    </>
  );
}
