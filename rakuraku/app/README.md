This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## ビルドのトラブルシューティング

### 初回 `npm run build` が webpack-runtime 内部エラーで失敗する場合

症状例: `Generating static pages (X/Y)` の途中で以下のようなエラーが出てビルドが落ちる。

```
TypeError: a[d] is not a function
    at .next/server/webpack-runtime.js:...
```

これは Next.js 15 のインクリメンタルビルドキャッシュ（`.next/`）が、リファクタや一覧画面の共通基盤変更などのタイミングで古い chunks を参照したまま残ることに起因する一過性事象。コード自体には問題ない。

**対処**: `.next/` を削除してクリーンビルドする。

```bash
rm -rf .next && npm run build
```

通常運用ではインクリメンタルビルドの利点を活かすため `build` スクリプトに自動削除は組み込んでいない。再現性が高い場合はフェーズ8（仕上げ）で根本対応の要否を判断する。
