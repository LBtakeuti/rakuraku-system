"use client";

import {
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Plus, Trash2 } from "lucide-react";
import type {
  Control,
  FieldArrayWithId,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormGetValues,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { useWatch } from "react-hook-form";
import { searchProductsAction } from "./client-actions";
import type { ProductSearchResult } from "@/types/sales-order";
import type { OrderType, TaxRate } from "@/types/product";
import type { SalesOrderFormValues } from "@/lib/validations/sales-order";
import { cn } from "@/lib/utils";

export type OrderLineFormRow = {
  productCode: string;
  productName: string;
  productMeta?: string;
  quantity: number;
  unitPrice: number;
  taxRate: TaxRate;
  orderType: OrderType;
};

type Lines = SalesOrderFormValues["lines"];
type LineField = FieldArrayWithId<SalesOrderFormValues, "lines", "id">;

type OrderLineEditorProps = {
  fields: LineField[];
  append: UseFieldArrayAppend<SalesOrderFormValues, "lines">;
  remove: UseFieldArrayRemove;
  control: Control<SalesOrderFormValues>;
  setValue: UseFormSetValue<SalesOrderFormValues>;
  watch: UseFormWatch<SalesOrderFormValues>;
  getValues: UseFormGetValues<SalesOrderFormValues>;
};

function newRow(): Lines[number] {
  return {
    productCode: "",
    productName: "",
    productMeta: "",
    quantity: 0,
    unitPrice: 0,
    taxRate: 0.1,
    orderType: "order_at_sale",
  };
}

function formatYen(v: number): string {
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

export function OrderLineEditor({
  fields,
  append,
  remove,
  control,
  setValue,
  watch,
  getValues,
}: OrderLineEditorProps) {
  const [undoItem, setUndoItem] = useState<
    { line: Lines[number]; index: number } | null
  >(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (fields.length === 0) {
      append(newRow());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.length]);

  useEffect(() => {
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, []);

  const addRow = () => append(newRow());

  const removeRow = (idx: number) => {
    const current = getValues(`lines.${idx}`);
    remove(idx);
    setUndoItem({ line: current as Lines[number], index: idx });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoItem(null), 6000);
  };

  const undo = () => {
    if (!undoItem) return;
    const lines = getValues("lines") ?? [];
    const next = [...lines];
    next.splice(undoItem.index, 0, undoItem.line);
    setValue("lines", next, { shouldValidate: false, shouldDirty: true });
    setUndoItem(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-border-light bg-bg-surface shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center gap-4 border-b border-border-light bg-primary-lighter px-4 py-2.5 text-[12px] font-semibold text-primary">
          <span className="inline-flex items-center gap-1">
            数量入力中に <Kbd>↓</Kbd> で新しい行
          </span>
          <span className="inline-flex items-center gap-1">
            商品名を入力して候補から選ぶ
          </span>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-light bg-bg-muted text-[12px] font-semibold text-text-secondary">
              <th className="w-8 px-2 py-3" />
              <th className="w-12 px-2 py-3 text-center">行</th>
              <th className="px-3 py-3">商品名 / JANコード</th>
              <th className="w-24 px-3 py-3 text-center">数量</th>
              <th className="w-28 px-3 py-3 text-right">単価</th>
              <th className="w-28 px-3 py-3 text-right">金額</th>
              <th className="w-20 px-3 py-3 text-center">税率</th>
              <th className="w-12 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {fields.map((field, idx) => (
              <LineRow
                key={field.id}
                index={idx}
                control={control}
                setValue={setValue}
                getValues={getValues}
                onRemove={() => removeRow(idx)}
                onAddRow={addRow}
              />
            ))}
          </tbody>
        </table>
        <div className="border-t border-border-light p-3">
          <button
            type="button"
            onClick={addRow}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-[#93c5fd] bg-primary-lighter px-4 py-3.5 text-[15px] font-bold text-primary transition-all hover:-translate-y-px hover:border-primary hover:bg-[#c7e0ff] hover:shadow-[0_4px_12px_rgba(29,78,216,0.15)]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
            商品の行を追加する
          </button>
        </div>
      </div>

      <Totals watch={watch} />

      {undoItem && (
        <div
          role="status"
          className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full bg-text-primary px-5 py-3 text-[14px] font-semibold text-white shadow-lg"
        >
          <span>行を削除しました</span>
          <button
            type="button"
            onClick={undo}
            className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-bold text-white transition-colors hover:bg-white/25"
          >
            元に戻す
          </button>
        </div>
      )}
    </div>
  );
}

function Totals({ watch }: { watch: UseFormWatch<SalesOrderFormValues> }) {
  const lines = (watch("lines") ?? []) as OrderLineFormRow[];
  const subtotal = lines.reduce(
    (acc, l) => acc + Math.round((Number(l.unitPrice) || 0) * (Number(l.quantity) || 0)),
    0
  );
  const taxByRate = lines.reduce<Record<string, number>>((acc, l) => {
    const sub = Math.round((Number(l.unitPrice) || 0) * (Number(l.quantity) || 0));
    const rate = (l.taxRate ?? 0.1) as number;
    const key = String(rate);
    acc[key] = (acc[key] ?? 0) + Math.round(sub * rate);
    return acc;
  }, {});
  const tax10 = taxByRate["0.1"] ?? 0;
  const tax8 = taxByRate["0.08"] ?? 0;
  const totalTax = tax10 + tax8;
  const grandTotal = subtotal + totalTax;

  return (
    <div className="mt-6 flex justify-end">
      <div className="min-w-[280px] rounded-2xl border border-border-light bg-bg-surface px-5 py-4 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between border-b border-border-light py-2 text-[14px]">
          <span className="text-text-secondary">小計</span>
          <span className="font-mono tabular-nums font-semibold">
            {formatYen(subtotal)}
          </span>
        </div>
        {tax10 > 0 && (
          <div className="flex items-center justify-between border-b border-border-light py-2 text-[14px]">
            <span className="text-text-secondary">消費税(10%)</span>
            <span className="font-mono tabular-nums font-semibold">
              {formatYen(tax10)}
            </span>
          </div>
        )}
        {tax8 > 0 && (
          <div className="flex items-center justify-between border-b border-border-light py-2 text-[14px]">
            <span className="text-text-secondary">消費税(8%)</span>
            <span className="font-mono tabular-nums font-semibold">
              {formatYen(tax8)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between py-3 text-[18px] font-bold">
          <span>合計</span>
          <span className="font-mono tabular-nums">{formatYen(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-primary-light bg-bg-surface px-1 text-[11px] font-bold text-primary">
      {children}
    </span>
  );
}

type LineRowProps = {
  index: number;
  control: Control<SalesOrderFormValues>;
  setValue: UseFormSetValue<SalesOrderFormValues>;
  getValues: UseFormGetValues<SalesOrderFormValues>;
  onRemove: () => void;
  onAddRow: () => void;
};

function LineRow({
  index,
  control,
  setValue,
  getValues,
  onRemove,
  onAddRow,
}: LineRowProps) {
  const productCode = useWatch({
    control,
    name: `lines.${index}.productCode`,
  }) as string | undefined;
  const productName = useWatch({
    control,
    name: `lines.${index}.productName`,
  }) as string | undefined;
  const productMeta = useWatch({
    control,
    name: `lines.${index}.productMeta`,
  }) as string | undefined;
  const quantityRaw = useWatch({
    control,
    name: `lines.${index}.quantity`,
  });
  const unitPriceRaw = useWatch({
    control,
    name: `lines.${index}.unitPrice`,
  });
  const taxRate = useWatch({
    control,
    name: `lines.${index}.taxRate`,
  }) as TaxRate | undefined;
  const quantity = Number(quantityRaw) || 0;
  const unitPrice = Number(unitPriceRaw) || 0;

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(productName ?? "");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setSearchTerm(productName ?? "");
  }, [productName]);

  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(() => {
      startTransition(async () => {
        try {
          const list = await searchProductsAction(searchTerm);
          setResults(list);
        } catch {
          setResults([]);
        }
      });
    }, 180);
    return () => clearTimeout(t);
  }, [searchOpen, searchTerm]);

  const selectProduct = (p: ProductSearchResult) => {
    const meta = [
      p.janCode ? `JAN: ${p.janCode}` : null,
      `1ケース ${p.unitsPerCase}個`,
      p.isStocked
        ? `引当可能 ${Math.max(0, p.totalOnHand - p.totalAllocated).toLocaleString("ja-JP")}個`
        : null,
    ]
      .filter(Boolean)
      .join(" / ");
    setValue(`lines.${index}.productCode`, p.productCode);
    setValue(`lines.${index}.productName`, p.name);
    setValue(`lines.${index}.productMeta`, meta);
    setValue(`lines.${index}.unitPrice`, p.defaultSalesUnitPrice ?? 0);
    setValue(`lines.${index}.taxRate`, p.defaultTaxRate);
    setValue(`lines.${index}.orderType`, p.defaultOrderType);
    setSearchOpen(false);
  };

  const handleQtyKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const lines = getValues("lines") ?? [];
      if (index === lines.length - 1) {
        onAddRow();
      }
    }
  };

  const amount = Math.round(unitPrice * quantity);

  return (
    <tr className="border-b border-border-light text-[14px] last:border-b-0">
      <td className="w-2 px-1 py-2" />
      <td className="px-2 py-2 text-center font-mono tabular-nums text-text-secondary">
        {index + 1}
      </td>
      <td className="relative px-3 py-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setSearchOpen(true);
            if (productCode) {
              setValue(`lines.${index}.productCode`, "");
              setValue(`lines.${index}.productName`, "");
              setValue(`lines.${index}.productMeta`, "");
            }
          }}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
          placeholder="商品の名前または商品コードを入力..."
          className={cn(
            "w-full rounded-lg border bg-bg-surface px-3 py-2 text-[14px] transition-colors focus:outline-none focus:ring-2",
            productCode
              ? "border-transparent focus:border-primary focus:ring-primary/20"
              : "border-border-default focus:border-primary focus:ring-primary/20"
          )}
        />
        {productMeta && (
          <div className="mt-1 text-[12px] text-text-muted">{productMeta}</div>
        )}
        {searchOpen && results.length > 0 && (
          <div className="absolute left-3 right-3 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border-default bg-bg-surface shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
            {results.map((p) => (
              <button
                key={p.productCode}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectProduct(p)}
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors hover:bg-primary-lighter"
              >
                <div className="text-[14px] font-semibold text-text-primary">
                  {p.name}
                </div>
                <div className="text-[12px] text-text-secondary">
                  {p.productCode}
                  {p.janCode ? ` ／ JAN: ${p.janCode}` : ""}
                  {" ／ "}
                  {p.defaultSalesUnitPrice !== null
                    ? `¥${p.defaultSalesUnitPrice.toLocaleString("ja-JP")}`
                    : "単価未設定"}
                </div>
              </button>
            ))}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="number"
          min={0}
          value={quantity || ""}
          onChange={(e) =>
            setValue(`lines.${index}.quantity`, Number(e.target.value || 0))
          }
          onKeyDown={handleQtyKey}
          placeholder="0"
          className="w-full rounded-lg border border-border-default bg-bg-surface px-2 py-2 text-right font-mono tabular-nums text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </td>
      <td className="px-3 py-2 text-right">
        <input
          type="number"
          min={0}
          value={unitPrice || ""}
          onChange={(e) =>
            setValue(`lines.${index}.unitPrice`, Number(e.target.value || 0))
          }
          placeholder="0"
          className="w-full rounded-lg border border-border-default bg-bg-surface px-2 py-2 text-right font-mono tabular-nums text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </td>
      <td className="px-3 py-2 text-right font-mono tabular-nums">
        {formatYen(amount)}
      </td>
      <td className="px-3 py-2 text-center">
        <select
          value={String(taxRate ?? 0.1)}
          onChange={(e) =>
            setValue(
              `lines.${index}.taxRate`,
              Number(e.target.value) === 0.08 ? 0.08 : 0.1
            )
          }
          className="w-full appearance-none rounded-lg border border-border-default bg-bg-surface px-2 py-2 text-center text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="0.1">10%</option>
          <option value="0.08">8%</option>
        </select>
      </td>
      <td className="px-2 py-2">
        <button
          type="button"
          onClick={onRemove}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-danger-light hover:text-danger"
          aria-label={`${index + 1}行目を削除`}
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        </button>
      </td>
    </tr>
  );
}
