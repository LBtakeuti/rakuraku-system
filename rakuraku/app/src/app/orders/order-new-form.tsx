"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { CustomerPicker } from "./customer-picker";
import { OrderLineEditor, type EditableLine } from "./order-line-editor";
import { listDeliveryAddressesAction } from "./client-actions";
import { createSalesOrder, type SalesOrderActionResult } from "./actions";
import { salesOrderFormSchema } from "@/lib/validations/sales-order";
import type { CustomerSearchResult } from "@/lib/supabase/queries/sales-order";
import type { DeliveryAddressOption } from "@/types/sales-order";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function OrderNewForm() {
  const [state, formAction] = useActionState<
    SalesOrderActionResult | null,
    FormData
  >(createSalesOrder, null);
  const [, startTransition] = useTransition();

  const [customer, setCustomer] = useState<CustomerSearchResult | null>(null);
  const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddressOption[]>([]);
  const [deliveryAddressId, setDeliveryAddressId] = useState("");
  const [orderDate, setOrderDate] = useState<string>(todayIso());
  const [deliveryDate, setDeliveryDate] = useState<string>(addDaysIso(todayIso(), 2));
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!customer) {
      setDeliveryAddresses([]);
      setDeliveryAddressId("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await listDeliveryAddressesAction(customer.customerCode);
        if (cancelled) return;
        setDeliveryAddresses(list);
        const def = list.find((a) => a.isDefault);
        setDeliveryAddressId(def?.id ?? "");
      } catch {
        if (!cancelled) {
          setDeliveryAddresses([]);
          setDeliveryAddressId("");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customer]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validLines = lines.filter((l) => l.productCode && l.quantity > 0);
    const payload = {
      customerCode: customer?.customerCode ?? "",
      deliveryAddressId,
      orderDate,
      deliveryDate,
      note,
      lines: validLines.map((l) => ({
        productCode: l.productCode,
        productName: l.productName,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRate: l.taxRate,
        orderType: l.orderType,
      })),
    };
    const result = salesOrderFormSchema.safeParse(payload);
    if (!result.success) {
      setClientErrors(result.error.issues.map((i) => i.message));
      return;
    }
    setClientErrors([]);
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    startTransition(() => formAction(fd));
  };

  const formError = state && !state.ok ? state.formError : undefined;
  const fieldErrors =
    state && !state.ok
      ? Object.values(state.fieldErrors).flatMap((e) => e ?? [])
      : [];
  const errors = [...clientErrors, ...fieldErrors, formError].filter(
    (e): e is string => !!e
  );

  return (
    <form onSubmit={handleSubmit}>
      {errors.length > 0 && (
        <div className="mb-6 rounded-xl border border-danger bg-danger-light px-4 py-3 text-[14px] font-semibold text-danger">
          <ul className="list-disc pl-5">
            {Array.from(new Set(errors)).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <SectionCard
        num={1}
        title="どのお客様からの注文ですか？"
      >
        <CustomerPicker
          selected={customer}
          onSelect={(c) => setCustomer(c)}
          onClear={() => setCustomer(null)}
        />
      </SectionCard>

      <SectionCard
        num={2}
        title="注文の日付と納品日"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-text-secondary">
              注文日
            </div>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-text-secondary">
              納品予定日
            </div>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-text-secondary">
              届け先
            </div>
            <select
              value={deliveryAddressId}
              onChange={(e) => setDeliveryAddressId(e.target.value)}
              className="w-full appearance-none rounded-[10px] border border-border-default bg-bg-surface px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={!customer}
            >
              <option value="">
                {customer ? "お客様の本社" : "お客様を選んでください"}
              </option>
              {deliveryAddresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.isDefault ? "（既定）" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard num={3} title="注文する商品を選んでください">
        <OrderLineEditor lines={lines} onChange={setLines} />
      </SectionCard>

      <SectionCard num={4} title="メモ（任意）">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="お客様への伝言や、社内メモを書けます"
          className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </SectionCard>

      <div className="mt-8 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-6 py-3 text-[15px] font-bold text-text-primary transition-colors hover:bg-bg-muted"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-[15px] font-bold text-white shadow-[0_2px_6px_rgba(15,23,42,0.06)] transition-colors hover:bg-primary-hover"
        >
          <Check className="h-5 w-5" strokeWidth={2.5} />
          この内容で注文を確定する
        </button>
      </div>
    </form>
  );
}

function SectionCard({
  num,
  title,
  children,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-2xl border border-border-light bg-bg-surface p-6 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-white">
          {num}
        </div>
        <h2 className="text-[18px] font-bold text-text-primary">{title}</h2>
      </div>
      {children}
    </section>
  );
}
