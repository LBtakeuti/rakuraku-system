import { createClient } from "@/lib/supabase/server";
import type {
  CustomerRow,
  CustomerRank,
  CustomerStatus,
  InvoiceFormat,
  InvoiceTaxType,
  TaxRounding,
} from "@/types/customer";

type DbCustomer = {
  customer_code: string;
  name: string;
  name_kana: string | null;
  postal_code: string | null;
  address: string | null;
  building: string | null;
  phone: string | null;
  fax: string | null;
  contact_person: string | null;
  email: string | null;
  rank: CustomerRank;
  status: CustomerStatus;
  staff_id: string | null;
  invoice_format: InvoiceFormat;
  closing_day: number;
  payment_cycle: string | null;
  invoice_tax_type: InvoiceTaxType;
  tax_rounding: TaxRounding;
  staff?: { id: string; name: string } | null;
};

function mapRow(r: DbCustomer): CustomerRow {
  return {
    customerCode: r.customer_code,
    name: r.name,
    nameKana: r.name_kana,
    postalCode: r.postal_code,
    address: r.address,
    building: r.building,
    phone: r.phone,
    fax: r.fax,
    contactPerson: r.contact_person,
    email: r.email,
    rank: r.rank,
    status: r.status,
    staffId: r.staff_id,
    staffName: r.staff?.name ?? null,
    invoiceFormat: r.invoice_format,
    closingDay: r.closing_day,
    paymentCycle: r.payment_cycle,
    invoiceTaxType: r.invoice_tax_type,
    taxRounding: r.tax_rounding,
  };
}

export type CustomerListFilter = {
  query?: string;
  status?: "all" | "active" | "paused" | "rank_ab";
  page?: number;
  pageSize?: number;
};

export async function listCustomers(
  filter: CustomerListFilter = {}
): Promise<{ rows: CustomerRow[]; total: number }> {
  const supabase = await createClient();
  const pageSize = filter.pageSize ?? 20;
  const page = Math.max(1, filter.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("customer")
    .select(
      "customer_code,name,name_kana,postal_code,address,building,phone,fax,contact_person,email,rank,status,staff_id,invoice_format,closing_day,payment_cycle,invoice_tax_type,tax_rounding,staff:staff_id(id,name)",
      { count: "exact" }
    )
    .order("customer_code", { ascending: true });

  if (filter.query) {
    const term = filter.query.trim();
    if (term) {
      q = q.or(
        `name.ilike.%${term}%,name_kana.ilike.%${term}%,customer_code.ilike.%${term}%`
      );
    }
  }
  if (filter.status === "active") q = q.eq("status", "active");
  if (filter.status === "paused") q = q.eq("status", "paused");
  if (filter.status === "rank_ab") q = q.in("rank", ["A", "B"]);

  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  return {
    rows: (data ?? []).map((r) => mapRow(r as unknown as DbCustomer)),
    total: count ?? 0,
  };
}

export async function getCustomer(code: string): Promise<CustomerRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer")
    .select(
      "customer_code,name,name_kana,postal_code,address,building,phone,fax,contact_person,email,rank,status,staff_id,invoice_format,closing_day,payment_cycle,invoice_tax_type,tax_rounding,staff:staff_id(id,name)"
    )
    .eq("customer_code", code)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRow(data as unknown as DbCustomer);
}

export type StaffOption = { id: string; name: string };

export async function listActiveStaff(): Promise<StaffOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff")
    .select("id,name")
    .eq("status", "active")
    .order("name");
  if (error) throw error;
  return (data ?? []) as StaffOption[];
}
