import { notFound } from "next/navigation";
import { TopHeader } from "@/components/common/top-header";
import { PageBar } from "@/components/common/page-bar";
import { getProduct } from "@/lib/supabase/queries/product";
import { ProductForm } from "../../product-form";
import { updateProduct } from "../../actions";

export default async function ProductEditPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const product = await getProduct(code);
  if (!product) notFound();
  const boundAction = updateProduct.bind(null, product.productCode);
  return (
    <>
      <TopHeader />
      <PageBar title={`商品を編集する：${product.name}`} backTo="/products" />
      <main className="mx-auto w-full max-w-[920px] px-10 py-10">
        <ProductForm mode="edit" initial={product} action={boundAction} />
      </main>
    </>
  );
}
