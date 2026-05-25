"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search as SearchIcon, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { TextInput } from "@/components/forms/text-input";
import { Chip } from "@/components/forms/chip";
import { StatusBadge } from "@/components/common/status-badge";
import type { ProductRow, OrderType } from "@/types/product";
import { ORDER_TYPE_LABEL } from "@/types/product";

type ProductsTableProps = {
  rows: ProductRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  filter: "all" | "stocked" | "order_at_sale" | "no_price";
};

const orderTypeVariant: Record<OrderType, "success" | "muted"> = {
  stock: "success",
  order_at_sale: "muted",
  manual_order: "muted",
};

function formatYen(v: number | null): string {
  if (v === null) return "—";
  return `¥${v.toLocaleString("ja-JP")}`;
}

export function ProductsTable({
  rows,
  total,
  page,
  pageSize,
  query,
  filter,
}: ProductsTableProps) {
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
    pushWith({ q: searchTerm.trim() || null, page: null });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/products/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[15px] font-bold text-white shadow-[0_2px_6px_rgba(15,23,42,0.06)] transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          新しい商品を追加する
        </Link>
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
              placeholder="商品名、商品コード、JANコードで検索..."
              className="pl-10"
              aria-label="商品検索"
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
            絞り込み:
          </span>
          <Chip
            active={filter === "all"}
            onClick={() => pushWith({ filter: null, page: null })}
          >
            すべて
          </Chip>
          <Chip
            active={filter === "stocked"}
            onClick={() => pushWith({ filter: "stocked", page: null })}
          >
            在庫がある商品
          </Chip>
          <Chip
            active={filter === "order_at_sale"}
            onClick={() => pushWith({ filter: "order_at_sale", page: null })}
          >
            注文を受けてから仕入れる
          </Chip>
          <Chip
            active={filter === "no_price"}
            onClick={() => pushWith({ filter: "no_price", page: null })}
          >
            単価が未設定
          </Chip>
        </div>
      </div>

      <div className="rounded-2xl border border-border-light bg-bg-surface shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <div className="border-b border-border-light px-5 py-3 text-[13px] text-text-secondary">
          <strong className="font-bold text-text-primary">{total}</strong> 件の商品が登録されています
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-light bg-bg-muted text-[13px] font-semibold text-text-secondary">
                <th className="px-4 py-3">商品コード</th>
                <th className="px-4 py-3">商品名</th>
                <th className="px-4 py-3">JANコード</th>
                <th className="px-4 py-3 text-right">入数</th>
                <th className="px-4 py-3 text-right">売上単価</th>
                <th className="px-4 py-3">税率</th>
                <th className="px-4 py-3">仕入方法</th>
                <th className="px-4 py-3 text-right">在庫</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-text-muted"
                  >
                    商品が見つかりませんでした
                  </td>
                </tr>
              )}
              {rows.map((p) => (
                <tr
                  key={p.productCode}
                  className="cursor-pointer border-b border-border-light text-[14px] text-text-primary transition-colors last:border-b-0 hover:bg-primary-lighter"
                  onClick={() => router.push(`/products/${p.productCode}/edit`)}
                >
                  <td className="px-4 py-3 font-mono tabular-nums text-[13px] text-text-secondary">
                    {p.productCode}
                  </td>
                  <td className="px-4 py-3 font-bold">{p.name}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-[13px] text-text-secondary">
                    {p.janCode ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.unitsPerCase}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatYen(p.defaultSalesUnitPrice)}
                  </td>
                  <td className="px-4 py-3">
                    {p.defaultTaxRate === 0.1 ? (
                      <StatusBadge variant="info">10%</StatusBadge>
                    ) : (
                      <StatusBadge variant="warning">8%</StatusBadge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={orderTypeVariant[p.defaultOrderType]}>
                      {ORDER_TYPE_LABEL[p.defaultOrderType]}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.isStocked ? (p.totalStock ?? 0).toLocaleString("ja-JP") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/products/${p.productCode}/edit`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-[13px] font-semibold text-text-primary transition-colors hover:bg-bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                      編集
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border-light px-5 py-3 text-[13px] text-text-secondary">
            <div>
              {page} / {totalPages} ページ
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => pushWith({ page: String(page - 1) })}
                className="rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                前へ
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => pushWith({ page: String(page + 1) })}
                className="rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                次へ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
