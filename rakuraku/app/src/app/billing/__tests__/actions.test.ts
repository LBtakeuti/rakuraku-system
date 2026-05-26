import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type MockResponse } from "@/test-utils/supabase-mock";
import type { BillingSummaryRow } from "@/types/billing";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`__REDIRECT__:${path}`);
  }),
}));
vi.mock("@/lib/utils/numbering", () => ({
  nextBillingNumber: vi.fn(async () => "B202605001"),
}));
type AggregateFn = (
  closingDay: number,
  periodFrom: string,
  periodTo: string
) => Promise<BillingSummaryRow[]>;
const aggregateMock = vi.fn<AggregateFn>(async () => []);
vi.mock("@/lib/supabase/queries/billing", () => ({
  aggregateBillingForPeriod: ((closingDay, periodFrom, periodTo) =>
    aggregateMock(closingDay, periodFrom, periodTo)) satisfies AggregateFn,
}));

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { nextBillingNumber } from "@/lib/utils/numbering";
import { issueBillingStatements } from "../actions";

const mockedCreate = vi.mocked(createClient);
const mockedRedirect = vi.mocked(redirect);
const mockedNextNo = vi.mocked(nextBillingNumber);

beforeEach(() => {
  mockedCreate.mockReset();
  mockedRedirect.mockClear();
  mockedNextNo.mockClear();
  mockedNextNo.mockResolvedValue("B202605001");
  aggregateMock.mockReset();
  aggregateMock.mockResolvedValue([]);
});

function makeFormData(payload: unknown): FormData {
  const fd = new FormData();
  fd.set("payload", JSON.stringify(payload));
  return fd;
}

function customer(overrides: Partial<BillingSummaryRow> = {}): BillingSummaryRow {
  return {
    customerCode: "000001",
    customerName: "A社",
    invoiceFormat: "invoice_only",
    closingDay: 31,
    paymentCycle: "翌月末",
    invoiceTaxType: "per_invoice",
    taxRounding: "floor",
    previousBalance: 0,
    paymentAmount: 0,
    carryOver: 0,
    currentSubtotal: 1000,
    currentTax: 100,
    currentTotal: 1100,
    totalDue: 1100,
    invoiceIds: ["inv-1"],
    paymentDueDate: "2026-06-30",
    ...overrides,
  };
}

const validBase = {
  customerCodes: ["000001"],
  periodFrom: "2026-05-01",
  periodTo: "2026-05-31",
  closingDay: 31,
};

describe("issueBillingStatements（バリデーション）", () => {
  it("payload が無いと formError", async () => {
    const r = await issueBillingStatements(null, new FormData());
    expect(r).toEqual({
      success: false,
      fieldErrors: {},
      formError: "送信データが壊れています",
    });
  });

  it("payload が不正 JSON で formError", async () => {
    const fd = new FormData();
    fd.set("payload", "{bad");
    const r = await issueBillingStatements(null, fd);
    expect(r).toEqual({
      success: false,
      fieldErrors: {},
      formError: "送信データの形式が不正です",
    });
  });

  it("customerCodes が空だと fieldError", async () => {
    const r = await issueBillingStatements(
      null,
      makeFormData({ ...validBase, customerCodes: [] })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(Object.keys(r.fieldErrors).length).toBeGreaterThan(0);
    }
  });
});

