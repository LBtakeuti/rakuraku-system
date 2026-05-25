-- 開発用シード（マスター画面動作確認用の最小データ）
-- supabase db reset 時にも適用される。本番環境では適用しない想定。

insert into staff (id, name, email, role, status) values
  ('11111111-1111-1111-1111-111111111111', '山田 太郎', 'yamada@example.local', 'admin', 'active'),
  ('22222222-2222-2222-2222-222222222222', '出口 飛鳥', 'deguchi@example.local', 'staff', 'active'),
  ('33333333-3333-3333-3333-333333333333', '佐藤 花子', 'sato@example.local', 'staff', 'active')
on conflict (id) do nothing;
