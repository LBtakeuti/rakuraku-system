import { z } from "zod";

export const deliveryConfirmSchema = z.object({
  orderIds: z
    .array(z.string().uuid("不正な受注IDが含まれています"))
    .min(1, "納品する注文を1件以上選んでください"),
  deliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "納品日を選んでください"),
});

export type DeliveryConfirmValues = z.input<typeof deliveryConfirmSchema>;
export type DeliveryConfirmParsed = z.output<typeof deliveryConfirmSchema>;
