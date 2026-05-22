# データモデル

## ER 図(概略)

```
customer ─┬─ delivery_address
          ├─ sales_order ──── sales_order_line ─── sales_order_line_allocation
          │                          │                      │
          │                          ▼                      ▼
          │                    sales_invoice          product_stock
          │                          │                      ▲
          │                    sales_invoice_line           │
          │                                                 │
          └─ billing_statement ─ billing_statement_line     │
                  ▲                                         │
                  │                                         │
              payment ── payment_allocation                 │
                                                            │
supplier ─── purchase_order ─── purchase_order_line ────────┘
                                       │
                                       ▼
                               stock_movement (履歴)

product ──── product_stock (在庫の実体、ロット別)
warehouse ─┘
```

## テーブル一覧(16 テーブル)

| カテゴリ | テーブル | 役割 |
|----------|----------|------|
| 共通 | `warehouse` | 倉庫マスター |
| 顧客 | `customer` | お客様(得意先)マスター |
| 顧客 | `delivery_address` | 届け先 |
| 商品 | `product` | 商品マスター |
| 商品 | `product_stock` | 在庫(商品×倉庫×ロット) |
| 商品 | `stock_movement` | 在庫移動履歴 |
| 仕入 | `supplier` | 仕入先マスター |
| 受注 | `sales_order` | 受注ヘッダ |
| 受注 | `sales_order_line` | 受注明細 |
| 受注 | `sales_order_line_allocation` | 受注明細とロットの紐付け |
| 発注 | `purchase_order` | 発注ヘッダ |
| 発注 | `purchase_order_line` | 発注明細 |
| 売上 | `sales_invoice` | 売上(納品書)ヘッダ |
| 売上 | `sales_invoice_line` | 売上明細 |
| 請求 | `billing_statement` | 請求書ヘッダ |
| 請求 | `billing_statement_line` | 請求明細(納品書を集約) |
| 入金 | `payment` | 入金ヘッダ |
| 入金 | `payment_allocation` | 入金消込 |
| 認証 | `staff` | 社員(担当者)マスター |

## 主要テーブルの定義

### warehouse(倉庫)
将来の複数倉庫対応用。当面は 1 件だけ登録。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid | PK |
| name | text | 倉庫名 |
| address | text | 住所 |
| is_default | bool | 既定倉庫フラグ |
| created_at | timestamptz | |

### customer(お客様)

| カラム | 型 | 説明 |
|--------|-----|------|
| customer_code | text (PK) | お客様コード(6桁) |
| name | text | 会社名・店舗名 |
| name_kana | text | フリガナ |
| parent_customer_code | text (FK→customer) | 親会社コード(NULL可) |
| postal_code | text | 郵便番号 |
| address | text | 住所 |
| building | text | 建物名・部屋番号 |
| phone | text | 電話番号 |
| fax | text | FAX(発注書のFAX送信に使用) |
| contact_person | text | 先方の担当者名 |
| email | text | メールアドレス |
| rank | text | A / B / C / D |
| status | text | active / paused / closed |
| staff_id | uuid (FK→staff) | 担当者 |
| invoice_format | text | 請求書の種類。invoice_only=請求書のみ / invoice_delivery=請求書+納品書 |
| closing_day | int | 締め日。1〜31。31 は末日締め |
| payment_cycle | text | 入金予定(翌月末/翌月20日など) |
| invoice_tax_type | text | 消費税計算単位。per_line=明細ごと / per_voucher=伝票ごと / per_invoice=請求書ごと |
| tax_rounding | text | 消費税端数処理。floor=切り捨て / round=四捨五入 / ceil=切り上げ |
| payment_method_default | text | 振込/現金/手形など |
| note | text | メモ |
| created_at | timestamptz | |
| updated_at | timestamptz | |

`invoice_format` は請求業務画面での帳票発行時に、請求書のみか請求書+納品書セットかを切り替えるために使う。`closing_day` は月次の締め期間の計算に使う。`invoice_tax_type` は請求一覧表の「区分」欄に対応する。

### delivery_address(届け先)
1 つのお客様に複数の届け先があり得る。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid (PK) | |
| customer_code | text (FK) | お客様 |
| name | text | 届け先名(○○支店 など) |
| postal_code | text | |
| address | text | |
| phone | text | |
| is_default | bool | 既定届け先フラグ |
| created_at | timestamptz | |

### product(商品)

