"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { FieldGroup } from "@/components/forms/field-group";
import { TextInput } from "@/components/forms/text-input";
import { OptionCard } from "@/components/forms/option-card";
import type { ProductRow } from "@/types/product";
import { ORDER_TYPE_DESCRIPTION } from "@/types/product";
import type { ProductActionResult } from "./actions";
import {
  productFormSchema,
  type ProductFormValues,
} from "@/lib/validations/product";
import { cn } from "@/lib/utils";

type ProductFormProps = {
  mode: "create" | "edit";
  initial?: ProductRow | null;
  action: (
    prev: ProductActionResult | null,
    formData: FormData
  ) => Promise<ProductActionResult>;
};

function defaultValues(initial?: ProductRow | null): ProductFormValues {
  return {
    productCode: initial?.productCode ?? "",
    name: initial?.name ?? "",
    janCode: initial?.janCode ?? "",
    unitsPerCase: initial?.unitsPerCase ?? 1,
    defaultSalesUnitPrice: initial?.defaultSalesUnitPrice ?? 0,
    defaultPurchaseUnitPrice: initial?.defaultPurchaseUnitPrice ?? null,
    defaultTaxRate: initial?.defaultTaxRate ?? 0.1,
    defaultOrderType: initial?.defaultOrderType ?? "order_at_sale",
    initialStock: 0,
  };
}

