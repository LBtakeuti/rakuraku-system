import { z } from "zod";

const lineSchema = z.object({
  purchaseOrderLineId: z.string().uuid("不正な明細IDです"),
  productCode: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.coerce
    .number()
    .int("入荷数量は整数で入力してください")
    .min(0, "入荷数量は0以上で入力してください"),
  lotNo: z.string().optional().default(""),
  expiryDate: z
    .string()
    .optional()
    .default("")
    .refine(
      (v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v),
      "賞味期限は YYYY-MM-DD 形式で入力してください"
    ),
  isLotManaged: z.boolean().default(false),
  note: z.string().optional().default(""),
});

export const receivingFormSchema = z
  .object({
    purchaseOrderId: z.string().uuid("不正な発注IDです"),
    receivedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "入荷日を選んでください"),
    lines: z.array(lineSchema).min(1, "入荷する明細がありません"),
  })
  .superRefine((data, ctx) => {
    let totalNonZero = 0;
    data.lines.forEach((line, idx) => {
      if (line.quantity > 0) totalNonZero += 1;
      if (line.isLotManaged && line.quantity > 0) {
        if (!line.expiryDate) {
          ctx.addIssue({
            code: "custom",
            path: ["lines", idx, "expiryDate"],
            message: "期限管理商品は賞味期限を入力してください",
          });
        }
      }
    });
    if (totalNonZero === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["lines"],
        message: "1行以上で入荷数量を入力してください",
      });
    }
  });

export type ReceivingFormValues = z.input<typeof receivingFormSchema>;
export type ReceivingFormParsed = z.output<typeof receivingFormSchema>;
export type ReceivingLineInput = z.input<typeof lineSchema>;
