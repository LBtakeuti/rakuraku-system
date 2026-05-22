-- =============================================================================
-- らくらく受発注システム - Supabase DDL
-- =============================================================================
-- 実行順:
--   1. このファイルを Supabase SQL Editor に貼り付けて実行
--   2. RLS ポリシーは別ファイル(supabase/policies.sql)で適用予定
--   3. シードデータは別ファイル(supabase/seed.sql)で投入予定
-- =============================================================================

-- 拡張機能
create extension if not exists "uuid-ossp";

-- =============================================================================
-- マスター系
-- =============================================================================

-- 倉庫
create table warehouse (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- 社員
create table staff (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text unique,
  role text not null default 'staff' check (role in ('admin', 'staff', 'viewer')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- お客様(得意先)
create table customer (
  customer_code text primary key,
  name text not null,
  name_kana text,
  parent_customer_code text references customer(customer_code) on delete set null,
  postal_code text,
  address text,
  building text,
  phone text,
  fax text,
  contact_person text,
  email text,
  rank text not null default 'C' check (rank in ('A', 'B', 'C', 'D')),
  status text not null default 'active' check (status in ('active', 'paused', 'closed')),
  staff_id uuid references staff(id) on delete set null,
  -- 請求の設定(帳票仕様より)
  invoice_format text not null default 'invoice_only'
    check (invoice_format in ('invoice_only', 'invoice_delivery')),
  closing_day int not null default 31,        -- 締め日。31 は末日締めを表す
  payment_cycle text,                         -- 入金予定(翌月末・翌月20日 など)
  invoice_tax_type text not null default 'per_line'
    check (invoice_tax_type in ('per_line', 'per_voucher', 'per_invoice')),
  tax_rounding text not null default 'floor'
    check (tax_rounding in ('floor', 'round', 'ceil')),
  payment_method_default text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_customer_name on customer(name);
create index idx_customer_name_kana on customer(name_kana);
create index idx_customer_status on customer(status);
create index idx_customer_staff on customer(staff_id);

-- 届け先
create table delivery_address (
  id uuid primary key default uuid_generate_v4(),
  customer_code text not null references customer(customer_code) on delete cascade,
  name text not null,
  postal_code text,
  address text,
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_delivery_address_customer on delivery_address(customer_code);

-- 仕入先
create table supplier (
  supplier_code text primary key,
  name text not null,
  name_kana text,
  parent_supplier_code text references supplier(supplier_code) on delete set null,
  postal_code text,
  address text,
  phone text,
  fax text,
  status text not null default 'active' check (status in ('active', 'paused', 'closed')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_supplier_name on supplier(name);

-- 商品
create table product (
  product_code text primary key,
  name text not null,
  jan_code text,
  units_per_case int not null default 1 check (units_per_case >= 1),
  default_sales_unit_price numeric(12, 2),
  default_purchase_unit_price numeric(12, 2),
  default_tax_rate numeric(4, 3) not null default 0.10 check (default_tax_rate in (0.10, 0.08)),
  default_order_type text not null default 'order_at_sale'
    check (default_order_type in ('stock', 'order_at_sale', 'manual_order')),
  is_stocked boolean not null default false,
  is_lot_managed boolean not null default false,
  safety_stock int not null default 0,
  alert_days_yellow int not null default 60,
  alert_days_red int not null default 14,
  supplier_code text references supplier(supplier_code) on delete set null,
  status text not null default 'active' check (status in ('active', 'discontinued')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_product_name on product(name);
create index idx_product_jan on product(jan_code);
create index idx_product_supplier on product(supplier_code);
create index idx_product_status on product(status);

-- =============================================================================
-- 在庫系
-- =============================================================================

-- 在庫(商品 × 倉庫 × ロット)
create table product_stock (
  id uuid primary key default uuid_generate_v4(),
  product_code text not null references product(product_code) on delete restrict,
  warehouse_id uuid not null references warehouse(id) on delete restrict,
  lot_no text,
  expiry_date date,
  quantity_on_hand int not null default 0 check (quantity_on_hand >= 0),
  quantity_allocated int not null default 0,
  received_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ロット番号と期限の組み合わせでユニーク
-- (NULL の組み合わせは PostgreSQL では別物として扱われるので注意。
--  雑貨は商品×倉庫で 1 行に集約する運用ルールで対応する。)
create unique index uq_product_stock_lot
  on product_stock(product_code, warehouse_id, coalesce(lot_no, ''), coalesce(expiry_date, '9999-12-31'::date));

create index idx_product_stock_product on product_stock(product_code);
create index idx_product_stock_expiry on product_stock(expiry_date);

-- 在庫移動履歴
create table stock_movement (
  id uuid primary key default uuid_generate_v4(),
  product_stock_id uuid not null references product_stock(id) on delete restrict,
  movement_type text not null
    check (movement_type in ('in', 'out', 'allocate', 'deallocate', 'adjust', 'dispose')),
  quantity int not null check (quantity > 0),
  reference_type text check (reference_type in ('purchase_order', 'sales_order', 'sales_invoice', 'manual')),
  reference_id uuid,
  moved_at timestamptz not null default now(),
  moved_by uuid references staff(id) on delete set null,
  note text
);

create index idx_stock_movement_stock on stock_movement(product_stock_id);
create index idx_stock_movement_moved_at on stock_movement(moved_at);
create index idx_stock_movement_reference on stock_movement(reference_type, reference_id);

-- =============================================================================
-- 受注系
-- =============================================================================

create table sales_order (
  id uuid primary key default uuid_generate_v4(),
  order_no text unique not null,
  customer_code text not null references customer(customer_code) on delete restrict,
  delivery_address_id uuid references delivery_address(id) on delete set null,
  order_date date not null,
  delivery_date date not null,
  status text not null default 'pending'
    check (status in ('draft', 'pending', 'partial', 'fulfilled', 'cancelled')),
  order_type text not null default 'normal',
  subtotal numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  note text,
  staff_id uuid references staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sales_order_customer on sales_order(customer_code);
create index idx_sales_order_date on sales_order(order_date);
create index idx_sales_order_delivery_date on sales_order(delivery_date);
create index idx_sales_order_status on sales_order(status);

create table sales_order_line (
  id uuid primary key default uuid_generate_v4(),
  sales_order_id uuid not null references sales_order(id) on delete cascade,
  line_no int not null,
  product_code text not null references product(product_code) on delete restrict,
  product_name_snapshot text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(12, 2) not null,
  tax_rate numeric(4, 3) not null check (tax_rate in (0.10, 0.08)),
  amount numeric(12, 2) not null,
  order_type text not null check (order_type in ('stock', 'order_at_sale', 'manual_order')),
  fulfilled_quantity int not null default 0,
  note text
);

create index idx_sales_order_line_order on sales_order_line(sales_order_id);
create index idx_sales_order_line_product on sales_order_line(product_code);

-- 受注明細とロットの引当紐付け
create table sales_order_line_allocation (
  id uuid primary key default uuid_generate_v4(),
  sales_order_line_id uuid not null references sales_order_line(id) on delete cascade,
  product_stock_id uuid not null references product_stock(id) on delete restrict,
  quantity int not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create index idx_alloc_line on sales_order_line_allocation(sales_order_line_id);
create index idx_alloc_stock on sales_order_line_allocation(product_stock_id);

-- =============================================================================
-- 発注系
-- =============================================================================

create table purchase_order (
  id uuid primary key default uuid_generate_v4(),
  purchase_order_no text unique not null,
  supplier_code text not null references supplier(supplier_code) on delete restrict,
  order_date date not null,
  expected_delivery_date date,
  status text not null default 'ordered'
    check (status in ('draft', 'ordered', 'partial', 'received', 'cancelled')),
  subtotal numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  source_sales_order_id uuid references sales_order(id) on delete set null,
  note text,
  staff_id uuid references staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_po_supplier on purchase_order(supplier_code);
create index idx_po_date on purchase_order(order_date);
create index idx_po_status on purchase_order(status);

create table purchase_order_line (
  id uuid primary key default uuid_generate_v4(),
  purchase_order_id uuid not null references purchase_order(id) on delete cascade,
  line_no int not null,
  product_code text not null references product(product_code) on delete restrict,
  product_name_snapshot text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(12, 2) not null,
  tax_rate numeric(4, 3) not null check (tax_rate in (0.10, 0.08)),
  amount numeric(12, 2) not null,
  received_quantity int not null default 0,
  note text
);

create index idx_po_line_order on purchase_order_line(purchase_order_id);
create index idx_po_line_product on purchase_order_line(product_code);

-- =============================================================================
-- 売上系(納品書)
-- =============================================================================

create table sales_invoice (
  id uuid primary key default uuid_generate_v4(),
  invoice_no text unique not null,
  customer_code text not null references customer(customer_code) on delete restrict,
  delivery_address_id uuid references delivery_address(id) on delete set null,
  invoice_date date not null,
  source_order_no text,
  subtotal numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  billing_status text not null default 'unbilled' check (billing_status in ('unbilled', 'billed')),
  billing_statement_id uuid,
  staff_id uuid references staff(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_invoice_customer on sales_invoice(customer_code);
create index idx_invoice_date on sales_invoice(invoice_date);
create index idx_invoice_billing_status on sales_invoice(billing_status);

create table sales_invoice_line (
  id uuid primary key default uuid_generate_v4(),
  sales_invoice_id uuid not null references sales_invoice(id) on delete cascade,
  line_no int not null,
  product_code text not null references product(product_code) on delete restrict,
  product_name_snapshot text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(12, 2) not null,
  tax_rate numeric(4, 3) not null check (tax_rate in (0.10, 0.08)),
  amount numeric(12, 2) not null,
  source_sales_order_line_id uuid references sales_order_line(id) on delete set null
);

create index idx_invoice_line_invoice on sales_invoice_line(sales_invoice_id);

-- =============================================================================
-- 請求系
-- =============================================================================

create table billing_statement (
  id uuid primary key default uuid_generate_v4(),
  statement_no text unique not null,
  customer_code text not null references customer(customer_code) on delete restrict,
  period_from date not null,
  period_to date not null,
  issue_date date not null,
  due_date date,
  previous_balance numeric(12, 2) not null default 0,
  current_amount numeric(12, 2) not null default 0,
  total_due numeric(12, 2) not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid')),
  created_at timestamptz not null default now()
);

create index idx_billing_customer on billing_statement(customer_code);
create index idx_billing_period on billing_statement(period_from, period_to);
create index idx_billing_status on billing_statement(status);

-- 請求と納品書の紐付け
create table billing_statement_line (
  id uuid primary key default uuid_generate_v4(),
  billing_statement_id uuid not null references billing_statement(id) on delete cascade,
  sales_invoice_id uuid not null references sales_invoice(id) on delete restrict,
  line_no int not null
);

create index idx_billing_line_statement on billing_statement_line(billing_statement_id);
create index idx_billing_line_invoice on billing_statement_line(sales_invoice_id);

-- sales_invoice.billing_statement_id の外部キー制約を後付け(循環参照のため)
alter table sales_invoice
  add constraint fk_invoice_billing
  foreign key (billing_statement_id) references billing_statement(id) on delete set null;

-- =============================================================================
-- 入金系
-- =============================================================================

create table payment (
  id uuid primary key default uuid_generate_v4(),
  customer_code text not null references customer(customer_code) on delete restrict,
  received_date date not null,
  amount numeric(12, 2) not null check (amount > 0),
  method text,
  note text,
  created_at timestamptz not null default now()
);

create index idx_payment_customer on payment(customer_code);
create index idx_payment_date on payment(received_date);

-- 入金消込(入金 と 請求書 の多対多)
create table payment_allocation (
  id uuid primary key default uuid_generate_v4(),
  payment_id uuid not null references payment(id) on delete cascade,
  billing_statement_id uuid not null references billing_statement(id) on delete restrict,
  allocated_amount numeric(12, 2) not null check (allocated_amount > 0),
  created_at timestamptz not null default now()
);

create index idx_alloc_payment on payment_allocation(payment_id);
create index idx_alloc_billing on payment_allocation(billing_statement_id);

-- =============================================================================
-- ビュー(計算列の代替)
-- =============================================================================

-- 引当可能な在庫数
create view v_product_stock_available as
select
  ps.*,
  (ps.quantity_on_hand - ps.quantity_allocated) as quantity_available
from product_stock ps;

-- 商品ごとに集約した在庫(モックアップの「商品ごと」表示用)
create view v_stock_summary_by_product as
select
  ps.product_code,
  p.name as product_name,
  p.units_per_case,
  sum(ps.quantity_on_hand) as total_on_hand,
  sum(ps.quantity_allocated) as total_allocated,
  sum(ps.quantity_on_hand - ps.quantity_allocated) as total_available,
  min(ps.expiry_date) filter (where ps.expiry_date is not null) as nearest_expiry
from product_stock ps
join product p on p.product_code = ps.product_code
group by ps.product_code, p.name, p.units_per_case;

-- =============================================================================
-- updated_at 自動更新トリガー
-- =============================================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger tg_customer_updated before update on customer
  for each row execute function set_updated_at();

create trigger tg_supplier_updated before update on supplier
  for each row execute function set_updated_at();

create trigger tg_product_updated before update on product
  for each row execute function set_updated_at();

create trigger tg_product_stock_updated before update on product_stock
  for each row execute function set_updated_at();

create trigger tg_sales_order_updated before update on sales_order
  for each row execute function set_updated_at();

create trigger tg_purchase_order_updated before update on purchase_order
  for each row execute function set_updated_at();

-- =============================================================================
-- 初期データ
-- =============================================================================

-- 既定倉庫(必須)
insert into warehouse (name, is_default) values ('本社倉庫', true);
