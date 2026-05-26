"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsActionResult =
  | { success: true }
  | { success: false; formError: string };

export async function updateCompanySetting(
  _prev: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const companyName = (formData.get("companyName") as string)?.trim();
  const registrationNo = (formData.get("registrationNo") as string)?.trim();
  const postalCode = (formData.get("postalCode") as string)?.trim();
  const address = (formData.get("address") as string)?.trim();
  const tel = (formData.get("tel") as string)?.trim();
  const fax = (formData.get("fax") as string)?.trim() || null;
  const bankInfo = (formData.get("bankInfo") as string)?.trim();

  if (!companyName || !registrationNo || !postalCode || !address || !tel || !bankInfo) {
    return { success: false, formError: "必須項目をすべて入力してください" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("company_setting")
    .update({
      company_name: companyName,
      registration_no: registrationNo,
      postal_code: postalCode,
      address,
      tel,
      fax,
      bank_info: bankInfo,
    })
    .eq("id", 1);

  if (error) {
    return { success: false, formError: "設定の保存に失敗しました。通信状態を確認して、もう一度お試しください" };
  }

  revalidatePath("/settings");
  return { success: true };
}
