import { createClient } from "@/lib/supabase/server";
import type { CompanySetting } from "@/types/company-setting";

type DbRow = {
  id: number;
  company_name: string;
  registration_no: string;
  postal_code: string;
  address: string;
  tel: string;
  fax: string | null;
  bank_info: string;
};

function mapRow(row: DbRow): CompanySetting {
  return {
    id: row.id,
    companyName: row.company_name,
    registrationNo: row.registration_no,
    postalCode: row.postal_code,
    address: row.address,
    tel: row.tel,
    fax: row.fax,
    bankInfo: row.bank_info,
  };
}

export async function getCompanySetting(): Promise<CompanySetting> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_setting")
    .select(
      "id, company_name, registration_no, postal_code, address, tel, fax, bank_info"
    )
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error(
      `company_setting の取得に失敗しました: ${error.message}`
    );
  }

  return mapRow(data as DbRow);
}
