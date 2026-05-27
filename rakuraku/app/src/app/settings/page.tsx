import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import { getCompanySetting } from "@/lib/supabase/queries/company-setting";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const company = await getCompanySetting();

  return (
    <>
      <TopHeader />
      <PageBar title="設定" />
      <main className="mx-auto w-full max-w-[800px] px-8 py-8">
        <SettingsForm initial={company} />
      </main>
    </>
  );
}
