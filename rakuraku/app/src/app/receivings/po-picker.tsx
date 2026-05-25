"use client";

import Link from "next/link";
import { Package2 } from "lucide-react";
import type { PurchaseOrderRow } from "@/types/purchase-order";

type PoPickerProps = {
  pos: PurchaseOrderRow[];
};

function formatDate(iso: string | null): string {
  return iso ? iso.replaceAll("-", "/") : "—";
}

function formatYen(v: number): string {
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

export function PoPicker({ pos }: PoPickerProps) {
  return (
    <div className="rounded-2xl border border-border-light bg-bg-surface p-6 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-center gap-3">
        <Package2 className="h-6 w-6 text-primary" strokeWidth={2} />
        <h2 className="text-[18px] font-bold text-text-primary">
          入荷する発注書を選んでください
        </h2>
      </div>
      {pos.length === 0 ? (
        <div className="rounded-xl bg-bg-muted px-6 py-12 text-center text-text-muted">
          入荷可能な発注書がありません。発注一覧で発注を確認してください。
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {pos.map((p) => {
            const pct =
              p.totalQuantity === 0
                ? 0
                : Math.round((p.receivedQuantity / p.totalQuantity) * 100);
            return (
              <li key={p.id}>
                <Link
                  href={`/receivings?po=${p.id}`}
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-border-light bg-bg-surface px-5 py-4 transition-colors hover:border-primary hover:bg-primary-lighter"
                >
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-mono tabular-nums text-[16px] font-bold text-text-primary">
                      {p.purchaseOrderNo}
                    </div>
                    <div className="text-[13px] text-text-secondary">
                      {p.supplierName}
                    </div>
                  </div>
                  <div className="text-[13px] text-text-secondary">
                    発注日 {formatDate(p.orderDate)}
                    {p.expectedDeliveryDate &&
                      `／入荷予定 ${formatDate(p.expectedDeliveryDate)}`}
                  </div>
                  <div className="text-[14px] font-mono tabular-nums">
                    {formatYen(p.totalAmount)}
                  </div>
                  <div className="text-[13px] font-semibold text-text-secondary">
                    入荷 {p.receivedQuantity.toLocaleString("ja-JP")} /{" "}
                    {p.totalQuantity.toLocaleString("ja-JP")} 個（{pct}%）
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
