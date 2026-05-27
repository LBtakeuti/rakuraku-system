import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import { ProductForm } from "../product-form";
import { createProduct } from "../actions";

export default function ProductNewPage() {
  return (
    <>
      <TopHeader />
      <PageBar title="新しい商品を追加する" backTo="/products" />
      <main className="mx-auto w-full max-w-[920px] px-8 py-8">
        <ProductForm mode="create" action={createProduct} />
      </main>
    </>
  );
}
