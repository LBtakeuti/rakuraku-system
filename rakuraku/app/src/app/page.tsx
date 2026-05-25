import { TopHeader } from "@/components/common/top-header";
import { HomeActionCard } from "@/components/common/home-action-card";

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export default function HomePage() {
  return (
    <>
      <TopHeader />
      <main className="mx-auto w-full max-w-[1200px] px-8 py-14">
        <div className="mb-14 text-center">
          <div className="mb-3 text-[32px] font-bold text-text-primary">
            こんにちは、山田さん
          </div>
          <div className="text-lg text-text-secondary">
            今日はどの作業をしますか？ ボタンを押して始めてください
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[760px]:gap-5 min-[1100px]:grid-cols-3 min-[1280px]:grid-cols-5">
          {/* 上段: 日々の作業 + 確認 */}
          <HomeActionCard
            href="/orders/new"
            color="blue"
            title="注文を受ける"
            description={
              <>
                お客様からの新しい注文を
                <br />
                登録します
              </>
            }
            icon={
              <svg {...svgProps}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            }
          />
          <HomeActionCard
            href="/deliveries"
            color="green"
            title="納品する"
            description={
              <>
                受けた注文を納品して
                <br />
                売上を計上します
              </>
            }
            icon={
              <svg {...svgProps}>
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            }
          />
          <HomeActionCard
            href="/receivings"
            color="amber"
            title="入荷を登録する"
            description={
              <>
                仕入先から届いた商品を
                <br />
                在庫に追加します
              </>
            }
            icon={
              <svg {...svgProps}>
                <path d="M16 16l-4 4-4-4" />
                <path d="M12 20V8" />
                <path d="M21 12V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6" />
              </svg>
            }
          />
          <HomeActionCard
            href="/orders"
            color="orange"
            title="注文を見る"
            description={
              <>
                過去や今の注文を
                <br />
                検索・確認します
              </>
            }
            icon={
              <svg {...svgProps}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            }
          />
          <HomeActionCard
            href="/stocks"
            color="indigo"
            title="在庫を見る"
            description={
              <>
                商品の在庫数や
                <br />
                賞味期限を確認します
              </>
            }
            icon={
              <svg {...svgProps}>
                <path d="M20.91 8.84L8.56 2.23a1.93 1.93 0 0 0-1.81 0L3.1 4.13a2.12 2.12 0 0 0-.05 3.69l12.22 6.93a2 2 0 0 0 1.94 0L21 12.51a2.12 2.12 0 0 0-.09-3.67z" />
                <path d="M3.09 8.84v12.16L12 24" />
                <path d="M20.91 8.84v12.16L12 24" />
                <path d="M12 13.18v10.82" />
              </svg>
            }
          />

          {/* 下段: マスター・実績・請求 */}
          <HomeActionCard
            href="/purchase-orders"
            color="rose"
            title="発注を見る"
            description={
              <>
                仕入先への発注を
                <br />
                確認します
              </>
            }
            icon={
              <svg {...svgProps}>
                <path
                  d="M9 11H1l8-8 8 8h-8v10z"
                  transform="rotate(180 9 12)"
                />
                <line x1="1" y1="22" x2="17" y2="22" />
              </svg>
            }
          />
          <HomeActionCard
            href="/customers"
            color="purple"
            title="お客様を管理する"
            description={
              <>
                得意先の情報を
                <br />
                追加・変更します
              </>
            }
            icon={
              <svg {...svgProps}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
          <HomeActionCard
            href="/products"
            color="teal"
            title="商品を管理する"
            description={
              <>
                取扱い商品を
                <br />
                追加・変更します
              </>
            }
            icon={
              <svg {...svgProps}>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            }
          />
          <HomeActionCard
            href="/sales"
            color="pink"
            title="売上を見る"
            description={
              <>
                過去に納品した
                <br />
                記録を確認します
              </>
            }
            icon={
              <svg {...svgProps}>
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
          />
          <HomeActionCard
            href="/billing"
            color="violet"
            title="請求の業務"
            description={
              <>
                月締めをして
                <br />
                請求書を発行します
              </>
            }
            icon={
              <svg {...svgProps}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            }
          />
        </div>
      </main>
    </>
  );
}