| カラム | 型 | 説明 |
|--------|-----|------|
| product_code | text (PK) | 商品コード(8桁) |
| name | text | 商品名 |
| jan_code | text | バーコード |
| units_per_case | int | 入数(1ケースの個数) |
| default_sales_unit_price | numeric | 売上単価(税抜) |
| default_purchase_unit_price | numeric | 仕入単価(税抜) |
| default_tax_rate | numeric | 税率(0.10 / 0.08) |
| default_order_type | text | stock / order_at_sale / manual_order |
| is_stocked | bool | 在庫を持つか(default_order_type と連動) |
| is_lot_managed | bool | ロット管理ありか |
| safety_stock | int | 安全在庫(個単位) |
| alert_days_yellow | int | 期限警告(黄)の日数(既定 60) |
| alert_days_red | int | 期限警告(赤)の日数(既定 14) |
| supplier_code | text (FK→supplier) | 既定の仕入先 |
| status | text | active / discontinued |
| note | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

`default_order_type` の値:
- `stock`:在庫から出荷する(在庫を持つ)
- `order_at_sale`:注文時に自動発注する
- `manual_order`:注文後に手動で発注する

### product_stock(在庫)
商品 × 倉庫 × ロットの組み合わせで 1 行。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid (PK) | |
| product_code | text (FK) | 商品コード |
| warehouse_id | uuid (FK) | 倉庫 |
| lot_no | text | ロット番号(NULL = 雑貨など) |
| expiry_date | date | 賞味期限(NULL = 期限なし) |
| quantity_on_hand | int | 実在庫数(個単位) |
| quantity_allocated | int | 引当中の数 |
| received_at | date | 最初の入荷日 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

ユニーク制約: `(product_code, warehouse_id, lot_no, expiry_date)`
- ただし lot_no と expiry_date が両方 NULL の行は商品×倉庫で 1 行のみ

引当可能数 = `quantity_on_hand - quantity_allocated`(計算値、必要なら view にする)

### stock_movement(在庫移動履歴)
すべての在庫の増減を記録する。これが将来の拡張ポイント。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid (PK) | |
| product_stock_id | uuid (FK) | どの在庫が動いたか |
| movement_type | text | in / out / allocate / deallocate / adjust / dispose |
| quantity | int | 動いた数量(常に正の値で、type で増減を区別) |
| reference_type | text | purchase_order / sales_order / sales_invoice / manual |
| reference_id | uuid | 関連する伝票の ID |
| moved_at | timestamptz | |
| moved_by | uuid (FK→staff) | 操作した社員 |
| note | text | |

`movement_type` の意味:
- `in`:仕入入荷(`quantity_on_hand` プラス)
- `out`:出荷(`quantity_on_hand` マイナス)
- `allocate`:受注引当(`quantity_allocated` プラス)
- `deallocate`:引当解除(`quantity_allocated` マイナス、受注キャンセル時)
- `adjust`:棚卸補正(将来)
- `dispose`:廃棄(将来)

### supplier(仕入先)

| カラム | 型 | 説明 |
|--------|-----|------|
| supplier_code | text (PK) | 仕入先コード(6桁) |
| name | text | 営業所単位の名前 |
| name_kana | text | |
| parent_supplier_code | text (FK) | 本社コード(NULL可) |
| postal_code | text | |
| address | text | |
| phone | text | |
| fax | text | |
| status | text | active / paused / closed |
| note | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### sales_order(受注ヘッダ)

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid (PK) | |
| order_no | text | 受注番号(`800028791` 形式) |
| customer_code | text (FK) | お客様 |
| delivery_address_id | uuid (FK) | 届け先 |
| order_date | date | 注文日 |
| delivery_date | date | 納品予定日 |
| status | text | draft / pending / partial / fulfilled / cancelled |
| order_type | text | normal / special など(将来拡張) |
| subtotal | numeric | 税抜小計 |
| tax_amount | numeric | 消費税額 |
| total_amount | numeric | 合計(税込) |
| note | text | |
| staff_id | uuid (FK→staff) | 担当者 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### sales_order_line(受注明細)

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid (PK) | |
| sales_order_id | uuid (FK) | |
| line_no | int | 行番号 |
| product_code | text (FK) | |
| product_name_snapshot | text | 受注時の商品名 |
| quantity | int | 注文数(個単位) |
| unit_price | numeric | 単価(税抜) |
| tax_rate | numeric | 税率(0.10 / 0.08) |
| amount | numeric | 金額(税抜) |
| order_type | text | この行ごとの仕入方法(stock/order_at_sale/manual_order) |
| fulfilled_quantity | int | 納品済み数量 |
| note | text | |

明細行は受注時の単価を**スナップショット**として保持する(マスター変更の影響を受けない)。

### sales_order_line_allocation(受注明細-ロット引当)
1 つの受注明細が複数のロットから引き当てられる場合に使う中間テーブル。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid (PK) | |
| sales_order_line_id | uuid (FK) | |
| product_stock_id | uuid (FK) | 引き当てた在庫の行 |
| quantity | int | 引当数量 |
| created_at | timestamptz | |

