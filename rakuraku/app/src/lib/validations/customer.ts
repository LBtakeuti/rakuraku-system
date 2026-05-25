import { z } from "zod";

const katakanaRegex = /^[゠-ヿ　-〿\sー゛゜]+$/;

export const customerFormSchema = z.object({
  customerCode: z
    .string()
    .trim()
    .regex(/^$|^\d{6}$/, "お客様コードは数字6桁で入力してください")
    .optional()
    .default(""),
  name: z
    .string()
    .trim()
    .min(1, "お客様の名前を入力してください。例: 株式会社サンプル"),
  nameKana: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine(
      (v) => v === "" || katakanaRegex.test(v),
      "フリガナはカタカナで入力してください"
    ),
  rank: z.enum(["A", "B", "C", "D"], {
    message: "お客様のランクを選んでください",
  }),
  staffId: z
    .string()
    .uuid("担当者を選んでください")
    .or(z.literal("").transform(() => "")),
  status: z.enum(["active", "paused", "closed"], {
    message: "取引の状態を選んでください",
  }),
  postalCode: z.string().trim().optional().default(""),
  address: z
    .string()
    .trim()
    .min(1, "住所を入力してください。例: 東京都千代田区丸の内1-1-1"),
  building: z.string().trim().optional().default(""),
  phone: z
    .string()
    .trim()
    .min(1, "電話番号を入力してください。例: 03-1234-5678"),
  fax: z.string().trim().optional().default(""),
  contactPerson: z.string().trim().optional().default(""),
  email: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine(
      (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "メールアドレスの形式が正しくありません。例: example@sample.co.jp"
    ),
  invoiceFormat: z.enum(["invoice_only", "invoice_delivery"], {
    message: "請求書の種類を選んでください",
  }),
  closingDay: z.coerce
    .number()
    .int()
    .min(1, "締め日を選んでください")
    .max(31, "締め日が不正です"),
  paymentCycle: z.string().trim().optional().default(""),
  invoiceTaxType: z.enum(["per_line", "per_voucher", "per_invoice"], {
    message: "消費税の計算方法を選んでください",
  }),
  taxRounding: z.enum(["floor", "round", "ceil"], {
    message: "消費税の端数処理を選んでください",
  }),
});

export type CustomerFormValues = z.input<typeof customerFormSchema>;
export type CustomerFormParsed = z.output<typeof customerFormSchema>;

export function isStep1Valid(values: CustomerFormValues): boolean {
  return (
    customerFormSchema.pick({
      name: true,
      nameKana: true,
      customerCode: true,
      rank: true,
      staffId: true,
      status: true,
    }).safeParse(values).success
  );
}

export function isStep2Valid(values: CustomerFormValues): boolean {
  return (
    customerFormSchema.pick({
      postalCode: true,
      address: true,
      building: true,
      phone: true,
      fax: true,
      contactPerson: true,
      email: true,
    }).safeParse(values).success
  );
}
