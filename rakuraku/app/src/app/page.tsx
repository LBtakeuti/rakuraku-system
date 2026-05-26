import {
  FilePlus2,
  PackageCheck,
  PackagePlus,
  Search,
  Boxes,
  ClipboardList,
  Users,
  Package,
  JapaneseYen,
  FileText,
  Settings,
} from "lucide-react";
import { TopHeader } from "@/components/common/top-header";
import { BigButton } from "@/components/common/big-button";

export default function HomePage() {
  return (
    <>
      <TopHeader />
      <main className="mx-auto w-full max-w-[1200px] px-10 py-14">
        <div className="mb-16 text-center">
          <div className="mb-3 text-[32px] font-bold text-text-primary">
            こんにちは、山田さん
          </div>
          <div className="text-lg text-text-secondary">
            今日はどの作業をしますか？ ボタンを押して始めてください
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-5 min-[601px]:gap-6">
          {/* 上段: 日々の作業 + 確認 */}
          <BigButton
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
            icon={FilePlus2}
          />
          <BigButton
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
            icon={PackageCheck}
          />
          <BigButton
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
            icon={PackagePlus}
          />
          <BigButton
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
            icon={Search}
          />
          <BigButton
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
            icon={Boxes}
          />

          {/* 下段: マスター・実績・請求 */}
          <BigButton
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
            icon={ClipboardList}
          />
          <BigButton
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
            icon={Users}
          />
          <BigButton
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
            icon={Package}
          />
          <BigButton
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
            icon={JapaneseYen}
          />
          <BigButton
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
            icon={FileText}
          />
          <BigButton
            href="/settings"
            color="indigo"
            title="設定"
            description={
              <>
                会社情報や
                <br />
                帳票設定を変更します
              </>
            }
            icon={Settings}
          />
        </div>
      </main>
    </>
  );
}
