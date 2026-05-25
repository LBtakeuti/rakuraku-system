"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { customerFormSchema } from "@/lib/validations/customer";
import { nextCustomerCode } from "@/lib/utils/numbering";

export type CustomerActionResult =
  | { ok: true; customerCode: string }
  | { ok: false; fieldErrors: Record<string, string[] | undefined>; formError?: string };

function toFieldErrors(
  errors: readonly { path: readonly PropertyKey[]; message: string }[]
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const e of errors) {
    const key = e.path[0] === undefined ? "" : String(e.path[0]);
    if (!key) continue;
    (out[key] ??= []).push(e.message);
  }
  return out;
}

export async function createCustomer(
  _prev: CustomerActionResult | null,
  formData: FormData
): Promise<CustomerActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = customerFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const v = parsed.data;

  const supabase = await createClient();
  let code = v.customerCode?.trim();
  if (!code) {
    code = await nextCustomerCode();
  } else {
    const { data: existing, error: exErr } = await supabase
      .from("customer")
      .select("customer_code")
      .eq("customer_code", code)
      .maybeSingle();
    if (exErr) return { ok: false, fieldErrors: {}, formError: exErr.message };
    if (existing) {
      return {
        ok: false,
        fieldErrors: {
          customerCode: ["このお客様コードはすでに使われています"],
        },
      };
    }
  }

  const { error } = await supabase.from("customer").insert({
    customer_code: code,
    name: v.name,
    name_kana: v.nameKana || null,
    postal_code: v.postalCode || null,
    address: v.address,
    building: v.building || null,
    phone: v.phone,
    fax: v.fax || null,
    contact_person: v.contactPerson || null,
    email: v.email || null,
    rank: v.rank,
    status: v.status,
    staff_id: v.staffId || null,
    invoice_format: v.invoiceFormat,
    closing_day: v.closingDay,
    payment_cycle: v.paymentCycle || null,
    invoice_tax_type: v.invoiceTaxType,
    tax_rounding: v.taxRounding,
  });
  if (error) {
    return { ok: false, fieldErrors: {}, formError: error.message };
  }

  revalidatePath("/customers");
  redirect("/customers");
}

export async function updateCustomer(
  customerCode: string,
  _prev: CustomerActionResult | null,
  formData: FormData
): Promise<CustomerActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = customerFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("customer")
    .update({
      name: v.name,
      name_kana: v.nameKana || null,
      postal_code: v.postalCode || null,
      address: v.address,
      building: v.building || null,
      phone: v.phone,
      fax: v.fax || null,
      contact_person: v.contactPerson || null,
      email: v.email || null,
      rank: v.rank,
      status: v.status,
      staff_id: v.staffId || null,
      invoice_format: v.invoiceFormat,
      closing_day: v.closingDay,
      payment_cycle: v.paymentCycle || null,
      invoice_tax_type: v.invoiceTaxType,
      tax_rounding: v.taxRounding,
      updated_at: new Date().toISOString(),
    })
    .eq("customer_code", customerCode);
  if (error) {
    return { ok: false, fieldErrors: {}, formError: error.message };
  }
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerCode}/edit`);
  redirect("/customers");
}
