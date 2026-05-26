"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { productFormSchema } from "@/lib/validations/product";
import { nextProductCode } from "@/lib/utils/numbering";

export type ProductActionResult =
  | { success: true; productCode: string }
  | {
      success: false;
      fieldErrors: Record<string, string[] | undefined>;
      formError?: string;
    };

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

export async function createProduct(
  _prev: ProductActionResult | null,
  formData: FormData
): Promise<ProductActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = productFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const v = parsed.data;

  const supabase = await createClient();
  let code = v.productCode?.trim();
  if (!code) {
    code = await nextProductCode();
  } else {
    const { data: existing, error: exErr } = await supabase
      .from("product")
      .select("product_code")
      .eq("product_code", code)
      .maybeSingle();
    if (exErr) return { success: false, fieldErrors: {}, formError: "商品コードの確認に失敗しました。通信状態を確認して、もう一度お試しください" };
    if (existing) {
      return {
        success: false,
        fieldErrors: {
          productCode: ["この商品コードはすでに使われています"],
        },
      };
    }
  }

  const { error } = await supabase.from("product").insert({
    product_code: code,
    name: v.name,
    jan_code: v.janCode || null,
    units_per_case: v.unitsPerCase,
    default_sales_unit_price: v.defaultSalesUnitPrice,
    default_purchase_unit_price:
      v.defaultPurchaseUnitPrice === null || v.defaultPurchaseUnitPrice === undefined
        ? null
        : v.defaultPurchaseUnitPrice,
    default_tax_rate: v.defaultTaxRate,
    default_order_type: v.defaultOrderType,
    is_stocked: v.defaultOrderType === "stock",
  });
  if (error) {
    return { success: false, fieldErrors: {}, formError: "商品の保存に失敗しました。通信状態を確認して、もう一度お試しください" };
  }

  if (v.defaultOrderType === "stock" && v.initialStock && v.initialStock > 0) {
    const { data: wh, error: whErr } = await supabase
      .from("warehouse")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (whErr || !wh) {
      return {
        success: false,
        fieldErrors: {},
        formError:
          "倉庫が登録されていません。先に倉庫を作成してから商品を登録してください。",
      };
    }
    const { error: stErr } = await supabase.from("product_stock").insert({
      product_code: code,
      warehouse_id: wh.id,
      quantity_on_hand: v.initialStock,
    });
    if (stErr) {
      return { success: false, fieldErrors: {}, formError: "初期在庫の登録に失敗しました。通信状態を確認して、もう一度お試しください" };
    }
  }

  revalidatePath("/products");
  redirect("/products");
}

export async function updateProduct(
  productCode: string,
  _prev: ProductActionResult | null,
  formData: FormData
): Promise<ProductActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = productFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("product")
    .update({
      name: v.name,
      jan_code: v.janCode || null,
      units_per_case: v.unitsPerCase,
      default_sales_unit_price: v.defaultSalesUnitPrice,
      default_purchase_unit_price:
        v.defaultPurchaseUnitPrice === null ||
        v.defaultPurchaseUnitPrice === undefined
          ? null
          : v.defaultPurchaseUnitPrice,
      default_tax_rate: v.defaultTaxRate,
      default_order_type: v.defaultOrderType,
      is_stocked: v.defaultOrderType === "stock",
      updated_at: new Date().toISOString(),
    })
    .eq("product_code", productCode);
  if (error) {
    return { success: false, fieldErrors: {}, formError: "商品情報の更新に失敗しました。通信状態を確認して、もう一度お試しください" };
  }
  revalidatePath("/products");
  revalidatePath(`/products/${productCode}/edit`);
  redirect("/products");
}