### purchase_order(発注ヘッダ)

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid (PK) | |
| purchase_order_no | text | 発注番号(`P00001284` 形式) |
| supplier_code | text (FK) | 仕入先 |
| order_date | date | 発注日 |
| expected_delivery_date | date | 入荷予定日 |
| status | text | draft / ordered / partial / received / cancelled |
| subtotal | numeric | |
| tax_amount | numeric | |
| total_amount | numeric | |
| source_sales_order_id | uuid (FK) | 紐付く受注(自動発注の場合) |
| note | text | |
| staff_id | uuid (FK→staff) | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### purchase_order_line(発注明細)

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid (PK) | |
| purchase_order_id | uuid (FK) | |
| line_no | int | |
| product_code | text (FK) | |
| product_name_snapshot | text | |
| quantity | int | 発注数 |
| unit_price | numeric | 仕入単価 |
| tax_rate | numeric | |
| amount | numeric | |
| received_quantity | int | 入荷済み数量 |
| note | text | |

### sales_invoice(売上=納品書ヘッダ)
納品確定時に自動生成される。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid (PK) | |
| invoice_no | text | 納品書番号(`N00012841` 形式) |
| customer_code | text (FK) | |
| delivery_address_id | uuid (FK) | |
| invoice_date | date | 納品日(=売上計上日) |
| source_order_no | text | 紐付く受注番号 |
| subtotal | numeric | |
| tax_amount | numeric | |
| total_amount | numeric | |
| billing_status | text | unbilled / billed |
| billing_statement_id | uuid (FK) | 請求済みの場合の請求書 ID |
| staff_id | uuid (FK→staff) | |
| created_at | timestamptz | |

### sales_invoice_line(売上明細)

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid (PK) | |
| sales_invoice_id | uuid (FK) | |
| line_no | int | |
| product_code | text (FK) | |
| product_name_snapshot | text | |
| quantity | int | |
| unit_price | numeric | |
| tax_rate | numeric | |
| amount | numeric | |
| source_sales_order_line_id | uuid (FK) | 紐付く受注明細 |

### billing_statement(請求書ヘッダ)
月次の請求集計。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid (PK) | |
| statement_no | text | 請求書番号(`B20260400123` 形式) |
| customer_code | text (FK) | |
| period_from | date | 対象期間 開始 |
| period_to | date | 対象期間 終了 |
| issue_date | date | 発行日 |
| due_date | date | 支払期日 |
| previous_balance | numeric | 前回繰越額 |
| current_amount | numeric | 今回請求額(税込) |
| total_due | numeric | 請求合計 |
| status | text | unpaid / partial / paid |
| created_at | timestamptz | |

### billing_statement_line(請求明細)
納品書を月単位で集約。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid (PK) | |
| billing_statement_id | uuid (FK) | |
| sales_invoice_id | uuid (FK) | 紐付く納品書 |
| line_no | int | |

### payment(入金)

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid (PK) | |
| customer_code | text (FK) | |
| received_date | date | 入金日 |
| amount | numeric | 入金額 |
| method | text | 振込 / 現金 / 手形 |
| note | text | |
| created_at | timestamptz | |

### payment_allocation(入金消込)
入金と請求書の対応(多対多)。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid (PK) | |
| payment_id | uuid (FK) | |
| billing_statement_id | uuid (FK) | |
| allocated_amount | numeric | この消込で充当された金額 |
| created_at | timestamptz | |

### staff(社員)

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid (PK) | |
| auth_user_id | uuid (FK→auth.users) | Supabase Auth との紐付け |
| name | text | |
| email | text | |
| role | text | admin / staff / viewer |
| status | text | active / inactive |
| created_at | timestamptz | |

## インデックス指針

頻出クエリに合わせて以下にインデックスを張る:

- `customer.name`, `customer.name_kana`(検索)
- `product.name`, `product.jan_code`(検索)
- `sales_order.order_date`, `sales_order.status`(一覧の絞り込み)
- `sales_order.customer_code`(お客様別)
- `product_stock.expiry_date`(期限切れ警告)
- `product_stock.product_code`(商品別在庫)
- `stock_movement.product_stock_id`, `moved_at`(履歴参照)
- `sales_invoice.invoice_date`, `customer_code`(売上集計)

## RLS(Row Level Security)方針

Supabase の RLS で以下を制御する。詳細は別途決定。

- 社員(staff)は自分が担当するお客様のみ閲覧編集可
- 管理者(admin)はすべて閲覧編集可
- ビューワー(viewer)は閲覧のみ可、編集不可
- 削除は管理者のみ