describe("issueBillingStatements（ハッピーパス）", () => {
  it("1 顧客：billing_statement + line INSERT、sales_invoice の billing_status='billed' に UPDATE、redirect /billing?issued=1&failed=0", async () => {
    aggregateMock.mockResolvedValue([
      customer({ invoiceIds: ["inv-1", "inv-2"] }),
    ]);
    const sb = createSupabaseMock({
      billing_statement: { data: { id: "stmt-1" } },
      billing_statement_line: [
        { data: { id: "bsl-1" } } as MockResponse,
        { data: { id: "bsl-2" } } as MockResponse,
      ],
      // 各 invoice の旧値読み込み × 2
      sales_invoice: [
        { data: { billing_statement_id: null, billing_status: "unbilled" } } as MockResponse,
        { data: { billing_statement_id: null, billing_status: "unbilled" } } as MockResponse,
      ],
    });
    mockedCreate.mockResolvedValue(sb as never);

    await expect(
      issueBillingStatements(null, makeFormData(validBase))
    ).rejects.toThrow(/__REDIRECT__:\/billing\?issued=1&failed=0/);

    // billing_statement INSERT の payload
    const stmtInserts = sb._calls.insert.filter(
      (c) => c.table === "billing_statement"
    );
    expect(stmtInserts).toHaveLength(1);
    const p = stmtInserts[0].payload as Record<string, unknown>;
    expect(p.statement_no).toBe("B202605001");
    expect(p.customer_code).toBe("000001");
    expect(p.period_from).toBe("2026-05-01");
    expect(p.period_to).toBe("2026-05-31");
    expect(p.due_date).toBe("2026-06-30");
    expect(p.previous_balance).toBe(0);
    expect(p.current_amount).toBe(1100);
    expect(p.total_due).toBe(1100);
    expect(p.status).toBe("unpaid");

    // billing_statement_line 2 件
    expect(
      sb._calls.insert.filter((c) => c.table === "billing_statement_line")
    ).toHaveLength(2);

    // sales_invoice の UPDATE: billing_status='billed' × 2
    const invoiceUpdates = sb._calls.update.filter(
      (c) => c.table === "sales_invoice"
    );
    expect(invoiceUpdates).toHaveLength(2);
    expect(
      (invoiceUpdates[0].payload as Record<string, unknown>).billing_status
    ).toBe("billed");

    expect(mockedRedirect).toHaveBeenCalledWith(
      "/billing?issued=1&failed=0"
    );
  });

  it("複数顧客：採番が顧客分呼ばれ、redirect /billing?issued=2&failed=0", async () => {
    aggregateMock.mockResolvedValue([
      customer({ customerCode: "000001", invoiceIds: ["inv-1"] }),
      customer({ customerCode: "000002", invoiceIds: ["inv-2"] }),
    ]);
    mockedNextNo.mockReset();
    mockedNextNo.mockResolvedValueOnce("B202605001");
    mockedNextNo.mockResolvedValueOnce("B202605002");

    const sb = createSupabaseMock({
      billing_statement: [
        { data: { id: "stmt-1" } } as MockResponse,
        { data: { id: "stmt-2" } } as MockResponse,
      ],
      billing_statement_line: [
        { data: { id: "bsl-1" } } as MockResponse,
        { data: { id: "bsl-2" } } as MockResponse,
      ],
      sales_invoice: { data: { billing_statement_id: null, billing_status: "unbilled" } },
    });
    mockedCreate.mockResolvedValue(sb as never);

    await expect(
      issueBillingStatements(
        null,
        makeFormData({ ...validBase, customerCodes: ["000001", "000002"] })
      )
    ).rejects.toThrow(/__REDIRECT__:\/billing\?issued=2&failed=0/);

    expect(mockedNextNo).toHaveBeenCalledTimes(2);
  });

  it("aggregate に存在しない customer は failed としてカウントされる", async () => {
    aggregateMock.mockResolvedValue([customer({ customerCode: "000001" })]);
    const sb = createSupabaseMock({
      billing_statement: { data: { id: "stmt-1" } },
      billing_statement_line: { data: { id: "bsl-1" } },
      sales_invoice: { data: { billing_statement_id: null, billing_status: "unbilled" } },
    });
    mockedCreate.mockResolvedValue(sb as never);

    await expect(
      issueBillingStatements(
        null,
        makeFormData({
          ...validBase,
          customerCodes: ["000001", "999999"], // 999999 は aggregate に無い
        })
      )
    ).rejects.toThrow(/__REDIRECT__:\/billing\?issued=1&failed=1/);
  });

  it("aggregate が空 && customerCodes も無し → 発行対象がなく formError", async () => {
    aggregateMock.mockResolvedValue([]);
    const sb = createSupabaseMock({});
    mockedCreate.mockResolvedValue(sb as never);

    // customerCodes は最低 1 件必要なので、aggregate も空 + 1 件指定 で failedCount=1 → ok と扱われ redirect する
    // 「発行対象がなく formError」のパスは「statementIds=0 && failedCount=0」が必要だが、
    // customerCodes は schema で最低 1 件 → そのケースは現実的には発生しない。
    // ここでは customerCodes 不一致で failedCount=1 になり redirect されるパスで挙動を確認する。
    await expect(
      issueBillingStatements(
        null,
        makeFormData({ ...validBase, customerCodes: ["999999"] })
      )
    ).rejects.toThrow(/__REDIRECT__:\/billing\?issued=0&failed=1/);
  });
});

