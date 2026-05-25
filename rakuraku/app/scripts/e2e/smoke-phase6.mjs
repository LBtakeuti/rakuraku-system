#!/usr/bin/env node
// 実DBスモーク（フェーズ6: 請求業務）
// - Playwright を使わず @supabase/supabase-js で直接 CRUD + 整合性確認
// - フェーズ5までの全テーブル到達性 + 請求テーブル(billing_statement, billing_statement_line) + CRUD
// - テストデータは [E2E_TEST] プレフィックス、終了時に必ずクリーンアップ

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../../.env.local");
const envText = readFileSync(envPath, "utf-8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PREFIX = "[E2E_TEST]";
const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}${detail ? ` :: ${detail}` : ""}`);
}

async function cleanup() {
  // 依存順を考慮した削除（FK制約に従う）
  const customerCodes = (
    await supa.from("customer").select("customer_code").like("name", `${PREFIX}%`)
  ).data?.map((r) => r.customer_code) ?? [];

  if (customerCodes.length > 0) {
    const statementIds =
      (await supa.from("billing_statement").select("id").in("customer_code", customerCodes)).data?.map(
        (r) => r.id,
      ) ?? [];
    if (statementIds.length > 0) {
      await supa.from("billing_statement_line").delete().in("billing_statement_id", statementIds);
      await supa
        .from("sales_invoice")
        .update({ billing_statement_id: null, billing_status: "unbilled" })
        .in("billing_statement_id", statementIds);
      await supa.from("billing_statement").delete().in("id", statementIds);
    }
    const invoiceIds =
      (await supa.from("sales_invoice").select("id").in("customer_code", customerCodes)).data?.map(
        (r) => r.id,
      ) ?? [];
    if (invoiceIds.length > 0) {
      await supa.from("sales_invoice_line").delete().in("sales_invoice_id", invoiceIds);
      await supa.from("sales_invoice").delete().in("id", invoiceIds);
    }
    await supa.from("customer").delete().in("customer_code", customerCodes);
  }
}

async function run() {
  // 1. フェーズ6 新規テーブル整合確認
  const phase6Tables = ["billing_statement", "billing_statement_line"];
  for (const t of phase6Tables) {
    const { error, count } = await supa.from(t).select("*", { count: "exact", head: true });
    record(
      `SC-BILL-DB-001 ${t} 到達性`,
      !error,
      error ? error.message : `count=${count ?? "n/a"}`,
    );
  }

  // 2. フェーズ5までの全テーブル到達性（共通基盤マイグレーション後の整合）
  const allTables = [
    "customer",
    "product",
    "product_stock",
    "stock_movement",
    "sales_order",
    "sales_order_line",
    "sales_order_line_allocation",
    "purchase_order",
    "purchase_order_line",
    "sales_invoice",
    "sales_invoice_line",
    "staff",
    "warehouse",
    "supplier",
    "payment",
    "payment_allocation",
    "delivery_address",
  ];
  for (const t of allTables) {
    const { error } = await supa.from(t).select("*", { count: "exact", head: true });
    record(`SC-DB-001 ${t} 到達性`, !error, error?.message ?? "ok");
  }

  // 3. 既存シードデータ非破壊
  const { data: staff } = await supa.from("staff").select("name");
  record(
    "SC-DB-002 staff シードが3名以上維持（既存データ非破壊）",
    (staff?.length ?? 0) >= 3,
    `count=${staff?.length}`,
  );
  const { data: wh } = await supa.from("warehouse").select("id");
  record(
    "SC-DB-003 warehouse シード維持（既存データ非破壊）",
    (wh?.length ?? 0) >= 1,
    `count=${wh?.length}`,
  );

  // 4. E2E_TEST データ事前残骸チェック
  const preCleanupTargets = [
    ["customer", "name"],
    ["billing_statement", "statement_no"],
  ];
  for (const [t, col] of preCleanupTargets) {
    const { count } = await supa
      .from(t)
      .select("*", { count: "exact", head: true })
      .like(col, t === "billing_statement" ? `%E2E%` : `${PREFIX}%`);
    record(
      `SC-CLEANUP-PRE ${t} に E2E_TEST 残骸なし`,
      (count ?? 0) === 0,
      `count=${count}`,
    );
  }

  // 5. 請求書発行に必要なCRUD（customer + sales_invoice + billing_statement の最小チェーン）
  const tsTag = Date.now().toString(36);
  const testCustCode = `e2e6-${tsTag}`;
  const { error: custErr } = await supa.from("customer").insert({
    customer_code: testCustCode,
    name: `${PREFIX} 請求テスト顧客 ${tsTag}`,
    status: "active",
  });
  record("SC-CRUD-001 customer INSERT", !custErr, custErr?.message ?? "");

  let invoiceId = null;
  if (!custErr) {
    const invoiceNo = `E2E-INV-${tsTag}`;
    const { data: inv, error: invErr } = await supa
      .from("sales_invoice")
      .insert({
        invoice_no: invoiceNo,
        customer_code: testCustCode,
        invoice_date: "2026-04-20",
        subtotal: 1000,
        tax_amount: 100,
        total_amount: 1100,
        billing_status: "unbilled",
      })
      .select("id")
      .single();
    record("SC-CRUD-002 sales_invoice INSERT", !invErr, invErr?.message ?? "");
    invoiceId = inv?.id ?? null;
  }

  // 6. billing_statement INSERT + billing_statement_line INSERT + sales_invoice 紐付け更新
  let statementId = null;
  if (invoiceId) {
    const statementNo = `E2E-B${tsTag}`;
    const { data: stmt, error: stmtErr } = await supa
      .from("billing_statement")
      .insert({
        statement_no: statementNo,
        customer_code: testCustCode,
        period_from: "2026-03-21",
        period_to: "2026-04-20",
        issue_date: "2026-04-20",
        due_date: "2026-05-31",
        previous_balance: 0,
        current_amount: 1100,
        total_due: 1100,
        status: "unpaid",
      })
      .select("id")
      .single();
    record("SC-BILL-CRUD-001 billing_statement INSERT", !stmtErr, stmtErr?.message ?? "");
    statementId = stmt?.id ?? null;

    if (statementId) {
      const { error: lineErr } = await supa.from("billing_statement_line").insert({
        billing_statement_id: statementId,
        sales_invoice_id: invoiceId,
        line_no: 1,
      });
      record("SC-BILL-CRUD-002 billing_statement_line INSERT", !lineErr, lineErr?.message ?? "");

      // sales_invoice 紐付け更新
      const { error: updErr } = await supa
        .from("sales_invoice")
        .update({ billing_statement_id: statementId, billing_status: "billed" })
        .eq("id", invoiceId);
      record("SC-BILL-CRUD-003 sales_invoice billing 紐付け更新", !updErr, updErr?.message ?? "");

      // 紐付け確認
      const { data: invCheck } = await supa
        .from("sales_invoice")
        .select("billing_status, billing_statement_id")
        .eq("id", invoiceId)
        .single();
      record(
        "SC-BILL-CRUD-004 sales_invoice.billing_status='billed'",
        invCheck?.billing_status === "billed" && invCheck?.billing_statement_id === statementId,
        `status=${invCheck?.billing_status}, statement_id=${invCheck?.billing_statement_id}`,
      );

      // JOINクエリで billing_statement → billing_statement_line → sales_invoice が引けるか
      const { data: joinCheck, error: joinErr } = await supa
        .from("billing_statement_line")
        .select("id, sales_invoice:sales_invoice_id(invoice_no, total_amount)")
        .eq("billing_statement_id", statementId);
      record(
        "SC-BILL-CRUD-005 JOIN クエリ（billing_statement_line + sales_invoice）",
        !joinErr && (joinCheck?.length ?? 0) === 1,
        joinErr?.message ?? `lines=${joinCheck?.length}`,
      );
    }
  }

  // 7. クリーンアップ
  await cleanup();

  // 8. クリーンアップ後の残骸チェック
  for (const [t, col, like] of [
    ["customer", "name", `${PREFIX}%`],
    ["sales_invoice", "invoice_no", `E2E-INV-%`],
    ["billing_statement", "statement_no", `E2E-B%`],
  ]) {
    const { count } = await supa
      .from(t)
      .select("*", { count: "exact", head: true })
      .like(col, like);
    record(`SC-CLEANUP-POST ${t} 残骸なし`, (count ?? 0) === 0, `count=${count}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== Summary ===`);
  console.log(`Total: ${results.length}, Pass: ${results.length - failed.length}, Fail: ${failed.length}`);
  if (failed.length > 0) {
    console.log("\nFailed tests:");
    failed.forEach((f) => console.log(`  - ${f.name} :: ${f.detail}`));
    process.exit(1);
  }
}

run().catch(async (e) => {
  console.error("UNEXPECTED ERROR:", e);
  try {
    await cleanup();
  } catch {}
  process.exit(2);
});
