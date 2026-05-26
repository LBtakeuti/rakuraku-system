import { notFound } from "next/navigation";
import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { getSalesInvoice } from "@/lib/supabase/queries/sales-invoice";

function formatDate(iso: string): string {
  return iso.replaceAll("-", "/");
}

function formatYen(v: number): string {
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

export default async function SalesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inv = await getSalesInvoice(id);
  if (!inv) notFound();

  return (
    <>
      <TopHeader />
      <PageBar title={`納品書詳細：${inv.invoiceNo}`} backTo="/sales" />
      <main className="mx-auto w-full max-w-[1100px] px-10 py-12">
        <section className="mb-8 rounded-2xl border border-border-light bg-bg-surface p-6 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center gap-3">
            <span className="font-mono tabular-nums text-[22px] font-bold text-text-primary">
              {inv.invoiceNo}
            </span>
            {inv.billingStatus === "billed" ? (
              <StatusBadge variant="success">請求済み</StatusBadge>
            ) : (
              <StatusBadge variant="muted">未請求</StatusBadge>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-[14px] sm:grid-cols-4">
            <div>
              <dt className="text-text-secondary">お客様</dt>
              <dd className="font-bold text-text-primary">{inv.customerName}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">納品日</dt>
              <dd className="font-mono tabular-nums">{formatDate(inv.invoiceDate)}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">元の受注</dt>
              <dd className="font-mono tabular-nums">{inv.sourceOrderNo ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">担当者</dt>
              <dd>{inv.staffName ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-border-light bg-bg-surface shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
          <div className="border-b border-border-light px-5 py-3 text-[13px] font-semibold text-text-secondary">
            納品明細（{inv.lines.length}行）
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-light bg-bg-muted text-[13px] font-semibold text-text-secondary">
                  <th className="w-12 px-4 py-5 text-center">行</th>
                  <th className="px-4 py-5">商品</th>
                  <th className="w-20 px-4 py-5 text-right">数量</th>
                  <th className="w-28 px-4 py-5 text-right">単価</th>
                  <th className="w-28 px-4 py-5 text-right">金額</th>
                  <th className="w-16 px-4 py-5 text-center">税率</th>
                </tr>
              </thead>
              <tbody>
                {inv.lines.map((l) => (
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
                      {formatYen(l.unitPrice)}
                    </td>
                    <td className="px-4 py-5 text-right font-mono tabular-nums font-semibold">
                      {formatYen(l.amount)}
                    </td>
                    <td className="px-4 py-5 text-center text-[13px]">
                      {(l.taxRate * 100).toFixed(0)}%
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
                  {formatYen(inv.subtotal)}
                </span>
              </div>
              <div className="flex justify-between border-b border-border-light py-2 text-[14px]">
                <span className="text-text-secondary">消費税</span>
                <span className="font-mono tabular-nums font-semibold">
                  {formatYen(inv.taxAmount)}
                </span>
              </div>
              <div className="flex justify-between py-3 text-[22px] font-bold text-primary">
                <span>合計（税込）</span>
                <span className="font-mono tabular-nums">
                  {formatYen(inv.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
