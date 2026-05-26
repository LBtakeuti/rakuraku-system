"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Search as SearchIcon, FileText, Printer } from "lucide-react";
import {
  issueBillingStatements,
  type BillingActionResult,
} from "./actions";
import { CLOSING_DAY_OPTIONS } from "@/types/customer";
import type { BillingSummaryRow } from "@/types/billing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/common/print-button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

type BillingFormProps = {
  initialClosingDay: number;
  initialPeriodFrom: string;
  initialPeriodTo: string;
  summary: BillingSummaryRow[];
  hasAggregated: boolean;
};

function formatYen(v: number): string {
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

function formatDateShort(iso: string | null): string {
  if (!iso) return "—";
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BillingForm({
  initialClosingDay,
  initialPeriodFrom,
  initialPeriodTo,
  summary,
  hasAggregated,
}: BillingFormProps) {
  const [closingDay, setClosingDay] = useState(initialClosingDay);
  const [periodFrom, setPeriodFrom] = useState(initialPeriodFrom);
  const [periodTo, setPeriodTo] = useState(initialPeriodTo);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(summary.map((s) => s.customerCode))
  );
  const [state, formAction] = useActionState<BillingActionResult | null, FormData>(
    issueBillingStatements,
    null
  );
  const [, startTransition] = useTransition();

  const onAggregate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("closingDay", String(closingDay));
    params.set("periodFrom", periodFrom);
    params.set("periodTo", periodTo);
    startTransition(() => {
      window.location.href = `/billing?${params.toString()}`;
    });
  };

  const toggle = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === summary.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(summary.map((s) => s.customerCode)));
    }
  };

  const onIssueConfirmed = () => {
    const payload = {
      customerCodes: Array.from(selected),
      periodFrom,
      periodTo,
      closingDay,
    };
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    startTransition(() => formAction(fd));
  };

  const selectedSummary = summary.filter((s) => selected.has(s.customerCode));
  const grandTotal = selectedSummary.reduce((a, s) => a + s.totalDue, 0);
  const allSelected = summary.length > 0 && selected.size === summary.length;

  const formError = state && !state.success ? state.formError : undefined;
  const fieldErrors =
    state && !state.success
      ? Object.values(state.fieldErrors).flatMap((e) => e ?? [])
      : [];
  const allErrors = Array.from(
    new Set([...fieldErrors, formError].filter((e): e is string => !!e))
  );

  const todayLabel = todayIso();

  return (
    <div>
      {allErrors.length > 0 && (
        <div className="mb-6 rounded-xl border border-danger bg-danger-light px-4 py-3 text-[14px] font-semibold text-danger">
          <ul className="list-disc pl-5">
            {allErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="mb-6 flex items-center gap-4 rounded-2xl border border-[#d8b4fe] bg-[#f3e8ff] px-5 py-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#7e22ce] text-white">
          <FileText className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <div>
          <div className="mb-1 text-[15px] font-bold text-[#7e22ce]">
            月に一度の請求のお仕事です
          </div>
          <div className="text-[13px] leading-[1.6] text-[#6b21a8]">
            上から順に、1→2→3 と進めてください。まず締める期間を決めて、内容を確認し、最後に請求書を発行します。
          </div>
        </div>
      </section>

      <StepCard
        num={1}
        title="締める期間を決める"
        subtitle="いつからいつまでの納品分を請求するかを選びます"
        status={hasAggregated ? "done" : "active"}
      >
        <form
          onSubmit={onAggregate}
          className="grid grid-cols-1 gap-4 sm:grid-cols-4"
        >
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-text-secondary">
              締め日
            </div>
            <select
              value={closingDay}
              onChange={(e) => setClosingDay(Number(e.target.value))}
              className="w-full appearance-none rounded-[10px] border border-border-default bg-bg-surface px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {CLOSING_DAY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-text-secondary">
              対象期間 開始
            </div>
            <input
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-text-secondary">
              対象期間 終了（締め日）
            </div>
            <input
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[15px] font-bold text-white shadow-[0_2px_6px_rgba(15,23,42,0.06)] transition-colors hover:bg-primary-hover"
            >
              <SearchIcon className="h-5 w-5" strokeWidth={2.5} />
              この期間で集計する
            </button>
          </div>
        </form>

        {hasAggregated && (
          <div className="mt-4 flex flex-wrap gap-3">
            <SummaryPill
              label="対象のお客様"
              value={`${summary.length} 社`}
            />
            <SummaryPill
              label="売上伝票の枚数"
              value={`${summary.reduce((a, s) => a + s.invoiceIds.length, 0)} 枚`}
            />
            <SummaryPill
              label="今回の請求合計"
              value={formatYen(summary.reduce((a, s) => a + s.totalDue, 0))}
              money
            />
          </div>
        )}
      </StepCard>

      <StepCard
        num={2}
        title="請求の内容を確認する"
        subtitle="お客様ごとの請求金額です。おかしな数字がないか確認してください"
        status={
          hasAggregated && summary.length > 0
            ? "active"
            : hasAggregated
              ? "done"
              : "pending"
        }
        disabled={!hasAggregated}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[13px] text-text-secondary">
            締め対象の{" "}
            <strong className="font-bold text-text-primary">
              {summary.length}
            </strong>{" "}
            社
          </div>
          <PrintButton
            href={`/api/documents/billing-list?closingDay=${closingDay}&periodFrom=${periodFrom}&periodTo=${periodTo}`}
            label="請求一覧表を印刷する"
          />
        </div>
        {summary.length === 0 ? (
          <div className="rounded-xl bg-bg-muted px-5 py-10 text-center text-text-muted">
            {hasAggregated
              ? "対象期間に該当するお客様がいません。期間を変更してください。"
              : "上のステップで「集計する」を押すと、ここに対象お客様が一覧表示されます。"}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border-light bg-bg-surface">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-light bg-bg-muted text-[13px] font-semibold text-text-secondary">
                  <th className="px-3 py-3">コード</th>
                  <th className="px-3 py-3">お客様</th>
                  <th className="px-3 py-3 text-right">前回請求</th>
                  <th className="px-3 py-3 text-right">入金</th>
                  <th className="px-3 py-3 text-right">繰越</th>
                  <th className="px-3 py-3 text-right">今回売上</th>
                  <th className="px-3 py-3 text-right">消費税</th>
                  <th className="px-3 py-3 text-right">今回請求額</th>
                  <th className="px-3 py-3 text-center">回収予定</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s) => (
                  <tr
                    key={s.customerCode}
                    className="border-b border-border-light text-[14px] last:border-b-0"
                  >
                    <td className="px-3 py-3 font-mono tabular-nums text-[13px] text-text-secondary">
                      {s.customerCode}
                    </td>
                    <td className="px-3 py-3 font-bold">{s.customerName}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">
                      {s.previousBalance.toLocaleString("ja-JP")}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-text-secondary">
                      {s.paymentAmount.toLocaleString("ja-JP")}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">
                      {s.carryOver.toLocaleString("ja-JP")}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">
                      {s.currentSubtotal.toLocaleString("ja-JP")}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-text-secondary">
                      {s.currentTax.toLocaleString("ja-JP")}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums font-bold text-primary">
                      {formatYen(s.totalDue)}
                    </td>
                    <td className="px-3 py-3 text-center text-[13px] text-text-secondary">
                      {formatDateShort(s.paymentDueDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StepCard>

      <StepCard
        num={3}
        title="請求書を発行する"
        subtitle="発行するお客様を選んでください。帳票の種類はお客様ごとに自動で決まります"
        status={
          hasAggregated && summary.length > 0
            ? "active"
            : "pending"
        }
        disabled={!hasAggregated || summary.length === 0}
      >
        {summary.length > 0 && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[14px] font-semibold">
                <span
                  aria-hidden
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors",
                    allSelected
                      ? "border-primary bg-primary text-white"
                      : "border-border-default bg-bg-surface"
                  )}
                  onClick={toggleAll}
                >
                  {allSelected && <Check className="h-4 w-4" strokeWidth={3} />}
                </span>
                <span onClick={toggleAll}>
                  すべて選ぶ（{summary.length}社）
                </span>
              </label>
              <div className="text-[14px] text-text-secondary">
                <strong className="font-bold text-text-primary">
                  {selected.size}
                </strong>{" "}
                社を選択中
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border-light bg-bg-surface">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border-light bg-bg-muted text-[13px] font-semibold text-text-secondary">
                    <th className="w-12 px-3 py-3 text-center" />
                    <th className="px-3 py-3">コード</th>
                    <th className="px-3 py-3">お客様</th>
                    <th className="px-3 py-3">帳票の種類</th>
                    <th className="px-3 py-3 text-right">今回請求額</th>
                    <th className="px-3 py-3 text-center">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s) => {
                    const isSelected = selected.has(s.customerCode);
                    return (
                      <tr
                        key={s.customerCode}
                        className={cn(
                          "border-b border-border-light text-[14px] transition-colors last:border-b-0",
                          isSelected ? "bg-primary-lighter" : "hover:bg-bg-muted"
                        )}
                      >
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggle(s.customerCode)}
                            aria-pressed={isSelected}
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors",
                              isSelected
                                ? "border-primary bg-primary text-white"
                                : "border-border-default bg-bg-surface"
                            )}
                          >
                            {isSelected && (
                              <Check className="h-4 w-4" strokeWidth={3} />
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-3 font-mono tabular-nums text-[13px] text-text-secondary">
                          {s.customerCode}
                        </td>
                        <td className="px-3 py-3 font-bold">{s.customerName}</td>
                        <td className="px-3 py-3">
                          {s.invoiceFormat === "invoice_only" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-info-light px-2.5 py-1 text-[12px] font-semibold text-info">
                              <FileText className="h-3.5 w-3.5" strokeWidth={2} />
                              請求書のみ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#ede9fe] px-2.5 py-1 text-[12px] font-semibold text-[#6d28d9]">
                              <FileText className="h-3.5 w-3.5" strokeWidth={2} />
                              請求書＋納品書
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums font-bold">
                          {formatYen(s.totalDue)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="xs"
                            type="button"
                            onClick={() => {
                              const params = new URLSearchParams();
                              params.set("customerCode", s.customerCode);
                              params.set("periodTo", periodTo);
                              window.open(
                                `/api/documents/invoice?${params.toString()}`,
                                "_blank"
                              );
                            }}
                          >
                            <Printer className="h-3.5 w-3.5" strokeWidth={2} />
                            請求書
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-text-primary px-6 py-4 text-white">
              <div className="flex flex-wrap items-center gap-4 text-[15px] font-semibold">
                <span>
                  <strong className="text-[18px] font-bold text-[#c4b5fd]">
                    {selected.size}社
                  </strong>{" "}
                  に請求書を発行
                </span>
                <span className="font-mono tabular-nums">
                  合計{" "}
                  <strong className="text-[18px] font-bold text-[#c4b5fd]">
                    {formatYen(grandTotal)}
                  </strong>
                </span>
                <span className="text-[13px] text-white/80">
                  発行日：{todayLabel.replaceAll("-", "/")}
                </span>
              </div>
              <ConfirmDialog
                title="請求書を発行しますか？"
                description={`${selected.size}社の請求書を発行します。発行後は取り消しできません。`}
                confirmLabel="発行する"
                cancelLabel="やめる"
                onConfirm={onIssueConfirmed}
              >
                <button
                  type="button"
                  disabled={selected.size === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-success px-6 py-3 text-[15px] font-bold text-white shadow-[0_2px_6px_rgba(5,150,105,0.25)] transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check className="h-5 w-5" strokeWidth={2.5} />
                  請求書をまとめて発行する
                </button>
              </ConfirmDialog>
            </div>
          </>
        )}
      </StepCard>
    </div>
  );
}

type StepCardProps = {
  num: 1 | 2 | 3;
  title: string;
  subtitle: string;
  status: "done" | "active" | "pending";
  disabled?: boolean;
  children: React.ReactNode;
};

function StepCard({
  num,
  title,
  subtitle,
  status,
  disabled,
  children,
}: StepCardProps) {
  return (
    <section
      className={cn(
        "mb-8 rounded-2xl border bg-bg-surface p-7 shadow-[0_2px_6px_rgba(15,23,42,0.06)]",
        disabled ? "border-border-light opacity-70" : "border-border-light"
      )}
    >
      <div className="mb-5 flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-bold",
            status === "done"
              ? "bg-success text-white"
              : status === "active"
                ? "bg-primary text-white"
                : "border border-border-default bg-bg-surface text-text-muted"
          )}
        >
          {status === "done" ? <Check className="h-5 w-5" strokeWidth={3} /> : num}
        </div>
        <div className="flex-1">
          <h2 className="text-[18px] font-bold text-text-primary">{title}</h2>
          <p className="text-[13px] text-text-secondary">{subtitle}</p>
        </div>
        <div
          className={cn(
            "rounded-full px-3 py-1 text-[12px] font-semibold",
            status === "done" && "bg-success-light text-success",
            status === "active" && "bg-primary-lighter text-primary",
            status === "pending" && "bg-bg-muted text-text-muted"
          )}
        >
          {status === "done" ? "完了" : status === "active" ? "対応中" : "未対応"}
        </div>
      </div>
      {children}
    </section>
  );
}

function SummaryPill({
  label,
  value,
  money,
}: {
  label: string;
  value: string;
  money?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-full bg-primary-lighter px-4 py-2 text-[14px]",
        money && "bg-primary text-white"
      )}
    >
      <span
        className={cn(
          "text-[12px] font-semibold",
          money ? "text-white/80" : "text-text-secondary"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-mono tabular-nums font-bold",
          money ? "text-white" : "text-primary"
        )}
      >
        {value}
      </span>
    </div>
  );
}
