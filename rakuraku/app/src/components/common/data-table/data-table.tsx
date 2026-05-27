"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DataColumn<T> = {
  key: string;
  header: ReactNode;
  width?: string;
  align?: "left" | "right" | "center";
  cell: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  rows: T[];
  total: number;
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  unitLabel: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  trailing?: (row: T) => ReactNode;
  bare?: boolean;
};

export function DataTable<T>({
  rows,
  total,
  columns,
  rowKey,
  unitLabel,
  emptyMessage = "データが見つかりませんでした",
  onRowClick,
  page,
  pageSize,
  onPageChange,
  trailing,
  bare = false,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div
      className={cn(
        bare
          ? ""
          : "rounded-2xl border border-border-light bg-bg-surface shadow-[0_2px_6px_rgba(15,23,42,0.06)]"
      )}
    >
      <div className="border-b border-border-light px-6 py-4 text-[13px] text-text-secondary">
        <strong className="font-bold text-text-primary">{total}</strong>{" "}
        {unitLabel}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-light bg-bg-muted text-[13px] font-semibold text-text-secondary">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-5 py-4",
                    c.width,
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center"
                  )}
                >
                  {c.header}
                </th>
              ))}
              {trailing && <th className="px-5 py-4" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (trailing ? 1 : 0)}
                  className="px-5 py-12 text-center text-text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={rowKey(r)}
                className={cn(
                  "border-b border-border-light text-[14px] text-text-primary transition-colors last:border-b-0",
                  onRowClick && "cursor-pointer hover:bg-primary-lighter"
                )}
                onClick={() => onRowClick?.(r)}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-5 py-5",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center"
                    )}
                  >
                    {c.cell(r)}
                  </td>
                ))}
                {trailing && (
                  <td className="px-5 py-5" onClick={(e) => e.stopPropagation()}>
                    {trailing(r)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border-light px-6 py-4 text-[13px] text-text-secondary">
          <div>
            {page} / {totalPages} ページ
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              前へ
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
