"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search as SearchIcon, Pencil, Download, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { TextInput } from "@/components/forms/text-input";
import { Chip } from "@/components/forms/chip";
import { RankBadge } from "@/components/common/rank-badge";
import { StatusBadge } from "@/components/common/status-badge";
import type { CustomerRow, CustomerStatus } from "@/types/customer";
import { STATUS_LABEL } from "@/types/customer";

type CustomersTableProps = {
  rows: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  status: "all" | "active" | "paused" | "rank_ab";
};

const statusVariant: Record<
  CustomerStatus,
  "success" | "warning" | "muted"
> = {
  active: "success",
  paused: "warning",
  closed: "muted",
};

export function CustomersTable({
  rows,
  total,
  page,
  pageSize,
  query,
  status,
}: CustomersTableProps) {
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
          href="/customers/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[15px] font-bold text-white shadow-[0_2px_6px_rgba(15,23,42,0.06)] transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          新しいお客様を追加する
        </Link>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-5 py-3 text-[15px] font-bold text-text-primary shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-colors hover:bg-bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          disabled
          title="フェーズ7で実装予定"
        >
          <Download className="h-5 w-5" strokeWidth={2} />
          一覧をダウンロード
        </button>
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
              placeholder="お客様の名前、コード、フリガナで検索..."
              className="pl-10"
              aria-label="お客様検索"
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
            active={status === "all"}
            onClick={() => pushWith({ status: null, page: null })}
          >
            すべて
          </Chip>
          <Chip
            active={status === "active"}
            onClick={() => pushWith({ status: "active", page: null })}
          >
            取引中のみ
          </Chip>
          <Chip
            active={status === "paused"}
            onClick={() => pushWith({ status: "paused", page: null })}
          >
            休止中
          </Chip>
          <Chip
            active={status === "rank_ab"}
            onClick={() => pushWith({ status: "rank_ab", page: null })}
          >
            大切なお客様（ランクA・B）
          </Chip>
        </div>
      </div>

      <div className="rounded-2xl border border-border-light bg-bg-surface shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <div className="border-b border-border-light px-5 py-3 text-[13px] text-text-secondary">
          <strong className="font-bold text-text-primary">{total}</strong>{" "}
          件のお客様が登録されています
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-light bg-bg-muted text-[13px] font-semibold text-text-secondary">
                <th className="px-4 py-3">コード</th>
                <th className="px-4 py-3">お客様の名前</th>
                <th className="px-4 py-3">住所</th>
                <th className="px-4 py-3">電話番号</th>
                <th className="px-4 py-3">ランク</th>
                <th className="px-4 py-3">担当者</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-text-muted">
                    お客様が見つかりませんでした
                  </td>
                </tr>
              )}
              {rows.map((c) => (
                <tr
                  key={c.customerCode}
                  className="cursor-pointer border-b border-border-light text-[14px] text-text-primary transition-colors last:border-b-0 hover:bg-primary-lighter"
                  onClick={() => router.push(`/customers/${c.customerCode}/edit`)}
                >
                  <td className="px-4 py-3 font-mono tabular-nums text-[13px] text-text-secondary">
                    {c.customerCode}
                  </td>
                  <td className="px-4 py-3 font-bold">{c.name}</td>
                  <td className="px-4 py-3">{c.address ?? "—"}</td>
                  <td className="px-4 py-3">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <RankBadge rank={c.rank} />
                  </td>
                  <td className="px-4 py-3">{c.staffName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={statusVariant[c.status]}>
                      {STATUS_LABEL[c.status]}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${c.customerCode}/edit`}
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
