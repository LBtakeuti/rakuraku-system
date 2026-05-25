"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { TextInput } from "@/components/forms/text-input";
import type { CustomerSearchResult } from "@/lib/supabase/queries/sales-order";
import { searchCustomersAction } from "./client-actions";

type CustomerPickerProps = {
  selected: CustomerSearchResult | null;
  onSelect: (customer: CustomerSearchResult) => void;
  onClear: () => void;
};

export function CustomerPicker({
  selected,
  onSelect,
  onClear,
}: CustomerPickerProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const list = await searchCustomersAction(term);
          setResults(list);
        } catch {
          setResults([]);
        }
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [term, open]);

  if (selected) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-border-light bg-bg-surface px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-lg font-bold text-primary">
          {selected.name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="text-[16px] font-bold text-text-primary">
            {selected.name}
          </div>
          <div className="mt-1 flex flex-wrap gap-4 text-[13px] text-text-secondary">
            {selected.address && <span>📍 {selected.address}</span>}
            {selected.phone && <span>📞 {selected.phone}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onClear();
            setOpen(true);
          }}
          className="rounded-lg border border-border-default px-4 py-2 text-[13px] font-semibold text-text-primary transition-colors hover:bg-bg-muted"
        >
          変更する
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-default bg-bg-surface px-5 py-8 text-[15px] font-semibold text-text-secondary transition-colors hover:border-primary hover:bg-primary-lighter hover:text-primary"
      >
        <SearchIcon className="h-5 w-5" strokeWidth={2} />
        お客様を選んでください
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border-light bg-bg-surface p-5 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted"
          strokeWidth={2}
        />
        <TextInput
          ref={inputRef}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="お客様の名前、コード、フリガナで検索..."
          className="pl-10 pr-10"
        />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted hover:bg-bg-muted"
          aria-label="閉じる"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>
      <div className="mt-3 max-h-80 overflow-y-auto">
        {results.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-text-muted">
            条件に合うお客様が見つかりませんでした
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {results.map((c) => (
              <li key={c.customerCode}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(c);
                    setOpen(false);
                    setTerm("");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-primary-lighter"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-[15px] font-bold text-primary">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="text-[14px] font-bold text-text-primary">
                      {c.name}
                    </div>
                    <div className="text-[12px] text-text-secondary">
                      {c.customerCode} {c.address ? `／ ${c.address}` : ""}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
