import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";

type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <>
      <TopHeader />
      <PageBar title={title} />
      <main className="mx-auto w-full max-w-[1280px] px-8 py-16">
        <div className="rounded-2xl border border-border-light bg-bg-surface px-8 py-16 text-center shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
          <div className="mb-3 text-xl font-bold text-text-primary">
            この画面は準備中です
          </div>
          <div className="text-text-secondary">
            次のフェーズで実装します。「ホームに戻る」から戻ってください。
          </div>
        </div>
      </main>
    </>
  );
}
