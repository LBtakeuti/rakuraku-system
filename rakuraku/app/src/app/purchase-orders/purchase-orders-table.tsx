"use client";

import { useRouter } from "next/navigation";
import { Eye, PackagePlus, PackageCheck } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/common/status-badge";
import {
  DataTable,
  SearchBar,
  ChipRow,
  useTableParams,
  type DataColumn,
} from "@/components/common/data-table";
import type {
  PurchaseOrderRow,
  PurchaseOrderStatus,
} from "@/types/purchase-order";
import { PO_STATUS_LABEL } from "@/types/purchase-order";
import { cn } from "@/lib/utils";

type PurchaseOrdersTableProps = {
  rows: PurchaseOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  status: "all" | "ordered" | "partial" | "received" | "cancelled";
};

const statusVariant: Record<
  PurchaseOrderStatus,
  "success" | "warning" | "info" | "danger" | "muted"
> = {
  draft: "muted",
  ordered: "info",
  partial: "warning",
  received: "success",
  cancelled: "danger",
};

function formatDate(iso: string | null): string {
  return iso ? iso.replaceAll("-", "/") : "—";
}

function formatYen(v: number): string {
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

function ProgressBar({
  received,
  total,
}: {
  received: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((received / total) * 100));
  const variant = pct === 0 ? "empty" : pct >= 100 ? "full" : "partial";
  return (
    <div className="min-w-[140px]">
      <div className="mb-1 flex items-center justify-between text-[12px] text-text-secondary">
        <span>
          {received.toLocaleString("ja-JP")} / {total.toLocaleString("ja-JP")} 個
        </span>
        <span className="font-mono tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            variant === "full" && "bg-success",
            variant === "partial" && "bg-warning",
            variant === "empty" && "bg-bg-muted"
          )}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

export function PurchaseOrdersTable({
  rows,
  total,
  page,
  pageSize,
  query,
  status,
}: PurchaseOrdersTableProps) {
  const router = useRouter();
  const { pushWith } = useTableParams();

  const columns: DataColumn<PurchaseOrderRow>[] = [
    {
      key: "poNo",
      header: "発注番号",
      cell: (p) => (
        <span className="font-mono tabular-nums font-bold">
          {p.purchaseOrderNo}
        </span>
      ),
    },
    { key: "orderDate", header: "発注日", cell: (p) => formatDate(p.orderDate) },
    {
      key: "expected",
      header: "入荷予定日",
      cell: (p) => formatDate(p.expectedDeliveryDate),
    },
    {
      key: "supplier",
      header: "仕入先",
      cell: (p) => <span className="font-bold">{p.supplierName}</span>,
    },
    {
      key: "amount",
      header: "金額(税込)",
      align: "right",
      cell: (p) => (
        <span className="font-mono tabular-nums">{formatYen(p.totalAmount)}</span>
      ),
    },
    {
      key: "progress",
      header: "入荷状況",
      cell: (p) => (
        <ProgressBar received={p.receivedQuantity} total={p.totalQuantity} />
      ),
    },
    {
      key: "status",
      header: "状態",
      cell: (p) => (
        <StatusBadge variant={statusVariant[p.status]}>
          {PO_STATUS_LABEL[p.status]}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/receivings"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[15px] font-bold text-white shadow-[0_2px_6px_rgba(15,23,42,0.06)] transition-colors hover:bg-primary-hover"
        >
          <PackagePlus className="h-5 w-5" strokeWidth={2.5} />
          入荷を登録する
        </Link>
      </div>

      <div className="mb-8 rounded-2xl border border-border-light bg-bg-surface p-5 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <div className="mb-3">
          <SearchBar
            initialValue={query}
            placeholder="発注番号、仕入先で検索..."
            ariaLabel="発注検索"
            onSearch={(term) => pushWith({ q: term || null, page: null })}
          />
        </div>
        <ChipRow
          label="状態:"
          active={status}
          options={[
            { value: "all", label: "すべて" },
            { value: "ordered", label: "発注済み" },
            { value: "partial", label: "一部入荷" },
            { value: "received", label: "全量入荷" },
            { value: "cancelled", label: "取消し済み" },
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
        rowKey={(p) => p.id}
        unitLabel="件の発注があります"
        emptyMessage="発注が見つかりませんでした"
        onRowClick={(p) => router.push(`/purchase-orders/${p.id}`)}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => pushWith({ page: String(p) })}
        trailing={(p) =>
          p.status === "ordered" || p.status === "partial" ? (
            <Link
              href={`/receivings?po=${p.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-[13px] font-semibold text-white shadow-[0_1px_3px_rgba(5,150,105,0.2)] transition-colors hover:bg-success/90"
            >
              <PackageCheck className="h-3.5 w-3.5" strokeWidth={2} />
              入荷確定
            </Link>
          ) : (
            <Link
              href={`/purchase-orders/${p.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-[13px] font-semibold text-text-primary transition-colors hover:bg-bg-muted"
            >
              <Eye className="h-3.5 w-3.5" strokeWidth={2} />
              詳細
            </Link>
          )
        }
      />
    </div>
  );
}
