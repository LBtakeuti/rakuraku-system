# らくらく受発注システム

トン屋(問屋)向けの受発注管理システム。株式会社プロスパの現行システムを置き換える後継システム。

このリポジトリは、AIエージェント(Claude Code)による開発を前提に、仕様一式をまとめたものである。

## 最初に読むもの

開発を始める人(人間・AIエージェントとも)は、まず **`CLAUDE.md`** を読むこと。そこに開発の進め方、技術スタック、UXの鉄則、ドキュメントを読む順番がすべて書かれている。

## このシステムの目的

**ITリテラシーが低い人が、マニュアルなしで使えること。** これが最重要目標。詳しくは `docs/00-project-background.md`。

## リポジトリ構成

```
.
├── README.md                  ← このファイル
├── CLAUDE.md                  ← AIエージェントへの開発指示書(最重要)
├── docs/                      ← 仕様書
│   ├── 00-project-background.md   背景・目的・利用者
│   ├── 01-business-overview.md    業務の流れと用語集
│   ├── 02-data-model.md           データベース設計
│   ├── 03-screens.md              全13画面の仕様
│   ├── 04-documents.md            帳票5種の仕様
│   ├── 05-workflows.md            処理フローの詳細
│   └── 06-implementation-plan.md  実装の順序とフェーズ
├── supabase/
│   └── schema.sql             ← データベースDDL(16テーブル)
├── mockups/                   ← 全13画面のHTMLモックアップ(見た目の正)
│   ├── home.html
│   ├── customers.html
│   ├── customer-edit.html
│   ├── products.html
│   ├── product-edit.html
│   ├── orders.html
│   ├── order-new.html
│   ├── delivery.html
│   ├── sales-list.html
│   ├── stocks.html
│   ├── purchase-orders.html
│   ├── receivings.html
│   └── billing.html
├── documents/                 ← 帳票の完成イメージ(PDF5種)
│   ├── 01_発注書.pdf
│   ├── 02_受注伝票.pdf
│   ├── 03_請求書.pdf
│   ├── 04_請求書納品書.pdf
│   └── 05_請求一覧表.pdf
└── document-templates/        ← 帳票生成の参照実装(Python)
    ├── make_documents.py
    └── doc_common.py
```

## 技術スタック

Next.js 15(App Router)+ React 19 + TypeScript / Tailwind CSS + shadcn/ui / Supabase(PostgreSQL)/ Vercel。詳細は `CLAUDE.md`。

## 開発の進め方

1. `CLAUDE.md` を読む。
2. `docs/` を 00 → 06 の順に読む。
3. `docs/06-implementation-plan.md` のフェーズ順に実装する。
4. 画面は `mockups/`、帳票は `documents/` を見た目の正として再現する。

## 現在の状態

設計フェーズ完了。仕様書・モックアップ・帳票サンプルが揃い、実装に着手できる状態。コードはまだ無い。
