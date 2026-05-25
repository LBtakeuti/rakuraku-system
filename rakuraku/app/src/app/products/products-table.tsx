"use client";

import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/common/status-badge";
import {
  DataTable,
  SearchBar,
  ChipRow,
  useTableParams,
  type DataColumn,
} from "@/components/common/data-table";
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
  const { pushWith } = useTableParams();

  const columns: DataColumn<ProductRow>[] = [
    {
      key: "code",
      header: "商品コード",
      cell: (p) => (
        <span className="font-mono tabular-nums text-[13px] text-text-secondary">
          {p.productCode}
        </span>
      ),
    },
    {
      key: "name",
      header: "商品名",
      cell: (p) => <span className="font-bold">{p.name}</span>,
    },
    {
      key: "jan",
      header: "JANコード",
      cell: (p) => (
        <span className="font-mono tabular-nums text-[13px] text-text-secondary">
          {p.janCode ?? "—"}
        </span>
      ),
    },
    {
      key: "units",
      header: "入数",
      align: "right",
      cell: (p) => <span className="tabular-nums">{p.unitsPerCase}</span>,
    },
    {
      key: "price",
      header: "売上単価",
      align: "right",
      cell: (p) => (
        <span className="tabular-nums">
          {formatYen(p.defaultSalesUnitPrice)}
        </span>
      ),
    },
    {
      key: "tax",
      header: "税率",
      cell: (p) =>
        p.defaultTaxRate === 0.1 ? (
          <StatusBadge variant="info">10%</StatusBadge>
        ) : (
          <StatusBadge variant="warning">8%</StatusBadge>
        ),
    },
    {
      key: "order_type",
      header: "仕入方法",
      cell: (p) => (
        <StatusBadge variant={orderTypeVariant[p.defaultOrderType]}>
          {ORDER_TYPE_LABEL[p.defaultOrderType]}
        </StatusBadge>
      ),
    },
    {
      key: "stock",
      header: "在庫",
      align: "right",
      cell: (p) => (
        <span className="tabular-nums">
          {p.isStocked
            ? (p.totalStock ?? 0).toLocaleString("ja-JP")
            : "—"}
        </span>
      ),
    },
  ];

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
        <div className="mb-3">
          <SearchBar
            initialValue={query}
            placeholder="商品名、商品コード、JANコードで検索..."
            ariaLabel="商品検索"
            onSearch={(term) => pushWith({ q: term || null, page: null })}
          />
        </div>
        <ChipRow
          label="絞り込み:"
          active={filter}
          options={[
            { value: "all", label: "すべて" },
            { value: "stocked", label: "在庫がある商品" },
            { value: "order_at_sale", label: "注文を受けてから仕入れる" },
            { value: "no_price", label: "単価が未設定" },
          ]}
          onChange={(v) =>
            pushWith({ filter: v === "all" ? null : v, page: null })
          }
        />
      </div>

      <DataTable
        rows={rows}
        total={total}
        columns={columns}
        rowKey={(p) => p.productCode}
        unitLabel="件の商品が登録されています"
        emptyMessage="商品が見つかりませんでした"
        onRowClick={(p) => router.push(`/products/${p.productCode}/edit`)}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => pushWith({ page: String(p) })}
        trailing={(p) => (
          <Link
            href={`/products/${p.productCode}/edit`}
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
