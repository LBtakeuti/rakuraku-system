"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { FieldGroup } from "@/components/forms/field-group";
import { TextInput } from "@/components/forms/text-input";
import { SelectField } from "@/components/forms/select";
import { RankPicker } from "@/components/forms/rank-picker";
import { RadioGroupField } from "@/components/forms/radio-group";
import { InvoiceFormatCard } from "@/components/forms/invoice-format-card";
import { StepIndicator } from "@/components/forms/step-indicator";
import type { StaffOption } from "@/lib/supabase/queries/customer";
import type { CustomerRow } from "@/types/customer";
import {
  CLOSING_DAY_OPTIONS,
  PAYMENT_CYCLE_OPTIONS,
  STATUS_LABEL,
  INVOICE_TAX_TYPE_LABEL,
  TAX_ROUNDING_LABEL,
} from "@/types/customer";
import type { CustomerActionResult } from "./actions";
import {
  customerFormSchema,
  isStep1Valid,
  isStep2Valid,
  type CustomerFormValues,
} from "@/lib/validations/customer";
import { cn } from "@/lib/utils";

type CustomerFormProps = {
  mode: "create" | "edit";
  initial?: CustomerRow | null;
  staffOptions: StaffOption[];
  action: (
    prev: CustomerActionResult | null,
    formData: FormData
  ) => Promise<CustomerActionResult>;
};

function defaultValues(initial?: CustomerRow | null): CustomerFormValues {
  return {
    customerCode: initial?.customerCode ?? "",
    name: initial?.name ?? "",
    nameKana: initial?.nameKana ?? "",
    rank: initial?.rank ?? "C",
    staffId: initial?.staffId ?? "",
    status: initial?.status ?? "active",
    postalCode: initial?.postalCode ?? "",
    address: initial?.address ?? "",
    building: initial?.building ?? "",
    phone: initial?.phone ?? "",
    fax: initial?.fax ?? "",
    contactPerson: initial?.contactPerson ?? "",
    email: initial?.email ?? "",
    invoiceFormat: initial?.invoiceFormat ?? "invoice_only",
    closingDay: initial?.closingDay ?? 31,
    paymentCycle: initial?.paymentCycle ?? "",
    invoiceTaxType: initial?.invoiceTaxType ?? "per_line",
    taxRounding: initial?.taxRounding ?? "floor",
  };
}

