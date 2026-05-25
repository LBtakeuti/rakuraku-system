-- =============================================================================
-- 自社情報マスター（company_setting）
-- =============================================================================
-- 帳票PDF（発注書・受注伝票・請求書・請求書+納品書・請求一覧表）の発行元情報を
-- 一元管理する単一行テーブル。フェーズ7（帳票PDF）から参照する。
-- フェーズ8で設定マスター編集画面を追加予定。

create table company_setting (
  id int primary key default 1 check (id = 1),
  company_name text not null,
  registration_no text not null,
  postal_code text not null,
  address text not null,
  tel text not null,
  fax text,
  bank_info text not null,
  updated_at timestamptz not null default now()
);

-- updated_at 自動更新トリガー（既存の set_updated_at 関数を再利用）
create trigger trg_company_setting_updated_at
  before update on company_setting
  for each row execute function set_updated_at();

-- 初期データ：株式会社プロスパ（docs/04-documents.md §共通の発行元情報より）
insert into company_setting (
  id, company_name, registration_no, postal_code, address, tel, fax, bank_info
) values (
  1,
  '株式会社プロスパ',
  'T6011801020915',
  '121-0831',
  '東京都足立区舎人5-16-10',
  '03-5856-8263',
  '03-5856-8273',
  '三菱UFJ銀行／千住支店 普通預金 4814091'
);
