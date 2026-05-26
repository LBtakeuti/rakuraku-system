"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ArrowLeftRight, FileText, PackagePlus } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/common/badge";
import {
  receivingFormSchema,
  type ReceivingFormValues,
} from "@/lib/validations/receiving";
import { confirmReceiving, type ReceivingActionResult } from "./actions";
import type { PurchaseOrderDetail } from "@/types/purchase-order";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(iso: string | null): string {
  return iso ? iso.replaceAll("-", "/") : "—";
}

function formatYen(v: number): string {
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

type ReceivingFormProps = {
  po: PurchaseOrderDetail;
};

export function ReceivingForm({ po }: ReceivingFormProps) {
  const [state, formAction] = useActionState<
    ReceivingActionResult | null,
    FormData
  >(confirmReceiving, null);
  const [, startTransition] = useTransition();
  const [receivedAt, setReceivedAt] = useState(todayIso());

  const form = useForm<ReceivingFormValues>({
    resolver: zodResolver(receivingFormSchema),
    mode: "onSubmit",
    defaultValues: {
      purchaseOrderId: po.id,
      receivedAt: todayIso(),
      lines: po.lines.map((l) => ({
        purchaseOrderLineId: l.id,
        productCode: l.productCode,
        productName: l.productName,
        quantity: Math.max(0, l.quantity - l.receivedQuantity),
        lotNo: "",
        expiryDate: "",
        isLotManaged: l.isLotManaged,
        note: "",
      })),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const onValid = (values: ReceivingFormValues) => {
    const payload = {
      ...values,
      receivedAt,
      lines: values.lines.map((l) => ({
        ...l,
        quantity: Number(l.quantity) || 0,
      })),
    };
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    startTransition(() => formAction(fd));
  };

  const formError = state && !state.success ? state.formError : undefined;
  const fieldErrors =
    state && !state.success
      ? Object.values(state.fieldErrors).flatMap((e) => e ?? [])
      : [];
  const clientErrorMessages: string[] = [];
  if (form.formState.errors.lines?.message) {
    if (typeof form.formState.errors.lines.message === "string") {
      clientErrorMessages.push(form.formState.errors.lines.message);
    }
  }
  (form.formState.errors.lines as unknown as { [key: string]: unknown }[] | undefined)?.forEach(
    (entry) => {
      if (!entry) return;
      Object.values(entry).forEach((field) => {
        const message = (field as { message?: string })?.message;
        if (typeof message === "string") clientErrorMessages.push(message);
      });
    }
  );

  const allErrors = Array.from(
    new Set(
      [...clientErrorMessages, ...fieldErrors, formError].filter(
        (e): e is string => !!e
      )
    )
  );

  const watchedLines = form.watch("lines") ?? [];
  const totalReceiving = watchedLines.reduce(
    (acc, l) => acc + (Number(l.quantity) || 0),
    0
  );
  const totalRemaining = po.lines.reduce(
    (acc, l) => acc + Math.max(0, l.quantity - l.receivedQuantity),
    0
  );
  const linesWithReceiving = watchedLines.filter(
    (l) => (Number(l.quantity) || 0) > 0
  ).length;

  return (
    <form onSubmit={form.handleSubmit(onValid)}>
      {allErrors.length > 0 && (
        <div className="mb-6 rounded-xl border border-danger bg-danger-light px-4 py-3 text-[14px] font-semibold text-danger">
          <ul className="list-disc pl-5">
            {allErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="mb-6 flex items-center gap-4 rounded-2xl border border-info bg-info-light px-5 py-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-info text-white">
          <PackagePlus className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <div>
          <div className="mb-1 text-[15px] font-bold text-info">
            仕入先からの納品書を見ながら、入荷した数量を入力してください
          </div>
          <div className="text-[13px] leading-[1.6] text-info/90">
            賞味期限のある商品は、ロット番号と賞味期限も入力します。分納の場合（全部届いていない場合）は、届いた分だけ入力してください。残りはあとで追加できます。
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-border-light bg-bg-surface p-6 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary">
              <FileText className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <div className="text-[13px] text-text-secondary">入荷する発注書</div>
              <div className="font-mono tabular-nums text-[18px] font-bold">
                {po.purchaseOrderNo}（{po.supplierName}）
              </div>
            </div>
          </div>
          <Link
            href="/receivings"
            className="inline-flex items-center gap-2 rounded-lg border border-border-default px-4 py-2 text-[13px] font-semibold text-text-primary transition-colors hover:bg-bg-muted"
          >
            <ArrowLeftRight className="h-4 w-4" strokeWidth={2} />
            別の発注書を選ぶ
          </Link>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-[14px] sm:grid-cols-4">
          <div>
            <dt className="text-text-secondary">発注日</dt>
            <dd className="font-mono tabular-nums">{formatDate(po.orderDate)}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">入荷予定日</dt>
            <dd className="font-mono tabular-nums">
              {formatDate(po.expectedDeliveryDate)}
            </dd>
          </div>
          <div>
            <dt className="text-text-secondary">合計金額(税込)</dt>
            <dd className="font-mono tabular-nums">{formatYen(po.totalAmount)}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">これまでの入荷</dt>
            <dd className="font-mono tabular-nums">
              {po.receivedQuantity.toLocaleString("ja-JP")} /{" "}
              {po.totalQuantity.toLocaleString("ja-JP")} 個
            </dd>
          </div>
        </dl>
      </section>

      <section className="mb-8 rounded-2xl border border-border-light bg-bg-surface p-6 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-white">
            1
          </div>
          <h2 className="text-[18px] font-bold text-text-primary">
            届いた商品と数量を入力してください
          </h2>
        </div>
        <p className="mb-6 text-[13px] text-text-secondary">
          商品の右側に「
          <span className="font-bold text-warning">期限管理</span>
          」マークがある場合は、ロット番号と賞味期限も入れてください。
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-text-secondary">
              入荷日
            </div>
            <input
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {fields.map((field, idx) => {
            const line = po.lines[idx];
            const remaining = Math.max(0, line.quantity - line.receivedQuantity);
            return (
              <div
                key={field.id}
                className="rounded-xl border border-border-light bg-bg-surface p-4"
              >
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-bold text-text-primary">
                      {line.productName}
                    </div>
                    <div className="text-[12px] text-text-muted">
                      {line.productCode}・発注 {line.quantity.toLocaleString("ja-JP")} 個・残 {remaining.toLocaleString("ja-JP")} 個
                    </div>
                  </div>
                  {line.isLotManaged && (
                    <Badge variant="default" className="bg-warning-light text-warning">
                      期限管理
                    </Badge>
                  )}
                </div>
                <div
                  className={
                    line.isLotManaged
                      ? "grid grid-cols-1 gap-3 sm:grid-cols-4"
                      : "grid grid-cols-1 gap-3 sm:grid-cols-2"
                  }
                >
                  <div>
                    <div className="mb-1 text-[13px] font-semibold text-text-secondary">
                      入荷数量
                    </div>
                    <input
                      type="number"
                      min={0}
                      {...form.register(`lines.${idx}.quantity`)}
                      className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3 py-2.5 text-right font-mono tabular-nums text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  {line.isLotManaged && (
                    <>
                      <div>
                        <div className="mb-1 text-[13px] font-semibold text-text-secondary">
                          ロット番号
                        </div>
                        <input
                          type="text"
                          placeholder="自動採番されます"
                          {...form.register(`lines.${idx}.lotNo`)}
                          className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <div className="mb-1 text-[13px] font-semibold text-text-secondary">
                          賞味期限
                        </div>
                        <input
                          type="date"
                          {...form.register(`lines.${idx}.expiryDate`)}
                          className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <div className="mb-1 text-[13px] font-semibold text-text-secondary">
                      メモ（任意）
                    </div>
                    <input
                      type="text"
                      {...form.register(`lines.${idx}.note`)}
                      className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-6 rounded-xl bg-text-primary px-5 py-4 text-[14px] text-white">
        入荷登録する商品{" "}
        <strong className="text-[18px] font-bold text-[#93c5fd]">
          {linesWithReceiving}件
        </strong>
        （合計{" "}
        <strong className="text-[18px] font-bold text-[#93c5fd]">
          {totalReceiving.toLocaleString("ja-JP")}個
        </strong>{" "}
        / 残り{" "}
        <strong className="text-[18px] font-bold text-[#93c5fd]">
          {Math.max(0, totalRemaining - totalReceiving).toLocaleString("ja-JP")}個
        </strong>{" "}
        は次回入荷予定）
      </section>

      <div className="flex items-center justify-between">
        <Link
          href="/purchase-orders"
          className="inline-flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-6 py-3 text-[15px] font-bold text-text-primary transition-colors hover:bg-bg-muted"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-success px-6 py-3 text-[15px] font-bold text-white shadow-[0_2px_6px_rgba(5,150,105,0.25)] transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Check className="h-5 w-5" strokeWidth={2.5} />
          この内容で入荷を確定する
        </button>
      </div>

      <input type="hidden" {...form.register("purchaseOrderId")} value={po.id} />
      <input type="hidden" {...form.register("receivedAt")} value={receivedAt} />
    </form>
  );
}
