import { z } from "zod";

export const billingPeriodSchema = z.object({
  closingDay: z.coerce
    .number()
    .int()
    .min(1, "締め日を選んでください")
    .max(31, "締め日が不正です"),
  periodFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "開始日を選んでください"),
  periodTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "終了日（締め日）を選んでください"),
});

export const billingIssueSchema = z.object({
  customerCodes: z
    .array(z.string().min(1))
    .min(1, "発行するお客様を1社以上選んでください"),
  periodFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "対象期間 開始日が不正です"),
  periodTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "対象期間 終了日が不正です"),
  closingDay: z.coerce.number().int().min(1).max(31),
});

export type BillingPeriodValues = z.input<typeof billingPeriodSchema>;
export type BillingIssueValues = z.input<typeof billingIssueSchema>;