export function ProductForm({ mode, initial, action }: ProductFormProps) {
  const [state, formAction] = useActionState<
    ProductActionResult | null,
    FormData
  >(action, null);
  const [, startTransition] = useTransition();
  const [values, setValues] = useState<ProductFormValues>(defaultValues(initial));
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const fieldError = (key: keyof ProductFormValues) =>
    clientErrors[key] ||
    (state && !state.ok ? state.fieldErrors[key]?.[0] : undefined);

  const update = <K extends keyof ProductFormValues>(
    key: K,
    val: ProductFormValues[K]
  ) => {
    setValues((v) => ({ ...v, [key]: val }));
    setClientErrors((e) => {
      const { [key]: _, ...rest } = e;
      void _;
      return rest;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const result = productFormSchema.safeParse(values);
    if (!result.success) {
      e.preventDefault();
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !errs[key]) errs[key] = issue.message;
      }
      setClientErrors(errs);
      return;
    }
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };

  const formError = state && !state.ok ? state.formError : undefined;
  const showStock = values.defaultOrderType === "stock";

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="productCode" value={values.productCode ?? ""} />
      <input type="hidden" name="name" value={values.name} />
      <input type="hidden" name="janCode" value={values.janCode ?? ""} />
      <input type="hidden" name="unitsPerCase" value={String(values.unitsPerCase)} />
      <input
        type="hidden"
        name="defaultSalesUnitPrice"
        value={String(values.defaultSalesUnitPrice)}
      />
      <input
        type="hidden"
        name="defaultPurchaseUnitPrice"
        value={
          values.defaultPurchaseUnitPrice === null ||
          values.defaultPurchaseUnitPrice === undefined
            ? ""
            : String(values.defaultPurchaseUnitPrice)
        }
      />
      <input type="hidden" name="defaultTaxRate" value={String(values.defaultTaxRate)} />
      <input type="hidden" name="defaultOrderType" value={values.defaultOrderType} />
      <input type="hidden" name="initialStock" value={String(values.initialStock ?? 0)} />

      {formError && (
        <div className="mb-6 rounded-xl border border-danger bg-danger-light px-4 py-3 text-[14px] font-semibold text-danger">
          {formError}
        </div>
      )}

      <div className="rounded-2xl border border-border-light bg-bg-surface p-8 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <section className="mb-10">
          <h2 className="mb-2 text-xl font-bold text-text-primary">
            商品の名前と番号
          </h2>
          <p className="mb-6 text-[13px] text-text-secondary">
            <span className="font-semibold text-danger">赤い印</span>
            がついている項目は必ず入力してください。
          </p>

          <FieldGroup
            label="商品の名前"
            required
            help="商品名を入力してください。例: RR-03 フローリングシートミント 20枚入"
            error={fieldError("name")}
          >
            <TextInput
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="商品の名前を入力"
              invalid={!!fieldError("name")}
            />
          </FieldGroup>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {mode === "create" && (
              <FieldGroup
                label="商品コード"
                optional
                optionalLabel="空欄でOK"
                help="空欄なら自動で付けられます。"
                error={fieldError("productCode")}
              >
                <TextInput
                  value={values.productCode ?? ""}
                  onChange={(e) => update("productCode", e.target.value)}
                  placeholder="自動で付けられます"
                  invalid={!!fieldError("productCode")}
                />
              </FieldGroup>
            )}
            <FieldGroup
              label="JANコード（バーコード）"
              optional
              help="バーコードがあれば入力。"
              error={fieldError("janCode")}
            >
              <TextInput
                value={values.janCode ?? ""}
                onChange={(e) => update("janCode", e.target.value)}
                placeholder="例: 4589890530539"
                invalid={!!fieldError("janCode")}
              />
            </FieldGroup>
          </div>
        </section>

        <section className="mb-10 border-t border-border-light pt-10">
          <h2 className="mb-2 text-xl font-bold text-text-primary">単価と税率</h2>
          <p className="mb-6 text-[13px] text-text-secondary">
            注文を受けるときに自動で入る金額です。あとから個別に変更もできます。
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup
              label="売上単価（お客様への販売価格）"
              required
              error={fieldError("defaultSalesUnitPrice")}
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] font-bold text-text-secondary">
                  ¥
                </span>
                <TextInput
                  type="number"
                  min={0}
                  value={String(values.defaultSalesUnitPrice ?? 0)}
                  onChange={(e) =>
                    update(
                      "defaultSalesUnitPrice",
                      e.target.value === "" ? 0 : Number(e.target.value)
                    )
                  }
                  className="pl-8"
                  invalid={!!fieldError("defaultSalesUnitPrice")}
                />
              </div>
            </FieldGroup>
            <FieldGroup label="仕入単価（仕入れ値）" optional error={fieldError("defaultPurchaseUnitPrice")}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] font-bold text-text-secondary">
                  ¥
                </span>
                <TextInput
                  type="number"
                  min={0}
                  value={
                    values.defaultPurchaseUnitPrice === null ||
                    values.defaultPurchaseUnitPrice === undefined
                      ? ""
                      : String(values.defaultPurchaseUnitPrice)
                  }
                  onChange={(e) =>
                    update(
                      "defaultPurchaseUnitPrice",
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  className="pl-8"
                />
              </div>
            </FieldGroup>
          </div>

          <FieldGroup
            label="税率"
            required
            help="食品など軽減税率の対象は8%、それ以外は10%です。"
            error={fieldError("defaultTaxRate")}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <OptionCard
                selected={values.defaultTaxRate === 0.1}
                onSelect={() => update("defaultTaxRate", 0.1)}
                title="10%"
                description="通常の商品（雑貨・日用品など）"
              />
              <OptionCard
                selected={values.defaultTaxRate === 0.08}
                onSelect={() => update("defaultTaxRate", 0.08)}
                title="8%"
                description="軽減税率の商品（食品など）"
              />
            </div>
          </FieldGroup>

          <FieldGroup
            label="入数（1ケースに何個入っているか）"
            optional
            help="ケース単位で扱う商品の場合に入力してください。"
            error={fieldError("unitsPerCase")}
          >
            <div className="relative max-w-[240px]">
              <TextInput
                type="number"
                min={1}
                value={String(values.unitsPerCase)}
                onChange={(e) =>
                  update("unitsPerCase", Number(e.target.value || 1))
                }
                className="pr-24"
                invalid={!!fieldError("unitsPerCase")}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-text-secondary">
                個 / ケース
              </span>
            </div>
          </FieldGroup>
        </section>

        <section className="border-t border-border-light pt-10">
          <h2 className="mb-2 text-xl font-bold text-text-primary">
            仕入と在庫の方法
          </h2>
          <p className="mb-6 text-[13px] text-text-secondary">
            この商品をどう取り扱うかを選んでください。
          </p>

          <FieldGroup label="仕入方法" required error={fieldError("defaultOrderType")}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <OptionCard
                selected={values.defaultOrderType === "order_at_sale"}
                onSelect={() => update("defaultOrderType", "order_at_sale")}
                title="注文時に発注する"
                description={ORDER_TYPE_DESCRIPTION.order_at_sale}
              />
              <OptionCard
                selected={values.defaultOrderType === "manual_order"}
                onSelect={() => update("defaultOrderType", "manual_order")}
                title="注文時に手動で発注"
                description={ORDER_TYPE_DESCRIPTION.manual_order}
              />
              <OptionCard
                selected={values.defaultOrderType === "stock"}
                onSelect={() => update("defaultOrderType", "stock")}
                title="在庫から出荷する"
                description={ORDER_TYPE_DESCRIPTION.stock}
              />
            </div>
          </FieldGroup>

          {showStock && mode === "create" && (
            <FieldGroup label="現在の在庫数" optional error={fieldError("initialStock")}>
              <div className="relative max-w-[240px]">
                <TextInput
                  type="number"
                  min={0}
                  value={String(values.initialStock ?? 0)}
                  onChange={(e) =>
                    update("initialStock", Number(e.target.value || 0))
                  }
                  className="pr-12"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-text-secondary">
                  個
                </span>
              </div>
            </FieldGroup>
          )}
          {showStock && mode === "edit" && (
            <FieldGroup label="現在の在庫数" optional>
              <div className="text-[15px] font-semibold text-text-primary">
                {initial?.totalStock ?? 0} 個
              </div>
              <p className="text-[13px] text-text-secondary">
                ※在庫数は「入荷を登録する」画面から増減します。
              </p>
            </FieldGroup>
          )}
        </section>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Link
          href="/products"
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-6 py-3 text-[15px] font-bold text-text-primary transition-colors hover:bg-bg-muted"
          )}
        >
          キャンセル
        </Link>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-[15px] font-bold text-white shadow-[0_2px_6px_rgba(15,23,42,0.06)] transition-colors hover:bg-primary-hover"
        >
          <Check className="h-5 w-5" strokeWidth={2.5} />
          {mode === "create" ? "この内容で商品を登録する" : "この内容で保存する"}
        </button>
      </div>
    </form>
  );
}
