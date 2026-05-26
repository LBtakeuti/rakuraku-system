"use client";

import { useRouter } from "next/navigation";
import { Pencil, Download, Plus } from "lucide-react";
import Link from "next/link";
import { RankBadge } from "@/components/common/rank-badge";
import { StatusBadge } from "@/components/common/status-badge";
import {
  DataTable,
  SearchBar,
  ChipRow,
  useTableParams,
  type DataColumn,
} from "@/components/common/data-table";
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
  const { pushWith } = useTableParams();

  const columns: DataColumn<CustomerRow>[] = [
    {
      key: "code",
      header: "コード",
      cell: (c) => (
        <span className="font-mono tabular-nums text-[13px] text-text-secondary">
          {c.customerCode}
        </span>
      ),
    },
    {
      key: "name",
      header: "お客様の名前",
      cell: (c) => <span className="font-bold">{c.name}</span>,
    },
    { key: "address", header: "住所", cell: (c) => c.address ?? "—" },
    { key: "phone", header: "電話番号", cell: (c) => c.phone ?? "—" },
    { key: "rank", header: "ランク", cell: (c) => <RankBadge rank={c.rank} /> },
    { key: "staff", header: "担当者", cell: (c) => c.staffName ?? "—" },
    {
      key: "status",
      header: "状態",
      cell: (c) => (
        <StatusBadge variant={statusVariant[c.status]}>
          {STATUS_LABEL[c.status]}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-3">
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

      <div className="mb-8 rounded-2xl border border-border-light bg-bg-surface p-6 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <div className="mb-4">
          <SearchBar
            initialValue={query}
            placeholder="お客様の名前、コード、フリガナで検索..."
            ariaLabel="お客様検索"
            onSearch={(term) => pushWith({ q: term || null, page: null })}
          />
        </div>
        <ChipRow
          label="絞り込み:"
          active={status}
          options={[
            { value: "all", label: "すべて" },
            { value: "active", label: "取引中のみ" },
            { value: "paused", label: "休止中" },
            { value: "rank_ab", label: "大切なお客様（ランクA・B）" },
          ]}
          onChange={(v) =>
            pushWith({ status: v === "all" ? null : v, page: null })
          }
        />
      </div>

      <DataTable
        rows={rows}
        total={total}
        columns={columns}
        rowKey={(c) => c.customerCode}
        unitLabel="件のお客様が登録されています"
        emptyMessage="お客様が見つかりませんでした"
        onRowClick={(c) => router.push(`/customers/${c.customerCode}/edit`)}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => pushWith({ page: String(p) })}
        trailing={(c) => (
          <Link
            href={`/customers/${c.customerCode}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-[13px] font-semibold text-text-primary transition-colors hover:bg-bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            編集
          </Link>
        )}
      />
    </div>
  );
}
