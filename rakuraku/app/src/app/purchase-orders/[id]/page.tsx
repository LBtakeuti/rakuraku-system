import { notFound } from "next/navigation";
import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { PrintButton } from "@/components/common/print-button";
import { getPurchaseOrder } from "@/lib/supabase/queries/purchase-order";
import {
  PO_STATUS_LABEL,
  type PurchaseOrderStatus,
} from "@/types/purchase-order";

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

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const po = await getPurchaseOrder(id);
  if (!po) notFound();

  const canReceive = po.status === "ordered" || po.status === "partial";

  return (
    <>
      <TopHeader />
      <PageBar
        title={`発注詳細：${po.purchaseOrderNo}`}
        backTo="/purchase-orders"
      />
      <main className="mx-auto w-full max-w-[1100px] px-10 py-12">
        <section className="mb-8 rounded-2xl border border-border-light bg-bg-surface p-6 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono tabular-nums text-[22px] font-bold text-text-primary">
                {po.purchaseOrderNo}
              </span>
              <StatusBadge variant={statusVariant[po.status]}>
                {PO_STATUS_LABEL[po.status]}
              </StatusBadge>
            </div>
            <div className="flex items-center gap-3">
              <PrintButton
                href={`/api/documents/purchase-order?purchaseOrderId=${po.id}`}
                label="発注書を印刷"
              />
              {canReceive && (
                <Link
                  href={`/receivings?po=${po.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[15px] font-bold text-white shadow-[0_2px_6px_rgba(15,23,42,0.06)] transition-colors hover:bg-primary-hover"
                >
                  <PackagePlus className="h-5 w-5" strokeWidth={2.5} />
                  この発注書で入荷を登録する
                </Link>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-[14px] sm:grid-cols-4">
            <div>
              <dt className="text-text-secondary">仕入先</dt>
              <dd className="font-bold text-text-primary">{po.supplierName}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">発注日</dt>
              <dd className="font-mono tabular-nums">{formatDate(po.orderDate)}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">入荷予定日</dt>
              <dd className="font-mono tabular-nums">
                {formatDate(po.expectedDeliveryDate)}
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">合計金額</dt>
              <dd className="font-mono tabular-nums font-bold">
                {formatYen(po.totalAmount)}
              </dd>
            </div>
          </dl>
          {po.note && (
            <div className="mt-4 rounded-lg bg-bg-muted px-4 py-3 text-[13px] text-text-secondary">
              <span className="font-semibold">メモ:</span> {po.note}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border-light bg-bg-surface shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
          <div className="border-b border-border-light px-5 py-3 text-[13px] font-semibold text-text-secondary">
            発注明細（{po.lines.length}行）・入荷合計 {po.receivedQuantity.toLocaleString("ja-JP")} / {po.totalQuantity.toLocaleString("ja-JP")} 個
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-light bg-bg-muted text-[13px] font-semibold text-text-secondary">
                  <th className="w-12 px-4 py-5 text-center">行</th>
                  <th className="px-4 py-5">商品</th>
                  <th className="w-20 px-4 py-5 text-right">発注数</th>
                  <th className="w-20 px-4 py-5 text-right">入荷済み</th>
                  <th className="w-28 px-4 py-5 text-right">単価</th>
                  <th className="w-28 px-4 py-5 text-right">金額</th>
                  <th className="w-16 px-4 py-5 text-center">税率</th>
                  <th className="w-20 px-4 py-5 text-center">ロット</th>
                </tr>
              </thead>
              <tbody>
                {po.lines.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-border-light text-[14px] last:border-b-0"
                  >
                    <td className="px-4 py-5 text-center font-mono tabular-nums text-text-secondary">
                      {l.lineNo}
                    </td>
                    <td className="px-4 py-5">
                      <div className="font-bold">{l.productName}</div>
                      <div className="text-[12px] text-text-muted">
                        {l.productCode}
                      </div>
                    </td>
                    <td className="px-4 py-5 text-right font-mono tabular-nums">
                      {l.quantity.toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-5 text-right font-mono tabular-nums">
                      {l.receivedQuantity.toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-5 text-right font-mono tabular-nums">
                      {formatYen(l.unitPrice)}
                    </td>
                    <td className="px-4 py-5 text-right font-mono tabular-nums font-semibold">
                      {formatYen(l.amount)}
                    </td>
                    <td className="px-4 py-5 text-center text-[13px]">
                      {(l.taxRate * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-5 text-center text-[13px] text-text-secondary">
                      {l.isLotManaged ? "管理あり" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
