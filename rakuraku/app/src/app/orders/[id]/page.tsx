import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { PrintButton } from "@/components/common/print-button";
import { getSalesOrder } from "@/lib/supabase/queries/sales-order";
import {
  SALES_ORDER_STATUS_LABEL,
  type SalesOrderStatus,
} from "@/types/sales-order";
import { ORDER_TYPE_LABEL } from "@/types/product";

const statusVariant: Record<
  SalesOrderStatus,
  "success" | "warning" | "info" | "danger" | "muted"
> = {
  draft: "muted",
  pending: "warning",
  partial: "info",
  fulfilled: "success",
  cancelled: "danger",
};

function formatDate(iso: string): string {
  return iso.replaceAll("-", "/");
}

function formatYen(v: number): string {
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getSalesOrder(id);
  if (!order) notFound();

  return (
    <>
      <TopHeader />
      <PageBar title={`受注詳細：${order.orderNo}`} backTo="/orders" />
      <main className="mx-auto w-full max-w-[1100px] px-8 py-8">
        <section className="mb-6 rounded-2xl border border-border-light bg-bg-surface p-6 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono tabular-nums text-[22px] font-bold text-text-primary">
                {order.orderNo}
              </span>
              <StatusBadge variant={statusVariant[order.status]}>
                {SALES_ORDER_STATUS_LABEL[order.status]}
              </StatusBadge>
            </div>
            <PrintButton
              href={`/api/documents/sales-order?orderId=${id}`}
              label="受注伝票を印刷"
            />
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-[14px] sm:grid-cols-4">
            <div>
              <dt className="text-text-secondary">お客様</dt>
              <dd className="font-bold text-text-primary">{order.customerName}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">注文日</dt>
              <dd className="font-mono tabular-nums">{formatDate(order.orderDate)}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">納品予定日</dt>
              <dd className="font-mono tabular-nums">{formatDate(order.deliveryDate)}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">担当者</dt>
              <dd>{order.staffName ?? "—"}</dd>
            </div>
          </dl>
          {order.note && (
            <div className="mt-4 rounded-lg bg-bg-muted px-4 py-3 text-[13px] text-text-secondary">
              <span className="font-semibold">メモ:</span> {order.note}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border-light bg-bg-surface shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
          <div className="border-b border-border-light px-5 py-3 text-[13px] font-semibold text-text-secondary">
            注文明細（{order.lines.length}行）
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-light bg-bg-muted text-[13px] font-semibold text-text-secondary">
                  <th className="w-12 px-3 py-3 text-center">行</th>
                  <th className="px-3 py-3">商品</th>
                  <th className="w-20 px-3 py-3 text-right">数量</th>
                  <th className="w-28 px-3 py-3 text-right">単価</th>
                  <th className="w-28 px-3 py-3 text-right">金額</th>
                  <th className="w-16 px-3 py-3 text-center">税率</th>
                  <th className="w-28 px-3 py-3">仕入方法</th>
                  <th className="w-24 px-3 py-3 text-right">納品済み</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-border-light text-[14px] last:border-b-0"
                  >
                    <td className="px-3 py-3 text-center font-mono tabular-nums text-text-secondary">
                      {l.lineNo}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-bold">{l.productNameSnapshot}</div>
                      <div className="text-[12px] text-text-muted">
                        {l.productCode}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">
                      {l.quantity.toLocaleString("ja-JP")}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">
                      {formatYen(l.unitPrice)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold">
                      {formatYen(l.amount)}
                    </td>
                    <td className="px-3 py-3 text-center text-[13px]">
                      {(l.taxRate * 100).toFixed(0)}%
                    </td>
                    <td className="px-3 py-3 text-[13px] text-text-secondary">
                      {ORDER_TYPE_LABEL[l.orderType]}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-text-secondary">
                      {l.fulfilledQuantity.toLocaleString("ja-JP")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border-light p-5">
            <div className="ml-auto max-w-[320px]">
              <div className="flex justify-between border-b border-border-light py-2 text-[14px]">
                <span className="text-text-secondary">小計</span>
                <span className="font-mono tabular-nums font-semibold">
                  {formatYen(order.subtotal)}
                </span>
              </div>
              <div className="flex justify-between border-b border-border-light py-2 text-[14px]">
                <span className="text-text-secondary">消費税</span>
                <span className="font-mono tabular-nums font-semibold">
                  {formatYen(order.taxAmount)}
                </span>
              </div>
              <div className="flex justify-between py-3 text-[18px] font-bold">
                <span>合計</span>
                <span className="font-mono tabular-nums">
                  {formatYen(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