export function CustomerForm({
  mode,
  initial,
  staffOptions,
  action,
}: CustomerFormProps) {
  const [state, formAction] = useActionState<
    CustomerActionResult | null,
    FormData
  >(action, null);
  const [, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [values, setValues] = useState<CustomerFormValues>(defaultValues(initial));
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const fieldError = (key: keyof CustomerFormValues) =>
    clientErrors[key] ||
    (state && !state.ok ? state.fieldErrors[key]?.[0] : undefined);

  const update = <K extends keyof CustomerFormValues>(
    key: K,
    val: CustomerFormValues[K]
  ) => {
    setValues((v) => ({ ...v, [key]: val }));
    setClientErrors((e) => {
      const { [key]: _, ...rest } = e;
      void _;
      return rest;
    });
  };

  const validateStep1 = () => {
    const result = customerFormSchema
      .pick({
        name: true,
        nameKana: true,
        customerCode: true,
        rank: true,
        staffId: true,
        status: true,
      })
      .safeParse(values);
    if (result.success) {
      setClientErrors({});
      return true;
    }
    const errs: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !errs[key]) errs[key] = issue.message;
    }
    setClientErrors(errs);
    return false;
  };

  const validateStep2 = () => {
    const result = customerFormSchema
      .pick({
        postalCode: true,
        address: true,
        building: true,
        phone: true,
        fax: true,
        contactPerson: true,
        email: true,
      })
      .safeParse(values);
    if (result.success) {
      setClientErrors({});
      return true;
    }
    const errs: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !errs[key]) errs[key] = issue.message;
    }
    setClientErrors(errs);
    return false;
  };

  const goStep = (n: 1 | 2 | 3) => {
    if (n === 2 && !validateStep1()) return;
    if (n === 3 && (!isStep1Valid(values) || !validateStep2())) return;
    setStep(n);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    if (!isStep1Valid(values) || !isStep2Valid(values)) {
      e.preventDefault();
      if (!isStep1Valid(values)) {
        setStep(1);
        validateStep1();
      } else {
        setStep(2);
        validateStep2();
      }
      return;
    }
    e.preventDefault();
    const fd = new FormData(form);
    startTransition(() => formAction(fd));
  };

  const formError = state && !state.ok ? state.formError : undefined;

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="customerCode" value={values.customerCode ?? ""} />
      <input type="hidden" name="name" value={values.name} />
      <input type="hidden" name="nameKana" value={values.nameKana ?? ""} />
      <input type="hidden" name="rank" value={values.rank} />
      <input type="hidden" name="staffId" value={values.staffId ?? ""} />
      <input type="hidden" name="status" value={values.status} />
      <input type="hidden" name="postalCode" value={values.postalCode ?? ""} />
      <input type="hidden" name="address" value={values.address} />
      <input type="hidden" name="building" value={values.building ?? ""} />
      <input type="hidden" name="phone" value={values.phone} />
      <input type="hidden" name="fax" value={values.fax ?? ""} />
      <input type="hidden" name="contactPerson" value={values.contactPerson ?? ""} />
      <input type="hidden" name="email" value={values.email ?? ""} />
      <input type="hidden" name="invoiceFormat" value={values.invoiceFormat} />
      <input type="hidden" name="closingDay" value={String(values.closingDay)} />
      <input type="hidden" name="paymentCycle" value={values.paymentCycle ?? ""} />
      <input type="hidden" name="invoiceTaxType" value={values.invoiceTaxType} />
      <input type="hidden" name="taxRounding" value={values.taxRounding} />

      <div className="mb-8 flex justify-center">
        <StepIndicator
          current={step}
          steps={[
            { num: 1, label: "基本情報" },
            { num: 2, label: "連絡先" },
            { num: 3, label: "請求の設定" },
          ]}
        />
      </div>

      {formError && (
        <div className="mb-6 rounded-xl border border-danger bg-danger-light px-4 py-3 text-[14px] font-semibold text-danger">
          {formError}
        </div>
      )}

      <div
        className={cn(
          "rounded-2xl border border-border-light bg-bg-surface p-8 shadow-[0_2px_6px_rgba(15,23,42,0.06)]",
          step !== 1 && "hidden"
        )}
      >
        <div className="mb-2 text-xl font-bold text-text-primary">
          まずはお客様の名前を教えてください
        </div>
        <div className="mb-6 text-[13px] text-text-secondary">
          <span className="font-semibold text-danger">赤い印</span>
          がついている項目は必ず入力してください。
        </div>

        <FieldGroup label="お客様の名前" required help="会社名や店舗名を入力してください。例: 株式会社サンプル" error={fieldError("name")}>
          <TextInput
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="株式会社サンプル"
            invalid={!!fieldError("name")}
          />
        </FieldGroup>

        <FieldGroup label="フリガナ" optional help="カタカナで入力してください。検索のときに使えます。" error={fieldError("nameKana")}>
          <TextInput
            value={values.nameKana ?? ""}
            onChange={(e) => update("nameKana", e.target.value)}
            placeholder="カブシキガイシャサンプル"
            invalid={!!fieldError("nameKana")}
          />
        </FieldGroup>

        {mode === "create" && (
          <FieldGroup
            label="お客様コード"
            optional
            optionalLabel="空欄でOK"
            help="空欄のままにすると、自動でコードが付けられます。"
            error={fieldError("customerCode")}
          >
            <TextInput
              value={values.customerCode ?? ""}
              onChange={(e) => update("customerCode", e.target.value)}
              placeholder="自動で付けられます"
              className="max-w-[280px]"
              invalid={!!fieldError("customerCode")}
            />
          </FieldGroup>
        )}

        <FieldGroup label="お客様のランク" required help="取引の重要度に応じて選んでください。あとから変更できます。" error={fieldError("rank")}>
          <RankPicker value={values.rank} onChange={(r) => update("rank", r)} />
        </FieldGroup>

        <FieldGroup label="担当者" required help="このお客様の担当をする社員を選んでください。" error={fieldError("staffId")}>
          <SelectField
            value={values.staffId ?? ""}
            onChange={(e) => update("staffId", e.target.value)}
            className="max-w-[320px]"
            invalid={!!fieldError("staffId")}
          >
            <option value="">選択してください</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        </FieldGroup>

        <FieldGroup label="取引の状態" required help="普通は「取引中」を選んでください。" error={fieldError("status")}>
          <RadioGroupField
            name="statusRadio"
            value={values.status}
            onChange={(v) => update("status", v)}
            options={[
              { value: "active", label: STATUS_LABEL.active },
              { value: "paused", label: STATUS_LABEL.paused },
              { value: "closed", label: STATUS_LABEL.closed },
            ]}
          />
        </FieldGroup>

        <div className="mt-8 flex items-center justify-between">
          <Link
            href="/customers"
            className="inline-flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-6 py-3 text-[15px] font-bold text-text-primary transition-colors hover:bg-bg-muted"
          >
            キャンセル
          </Link>
          <button
            type="button"
            onClick={() => goStep(2)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-[15px] font-bold text-white shadow-[0_2px_6px_rgba(15,23,42,0.06)] transition-colors hover:bg-primary-hover"
          >
            次へ進む（連絡先の入力）
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "rounded-2xl border border-border-light bg-bg-surface p-8 shadow-[0_2px_6px_rgba(15,23,42,0.06)]",
          step !== 2 && "hidden"
        )}
      >
        <div className="mb-2 text-xl font-bold text-text-primary">
          お客様の連絡先を入力してください
        </div>
        <div className="mb-6 text-[13px] text-text-secondary">
          住所は請求書や発注書にそのまま印刷されます。正確に入力してください。
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr]">
          <FieldGroup label="郵便番号" optional help="ハイフンあり" error={fieldError("postalCode")}>
            <TextInput
              value={values.postalCode ?? ""}
              onChange={(e) => update("postalCode", e.target.value)}
              placeholder="123-4567"
              invalid={!!fieldError("postalCode")}
            />
          </FieldGroup>
          <FieldGroup label="住所" required error={fieldError("address")}>
            <TextInput
              value={values.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="東京都〇〇区〇〇 1-2-3"
              invalid={!!fieldError("address")}
            />
          </FieldGroup>
        </div>

        <FieldGroup label="建物・部屋番号" optional error={fieldError("building")}>
          <TextInput
            value={values.building ?? ""}
            onChange={(e) => update("building", e.target.value)}
            placeholder="〇〇ビル 4階"
          />
        </FieldGroup>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup label="電話番号" required help="例: 03-1234-5678" error={fieldError("phone")}>
            <TextInput
              value={values.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="03-1234-5678"
              invalid={!!fieldError("phone")}
            />
          </FieldGroup>
          <FieldGroup label="FAX番号" optional error={fieldError("fax")}>
            <TextInput
              value={values.fax ?? ""}
              onChange={(e) => update("fax", e.target.value)}
              placeholder="03-1234-5679"
            />
          </FieldGroup>
        </div>

        <FieldGroup label="先方担当者" optional error={fieldError("contactPerson")}>
          <TextInput
            value={values.contactPerson ?? ""}
            onChange={(e) => update("contactPerson", e.target.value)}
            placeholder="例: 鈴木 一郎"
            className="max-w-[320px]"
          />
        </FieldGroup>

        <FieldGroup label="メールアドレス" optional error={fieldError("email")}>
          <TextInput
            type="email"
            value={values.email ?? ""}
            onChange={(e) => update("email", e.target.value)}
            placeholder="example@sample.co.jp"
            invalid={!!fieldError("email")}
          />
        </FieldGroup>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => goStep(1)}
            className="inline-flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-6 py-3 text-[15px] font-bold text-text-primary transition-colors hover:bg-bg-muted"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
            前に戻る
          </button>
          <button
            type="button"
            onClick={() => goStep(3)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-[15px] font-bold text-white shadow-[0_2px_6px_rgba(15,23,42,0.06)] transition-colors hover:bg-primary-hover"
          >
            次へ進む（請求の設定）
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "rounded-2xl border border-border-light bg-bg-surface p-8 shadow-[0_2px_6px_rgba(15,23,42,0.06)]",
          step !== 3 && "hidden"
        )}
      >
        <div className="mb-2 text-xl font-bold text-text-primary">
          請求書の出し方を決めてください
        </div>
        <div className="mb-6 text-[13px] leading-[1.5] text-text-secondary">
          ここで決めた内容にそって、毎月の請求書が自動で作られます。
          <br />
          お客様によって請求書の形式や締め日が違うので、間違えないように選んでください。
        </div>

        <FieldGroup label="請求書の種類" required help="このお客様にどの形式の請求書を送るか選んでください。" error={fieldError("invoiceFormat")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InvoiceFormatCard
              variant="invoice_only"
              selected={values.invoiceFormat === "invoice_only"}
              onSelect={() => update("invoiceFormat", "invoice_only")}
              title="請求書のみ"
              description="請求書を1枚だけ発行します。納品の明細は請求書の中に載ります。"
            />
            <InvoiceFormatCard
              variant="invoice_delivery"
              selected={values.invoiceFormat === "invoice_delivery"}
              onSelect={() => update("invoiceFormat", "invoice_delivery")}
              title="請求書＋納品書"
              description="1枚の用紙に請求書と納品書を上下に印刷します。納品書も必要なお客様向け。"
            />
          </div>
        </FieldGroup>

        <FieldGroup
          label="締め日"
          required
          help={
            <>
              毎月いつまでの売上を1回分の請求にまとめるかを決めます。
              <br />
              例:「20日締め」なら、前月21日〜当月20日の売上が1枚の請求書になります。
            </>
          }
          error={fieldError("closingDay")}
        >
          <SelectField
            value={String(values.closingDay)}
            onChange={(e) => update("closingDay", Number(e.target.value))}
            className="max-w-[320px]"
            invalid={!!fieldError("closingDay")}
          >
            {CLOSING_DAY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
        </FieldGroup>

        <FieldGroup label="お支払い予定" optional help="請求書を出してから、いつ入金される予定かを選びます。" error={fieldError("paymentCycle")}>
          <SelectField
            value={values.paymentCycle ?? ""}
            onChange={(e) => update("paymentCycle", e.target.value)}
            className="max-w-[320px]"
          >
            <option value="">選択してください</option>
            {PAYMENT_CYCLE_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </SelectField>
        </FieldGroup>

        <FieldGroup
          label="消費税の計算方法"
          required
          help="消費税をどのタイミングで計算するかです。わからない場合は「明細ごと」を選んでください。"
          error={fieldError("invoiceTaxType")}
        >
          <RadioGroupField
            name="taxTypeRadio"
            value={values.invoiceTaxType}
            onChange={(v) => update("invoiceTaxType", v)}
            options={[
              { value: "per_line", label: INVOICE_TAX_TYPE_LABEL.per_line },
              { value: "per_voucher", label: INVOICE_TAX_TYPE_LABEL.per_voucher },
              { value: "per_invoice", label: INVOICE_TAX_TYPE_LABEL.per_invoice },
            ]}
          />
        </FieldGroup>

        <FieldGroup label="消費税の端数" required help="消費税で1円未満が出たときの扱いです。" error={fieldError("taxRounding")}>
          <RadioGroupField
            name="taxRoundingRadio"
            value={values.taxRounding}
            onChange={(v) => update("taxRounding", v)}
            options={[
              { value: "floor", label: TAX_ROUNDING_LABEL.floor },
              { value: "round", label: TAX_ROUNDING_LABEL.round },
              { value: "ceil", label: TAX_ROUNDING_LABEL.ceil },
            ]}
          />
        </FieldGroup>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => goStep(2)}
            className="inline-flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-6 py-3 text-[15px] font-bold text-text-primary transition-colors hover:bg-bg-muted"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
            前に戻る
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-success px-6 py-3 text-[15px] font-bold text-white shadow-[0_2px_6px_rgba(5,150,105,0.25)] transition-colors hover:bg-success/90"
          >
            <Check className="h-5 w-5" strokeWidth={2.5} />
            {mode === "create" ? "この内容でお客様を登録する" : "この内容で保存する"}
          </button>
        </div>
      </div>
    </form>
  );
}
