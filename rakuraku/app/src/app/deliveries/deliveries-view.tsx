"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Search as SearchIcon, Check, PackageCheck } from "lucide-react";
import { TextInput } from "@/components/forms/text-input";
import { Chip } from "@/components/forms/chip";
import { StatusBadge } from "@/components/common/status-badge";
import type { DeliverableOrder } from "@/types/sales-invoice";
import { confirmDelivery, type DeliveryActionResult } from "./actions";
import { cn } from "@/lib/utils";

type DeliveriesViewProps = {
  orders: DeliverableOrder[];
  query: string;
  range: "today" | "this_week" | "all";
};

function formatDate(iso: string): string {
  return iso.replaceAll("-", "/");
}

function formatYen(v: number): string {
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const urgencyVariant: Record<
  DeliverableOrder["urgency"],
  "danger" | "warning" | "muted" | "info"
> = {
  past: "danger",
  today: "danger",
  tomorrow: "warning",
  future: "muted",
};

const urgencyLabel: Record<DeliverableOrder["urgency"], string> = {
  past: "納品期限超過",
  today: "本日が納品日",
  tomorrow: "明日が納品日",
  future: "",
};

export function DeliveriesView({ orders, query, range }: DeliveriesViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(query);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deliveryDate, setDeliveryDate] = useState(todayIso());
  const [state, formAction] = useActionState<
    DeliveryActionResult | null,
    FormData
  >(confirmDelivery, null);
  const [, startTransition] = useTransition();

  useEffect(() => setSearchTerm(query), [query]);

  const pushWith = (mods: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(mods)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    pushWith({ q: searchTerm.trim() || null });
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedOrders = orders.filter((o) => selected.has(o.id));
  const totalAmount = selectedOrders.reduce((a, o) => a + o.totalAmount, 0);

  const onConfirm = () => {
    if (selectedOrders.length === 0) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `${selectedOrders.length}件の注文を納品確定します。よろしいですか？\n（在庫が実減され、納品書が作成されます）`
      )
    ) {
      return;
    }
    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({
        orderIds: selectedOrders.map((o) => o.id),
        deliveryDate,
      })
    );
    startTransition(() => formAction(fd));
  };

  const formError = state && !state.success ? state.formError : undefined;
  const fieldErrors =
    state && !state.success
      ? Object.values(state.fieldErrors).flatMap((e) => e ?? [])
      : [];
  const allErrors = Array.from(
    new Set([...fieldErrors, formError].filter((e): e is string => !!e))
  );

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

      <section className="mb-6 flex items-center gap-4 rounded-2xl border border-success bg-success-light px-5 py-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-success text-white">
          <PackageCheck className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <div>
          <div className="mb-1 text-[15px] font-bold text-success">
            納品する注文を選んでください
          </div>
          <div className="text-[13px] leading-[1.6] text-success/90">
            納品が完了した注文にチェックをつけて、下の「納品を確定する」ボタンを押してください。
            納品を確定すると、自動で売上として記録され、納品書が作られます。
          </div>
        </div>
      </section>

      <div className="mb-6 rounded-2xl border border-border-light bg-bg-surface p-5 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <form onSubmit={onSearch} className="mb-3 flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted"
              strokeWidth={2}
            />
            <TextInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="伝票番号、お客様名で検索..."
              className="pl-10"
              aria-label="検索"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-5 py-2.5 text-[15px] font-semibold text-text-primary transition-colors hover:bg-bg-muted"
          >
            検索
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-text-secondary">
            納品予定日:
          </span>
          <Chip
            active={range === "today"}
            onClick={() => pushWith({ range: "today" })}
          >
            今日まで
          </Chip>
          <Chip
            active={range === "this_week"}
            onClick={() => pushWith({ range: null })}
          >
            今週まで
          </Chip>
          <Chip
            active={range === "all"}
            onClick={() => pushWith({ range: "all" })}
          >
            すべて
          </Chip>
        </div>
      </div>

      <div className="rounded-2xl border border-border-light bg-bg-surface shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <div className="border-b border-border-light px-5 py-3 text-[13px] text-text-secondary">
          納品待ちの注文{" "}
          <strong className="font-bold text-text-primary">{orders.length}</strong>{" "}
          件
        </div>
        {orders.length === 0 ? (
          <div className="px-5 py-12 text-center text-text-muted">
            納品待ちの注文がありません
          </div>
        ) : (
          <ul className="divide-y divide-border-light">
            {orders.map((o) => {
              const isSelected = selected.has(o.id);
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => toggle(o.id)}
                    className={cn(
                      "flex w-full items-center gap-4 px-5 py-4 text-left transition-colors",
                      isSelected
                        ? "bg-primary-lighter hover:bg-primary-lighter"
                        : "hover:bg-bg-muted"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-border-default bg-bg-surface"
                      )}
                    >
                      {isSelected && (
                        <Check className="h-4 w-4" strokeWidth={3} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono tabular-nums text-[14px] font-bold text-text-primary">
                          #{o.orderNo}
                        </span>
                        {urgencyLabel[o.urgency] && (
                          <StatusBadge variant={urgencyVariant[o.urgency]}>
                            {urgencyLabel[o.urgency]}
                          </StatusBadge>
                        )}
                      </div>
                      <div className="mb-1 font-bold text-text-primary">
                        {o.customerName}
                      </div>
                      <div className="flex flex-wrap gap-3 text-[12px] text-text-secondary">
                        <span>📅 納品予定: {formatDate(o.deliveryDate)}</span>
                        <span>📦 商品 {o.lineCount}品目</span>
                      </div>
                    </div>
                    <div className="font-mono tabular-nums text-[16px] font-bold text-text-primary">
                      {formatYen(o.totalAmount)}
                    </div>
                    <Link
                      href={`/orders/${o.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-lg border border-border-default px-3 py-1.5 text-[13px] font-semibold text-text-primary transition-colors hover:bg-bg-muted"
                    >
                      詳細
                    </Link>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selectedOrders.length > 0 && (
        <div className="sticky bottom-6 z-40 mx-auto mt-6 max-w-[800px] rounded-2xl bg-text-primary px-6 py-4 text-white shadow-[0_8px_24px_rgba(15,23,42,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-[15px] font-semibold">
              <span>
                <strong className="text-[18px] font-bold text-[#93c5fd]">
                  {selectedOrders.length}件
                </strong>{" "}
                の注文を納品します
              </span>
              <span className="font-mono tabular-nums">
                合計{" "}
                <strong className="text-[18px] font-bold text-[#93c5fd]">
                  {formatYen(totalAmount)}
                </strong>
              </span>
              <label className="flex items-center gap-2 text-[13px] text-white/80">
                納品日：
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-[14px] text-white focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-transparent px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-white/10"
              >
                選択を解除
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="inline-flex items-center gap-2 rounded-xl bg-success px-6 py-3 text-[15px] font-bold text-white shadow-[0_2px_6px_rgba(5,150,105,0.25)] transition-colors hover:bg-success/90"
              >
                <Check className="h-5 w-5" strokeWidth={2.5} />
                納品を確定する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
