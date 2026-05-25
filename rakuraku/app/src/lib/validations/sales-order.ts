import { z } from "zod";

const lineSchema = z.object({
  productCode: z.string().trim().min(1, "商品を選んでください"),
  productName: z.string().trim().min(1),
  quantity: z.coerce
    .number()
    .int("数量は整数で入力してください")
    .min(1, "数量は1以上で入力してください"),
  unitPrice: z.coerce
    .number()
    .min(0, "単価は0以上で入力してください"),
  taxRate: z.union([z.literal(0.1), z.literal(0.08)], {
    message: "税率を選んでください",
  }),
  orderType: z.enum(["stock", "order_at_sale", "manual_order"]),
});

export const salesOrderFormSchema = z.object({
  customerCode: z.string().trim().min(1, "お客様を選んでください"),
  deliveryAddressId: z
    .string()
    .trim()
    .optional()
    .default("")
    .transform((v) => (v ? v : "")),
  orderDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "注文日を選んでください"),
  deliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "納品予定日を選んでください"),
  note: z.string().optional().default(""),
  lines: z
    .array(lineSchema)
    .min(1, "商品を1行以上入れてください"),
});

export type SalesOrderFormValues = z.input<typeof salesOrderFormSchema>;
export type SalesOrderFormParsed = z.output<typeof salesOrderFormSchema>;
export type SalesOrderLineInput = z.input<typeof lineSchema>;
