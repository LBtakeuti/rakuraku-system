"use client";

import { useActionState, useTransition } from "react";
import type { CompanySetting } from "@/types/company-setting";
import { updateCompanySetting, type SettingsActionResult } from "./actions";
import { Button } from "@/components/ui/button";

type SettingsFormProps = {
  initial: CompanySetting;
};

export function SettingsForm({ initial }: SettingsFormProps) {
  const [state, formAction] = useActionState<SettingsActionResult | null, FormData>(
    updateCompanySetting,
    null
  );
  const [isPending, startTransition] = useTransition();

  const formError = state && !state.success ? state.formError : undefined;
  const successMessage = state?.success ? "設定を保存しました" : undefined;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };

  return (
    <form onSubmit={handleSubmit}>
      <section className="rounded-2xl border border-border-light bg-bg-surface p-6 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <h2 className="mb-5 text-[18px] font-bold text-text-primary">
          会社情報
        </h2>

        {formError && (
          <div className="mb-5 rounded-xl border border-danger bg-danger-light px-4 py-3 text-[14px] font-semibold text-danger">
            {formError}
          </div>
        )}
        {successMessage && (
          <div className="mb-5 rounded-xl border border-success bg-success-light px-4 py-3 text-[14px] font-semibold text-success">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[13px] font-semibold text-text-secondary">
              会社名
              <span className="ml-2 inline-block rounded bg-danger px-1.5 py-0.5 text-[11px] font-bold text-white">
                必須
              </span>
            </label>
            <input
              name="companyName"
              defaultValue={initial.companyName}
              required
              className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[13px] font-semibold text-text-secondary">
              登録番号（インボイス制度）
              <span className="ml-2 inline-block rounded bg-danger px-1.5 py-0.5 text-[11px] font-bold text-white">
                必須
              </span>
            </label>
            <input
              name="registrationNo"
              defaultValue={initial.registrationNo}
              required
              placeholder="例: T6011801020915"
              className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-text-secondary">
              郵便番号
              <span className="ml-2 inline-block rounded bg-danger px-1.5 py-0.5 text-[11px] font-bold text-white">
                必須
              </span>
            </label>
            <input
              name="postalCode"
              defaultValue={initial.postalCode}
              required
              placeholder="例: 121-0831"
              className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-text-secondary">
              電話番号
              <span className="ml-2 inline-block rounded bg-danger px-1.5 py-0.5 text-[11px] font-bold text-white">
                必須
              </span>
            </label>
            <input
              name="tel"
              defaultValue={initial.tel}
              required
              placeholder="例: 03-5856-8263"
              className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[13px] font-semibold text-text-secondary">
              住所
              <span className="ml-2 inline-block rounded bg-danger px-1.5 py-0.5 text-[11px] font-bold text-white">
                必須
              </span>
            </label>
            <input
              name="address"
              defaultValue={initial.address}
              required
              placeholder="例: 東京都足立区舎人5-16-10"
              className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-text-secondary">
              FAX番号
              <span className="ml-2 inline-block rounded bg-text-muted px-1.5 py-0.5 text-[11px] font-bold text-white">
                任意
              </span>
            </label>
            <input
              name="fax"
              defaultValue={initial.fax ?? ""}
              placeholder="例: 03-5856-8273"
              className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[13px] font-semibold text-text-secondary">
              振込先情報
              <span className="ml-2 inline-block rounded bg-danger px-1.5 py-0.5 text-[11px] font-bold text-white">
                必須
              </span>
            </label>
            <input
              name="bankInfo"
              defaultValue={initial.bankInfo}
              required
              placeholder="例: 三菱UFJ銀行/千住支店 普通預金 4814091"
              className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "保存中..." : "設定を保存する"}
          </Button>
        </div>
      </section>
    </form>
  );
}
