import { z } from "zod";

export const productFormSchema = z.object({
  productCode: z
    .string()
    .trim()
    .regex(/^$|^\d{8}$/, "商品コードは数字8桁で入力してください")
    .optional()
    .default(""),
  name: z.string().trim().min(1, "商品名を入力してください"),
  janCode: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine(
      (v) => v === "" || /^\d{8,13}$/.test(v),
      "JANコードは数字8〜13桁で入力してください"
    ),
  unitsPerCase: z.coerce
    .number()
    .int("入数は整数で入力してください")
    .min(1, "入数は1以上で入力してください")
    .default(1),
  defaultSalesUnitPrice: z.coerce
    .number()
    .min(0, "売上単価は0以上の数値で入力してください"),
  defaultPurchaseUnitPrice: z
    .union([z.coerce.number().min(0, "仕入単価は0以上の数値で入力してください"), z.literal("").transform(() => null)])
    .optional()
    .nullable(),
  defaultTaxRate: z.union([z.literal(0.1), z.literal(0.08)], {
    message: "税率を選んでください",
  }),
  defaultOrderType: z.enum(["stock", "order_at_sale", "manual_order"], {
    message: "仕入方法を選んでください",
  }),
  initialStock: z.coerce
    .number()
    .int("在庫数は整数で入力してください")
    .min(0, "在庫数は0以上で入力してください")
    .optional()
    .default(0),
});

export type ProductFormValues = z.input<typeof productFormSchema>;
export type ProductFormParsed = z.output<typeof productFormSchema>;
