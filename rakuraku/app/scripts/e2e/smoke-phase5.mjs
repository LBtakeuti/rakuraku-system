#!/usr/bin/env node
// 実DBスモーク（フェーズ5: 納品・売上）
// - Playwright を使わず @supabase/supabase-js で直接 CRUD + 整合性確認
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
  const productCodes = (
    await supa.from("product").select("product_code").like("name", `${PREFIX}%`)
  ).data?.map((r) => r.product_code) ?? [];

  if (customerCodes.length > 0) {
    const invoiceIds =
      (await supa.from("sales_invoice").select("id").in("customer_code", customerCodes)).data?.map(
        (r) => r.id,
      ) ?? [];
    if (invoiceIds.length > 0) {
      await supa.from("sales_invoice_line").delete().in("sales_invoice_id", invoiceIds);
      await supa.from("sales_invoice").delete().in("id", invoiceIds);
    }
    const orderIds =
      (await supa.from("sales_order").select("id").in("customer_code", customerCodes)).data?.map(
        (r) => r.id,
      ) ?? [];
    if (orderIds.length > 0) {
      await supa.from("sales_order_line_allocation").delete().in("sales_order_id", orderIds);
      await supa.from("sales_order_line").delete().in("sales_order_id", orderIds);
      await supa.from("sales_order").delete().in("id", orderIds);
    }
  }
  if (productCodes.length > 0) {
    const stockIds =
      (await supa.from("product_stock").select("id").in("product_code", productCodes)).data?.map(
        (r) => r.id,
      ) ?? [];
    if (stockIds.length > 0) {
      await supa.from("stock_movement").delete().in("product_stock_id", stockIds);
      await supa.from("product_stock").delete().in("id", stockIds);
    }
    await supa.from("purchase_order_line").delete().in("product_code", productCodes);
  }
  await supa.from("purchase_order").delete().like("po_no", `%${PREFIX}%`).then(() => {});
  await supa.from("product").delete().like("name", `${PREFIX}%`);
  await supa.from("customer").delete().like("name", `${PREFIX}%`);
  await supa.from("supplier").delete().like("name", `${PREFIX}%`);
}

async function run() {
  // テーブル到達性スモーク（致命的不具合検知 = 共通基盤マイグレーション後の動作）
  const tables = [
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
  ];
  for (const t of tables) {
    const { error, count } = await supa.from(t).select("*", { count: "exact", head: true });
    record(
      `SC-DB-001 ${t} 到達性`,
      !error,
      error ? error.message : `count=${count ?? "n/a"}`,
    );
  }

  // 既存データ非破壊確認（staff シードが残っているか）
  const { data: staff, error: staffErr } = await supa
    .from("staff")
    .select("name")
    .order("name");
  record(
    "SC-DB-002 staff シードが3名（既存データ非破壊）",
    !staffErr && (staff?.length ?? 0) >= 3,
    staffErr ? staffErr.message : `count=${staff?.length}`,
  );

  // E2E_TEST データ事前残骸チェック
  const cleanupTargets = [
    ["customer", "name"],
    ["product", "name"],
    ["supplier", "name"],
  ];
  for (const [t, col] of cleanupTargets) {
    const { count } = await supa
      .from(t)
      .select("*", { count: "exact", head: true })
      .like(col, `${PREFIX}%`);
    record(
      `SC-CLEANUP-PRE ${t} に E2E_TEST 残骸なし`,
      (count ?? 0) === 0,
      `count=${count}`,
    );
  }

  // 簡易CRUD：customer の INSERT/SELECT/DELETE が動作するか
  const tsTag = Date.now().toString(36);
  const testCustomerCode = `e2etest-${tsTag}`;
  const { error: insErr } = await supa.from("customer").insert({
    customer_code: testCustomerCode,
    name: `${PREFIX} スモークテスト顧客 ${tsTag}`,
    status: "active",
  });
  record("SC-CRUD-001 customer INSERT", !insErr, insErr?.message ?? "");

  if (!insErr) {
    const { data: selData } = await supa
      .from("customer")
      .select("name")
      .eq("customer_code", testCustomerCode)
      .single();
    record(
      "SC-CRUD-002 customer SELECT",
      selData?.name?.startsWith(PREFIX) === true,
      selData?.name ?? "no data",
    );

    const { error: delErr } = await supa
      .from("customer")
      .delete()
      .eq("customer_code", testCustomerCode);
    record("SC-CRUD-003 customer DELETE", !delErr, delErr?.message ?? "");
  }

  // フェーズ5 sales_invoice の存在カラム整合性確認
  const { data: invSample, error: invErr } = await supa
    .from("sales_invoice")
    .select("id, invoice_no, customer_code, billing_status, total_amount")
    .limit(1);
  record(
    "SC-DEL-001 sales_invoice テーブル定義整合",
    !invErr,
    invErr?.message ?? `sampled=${invSample?.length ?? 0}`,
  );

  // フェーズ4積み残し：stock_movement のイベント種別が SELECT 可能か
  const { error: smErr } = await supa
    .from("stock_movement")
    .select("id, movement_type, quantity")
    .limit(1);
  record(
    "SC-RECV-FOLLOWUP stock_movement テーブル定義整合（補償処理連携）",
    !smErr,
    smErr?.message ?? "ok",
  );

  // 最終クリーンアップ
  await cleanup();
  const { count: postCustCount } = await supa
    .from("customer")
    .select("*", { count: "exact", head: true })
    .like("name", `${PREFIX}%`);
  record(
    "SC-CLEANUP-POST customer E2E_TEST 残骸なし",
    (postCustCount ?? 0) === 0,
    `count=${postCustCount}`,
  );

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