describe("issueBillingStatements（補償処理 / rollback）", () => {
  it("statement_line INSERT で error が出ると billing_statement が補償 delete され failed=1", async () => {
    aggregateMock.mockResolvedValue([customer({ invoiceIds: ["inv-1"] })]);
    const sb = createSupabaseMock({
      billing_statement: { data: { id: "stmt-1" } },
      // statement_line で error
      billing_statement_line: {
        data: null,
        error: { message: "明細 INSERT 失敗" },
      },
    });
    mockedCreate.mockResolvedValue(sb as never);

    await expect(
      issueBillingStatements(null, makeFormData(validBase))
    ).rejects.toThrow(/__REDIRECT__:\/billing\?issued=0&failed=1/);

    // billing_statement に delete
    const deletes = sb._calls.delete.filter(
      (c) => c.table === "billing_statement"
    );
    expect(deletes).toHaveLength(1);
  });

  it("sales_invoice UPDATE で error → 当該 customer の補償処理（statement と line を delete）が走り、redirect は到達", async () => {
    aggregateMock.mockResolvedValue([customer({ invoiceIds: ["inv-1"] })]);
    const sb = createSupabaseMock({
      billing_statement: { data: { id: "stmt-1" } },
      billing_statement_line: { data: { id: "bsl-1" } },
      // sales_invoice の SELECT は OK だが UPDATE で error
      // 1 回目の SELECT は成功させる。Update で error が起きるためには
      // ヘルパは select の戻り値と update の戻り値を別管理していない。
      // ここでは sales_invoice の data を「SELECT 用」「UPDATE 用」と並べる代わりに、
      // update 経由のチェーンが consume するので両方カバーする error 設定にする。
      sales_invoice: [
        // 1: SELECT (single) → 成功
        { data: { billing_statement_id: null, billing_status: "unbilled" } } as MockResponse,
        // 2: UPDATE (thenable consume) → error
        { data: null, error: { message: "invoice UPDATE 失敗" } } as MockResponse,
      ],
    });
    mockedCreate.mockResolvedValue(sb as never);

    await expect(
      issueBillingStatements(null, makeFormData(validBase))
    ).rejects.toThrow(/__REDIRECT__:\/billing\?issued=0&failed=1/);

    // 補償: statement と line が delete される
    const deletes = sb._calls.delete.map((c) => c.table).sort();
    expect(deletes).toContain("billing_statement");
    expect(deletes).toContain("billing_statement_line");
  });

  it("複数顧客で 1 件成功 / 1 件失敗：成功分は commit、失敗分のみ補償で巻き戻し、redirect issued=1&failed=1", async () => {
    aggregateMock.mockResolvedValue([
      customer({ customerCode: "000001", invoiceIds: ["inv-1"] }),
      customer({ customerCode: "000002", invoiceIds: ["inv-2"] }),
    ]);
    mockedNextNo.mockReset();
    mockedNextNo.mockResolvedValueOnce("B202605001");
    mockedNextNo.mockResolvedValueOnce("B202605002");

    const sb = createSupabaseMock({
      billing_statement: [
        { data: { id: "stmt-1" } } as MockResponse,
        { data: { id: "stmt-2" } } as MockResponse,
      ],
      billing_statement_line: [
        // 1 件目 OK
        { data: { id: "bsl-1" } } as MockResponse,
        // 2 件目で error
        {
          data: null,
          error: { message: "2 件目 明細 失敗" },
        } as MockResponse,
      ],
      sales_invoice: { data: { billing_statement_id: null, billing_status: "unbilled" } },
    });
    mockedCreate.mockResolvedValue(sb as never);

    await expect(
      issueBillingStatements(
        null,
        makeFormData({ ...validBase, customerCodes: ["000001", "000002"] })
      )
    ).rejects.toThrow(/__REDIRECT__:\/billing\?issued=1&failed=1/);

    // 1 件目は commit、2 件目だけ delete
    const stmtDeletes = sb._calls.delete.filter(
      (c) => c.table === "billing_statement"
    );
    expect(stmtDeletes).toHaveLength(1);
  });
});
