"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search as SearchIcon, AlertTriangle, AlertCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { TextInput } from "@/components/forms/text-input";
import { Chip } from "@/components/forms/chip";
import { StatusBadge } from "@/components/common/status-badge";
import type {
  ProductStockSummary,
  ProductStockLot,
  ExpiryStatus,
} from "@/types/stock";
import { cn } from "@/lib/utils";

type StocksViewProps = {
  summary: ProductStockSummary[];
  lots: ProductStockLot[];
  warningCounts: { danger: number; warning: number };
  query: string;
  view: "product" | "lot";
  expiryFilter: "all" | "danger" | "warning";
};

const expiryVariant: Record<ExpiryStatus, "danger" | "warning" | "muted" | "success"> = {
  danger: "danger",
  warning: "warning",
  ok: "success",
  none: "muted",
};

const expiryLabel: Record<ExpiryStatus, string> = {
  danger: "期限切れ間近",
  warning: "期限要注意",
  ok: "正常",
  none: "期限なし",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.replaceAll("-", "/");
}

export function StocksView({
  summary,
  lots,
  warningCounts,
  query,
  view,
  expiryFilter,
}: StocksViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(query);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setSearchTerm(query);
  }, [query]);

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

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-danger bg-danger-light px-5 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger text-white">
            <AlertCircle className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <div className="font-mono tabular-nums text-[28px] font-bold text-danger">
              {warningCounts.danger.toLocaleString("ja-JP")}
            </div>
            <div className="text-[13px] font-semibold text-danger">
              期限切れ間近（14日以内）
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-warning bg-warning-light px-5 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning text-white">
            <AlertTriangle className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <div className="font-mono tabular-nums text-[28px] font-bold text-warning">
              {warningCounts.warning.toLocaleString("ja-JP")}
            </div>
            <div className="text-[13px] font-semibold text-warning">
              期限要注意（60日以内）
            </div>
          </div>
        </div>
      </div>

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
              placeholder="商品コード、商品名、ロット番号で検索..."
              className="pl-10"
              aria-label="在庫検索"
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
            期限フィルタ:
          </span>
          <Chip
            active={expiryFilter === "all"}
            onClick={() => pushWith({ expiry: null })}
          >
            すべて
          </Chip>
          <Chip
            active={expiryFilter === "danger"}
            onClick={() => pushWith({ expiry: "danger" })}
          >
            期限切れ間近
          </Chip>
          <Chip
            active={expiryFilter === "warning"}
            onClick={() => pushWith({ expiry: "warning" })}
          >
            期限要注意
          </Chip>
        </div>
      </div>

      <div className="mb-6 inline-flex rounded-xl border border-border-default bg-bg-surface p-1">
        <button
          type="button"
          onClick={() => pushWith({ view: null })}
          className={cn(
            "rounded-lg px-4 py-2 text-[14px] font-semibold transition-colors",
            view === "product"
              ? "bg-primary text-white"
              : "text-text-secondary hover:text-primary"
          )}
        >
          商品ごと
        </button>
        <button
          type="button"
          onClick={() => pushWith({ view: "lot" })}
          className={cn(
            "rounded-lg px-4 py-2 text-[14px] font-semibold transition-colors",
            view === "lot"
              ? "bg-primary text-white"
              : "text-text-secondary hover:text-primary"
          )}
        >
          ロットごと（詳細）
        </button>
      </div>

      {view === "product" ? (
        <ProductTable rows={summary} />
      ) : (
        <LotTable rows={lots} />
      )}
    </div>
  );
}

function ProductTable({ rows }: { rows: ProductStockSummary[] }) {
  return (
    <div className="rounded-2xl border border-border-light bg-bg-surface shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
      <div className="border-b border-border-light px-5 py-3 text-[13px] text-text-secondary">
        <strong className="font-bold text-text-primary">{rows.length}</strong>{" "}
        件の商品が在庫管理対象です
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-light bg-bg-muted text-[13px] font-semibold text-text-secondary">
              <th className="px-4 py-3">商品コード</th>
              <th className="px-4 py-3">商品名</th>
              <th className="px-4 py-3 text-right">実在庫</th>
              <th className="px-4 py-3 text-right">引当中</th>
              <th className="px-4 py-3 text-right">引当可能</th>
              <th className="px-4 py-3">最も近い期限</th>
              <th className="px-4 py-3">状態</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                  在庫が見つかりませんでした
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.productCode}
                className="border-b border-border-light text-[14px] last:border-b-0"
              >
                <td className="px-4 py-3 font-mono tabular-nums text-[13px] text-text-secondary">
                  {r.productCode}
                </td>
                <td className="px-4 py-3 font-bold">{r.productName}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {r.quantityOnHand.toLocaleString("ja-JP")}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                  {r.quantityAllocated.toLocaleString("ja-JP")}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                  {r.quantityAvailable.toLocaleString("ja-JP")}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums">
                  {formatDate(r.nearestExpiry)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge variant={expiryVariant[r.expiryStatus]}>
                    {expiryLabel[r.expiryStatus]}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LotTable({ rows }: { rows: ProductStockLot[] }) {
  return (
    <div className="rounded-2xl border border-border-light bg-bg-surface shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
      <div className="border-b border-border-light px-5 py-3 text-[13px] text-text-secondary">
        <strong className="font-bold text-text-primary">{rows.length}</strong>{" "}
        件のロットがあります
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-light bg-bg-muted text-[13px] font-semibold text-text-secondary">
              <th className="px-4 py-3">商品</th>
              <th className="px-4 py-3">ロット番号</th>
              <th className="px-4 py-3">賞味期限</th>
              <th className="px-4 py-3 text-right">実在庫</th>
              <th className="px-4 py-3 text-right">引当中</th>
              <th className="px-4 py-3 text-right">引当可能</th>
              <th className="px-4 py-3">入荷日</th>
              <th className="px-4 py-3">状態</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-text-muted">
                  ロットが見つかりませんでした
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-border-light text-[14px] last:border-b-0"
              >
                <td className="px-4 py-3">
                  <div className="font-bold">{r.productName}</div>
                  <div className="text-[12px] text-text-muted">
                    {r.productCode}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-[13px]">
                  {r.lotNo ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums">
                  {formatDate(r.expiryDate)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {r.quantityOnHand.toLocaleString("ja-JP")}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                  {r.quantityAllocated.toLocaleString("ja-JP")}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                  {r.quantityAvailable.toLocaleString("ja-JP")}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-[13px] text-text-secondary">
                  {formatDate(r.receivedAt)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge variant={expiryVariant[r.expiryStatus]}>
                    {expiryLabel[r.expiryStatus]}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
