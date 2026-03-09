import HeroBanner from "@/components/home/HeroBanner";
import CategoryGrid from "@/components/home/CategoryGrid";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import PromoBanner from "@/components/home/PromoBanner";
import LifestyleSplit from "@/components/home/LifestyleSplit";
import { getFeaturedProducts } from "@/lib/supabase/products";

export default async function StorePage() {
  const products = await getFeaturedProducts();

  return (
    <>
      <HeroBanner />
      <CategoryGrid />
      <FeaturedProducts products={products} />
      <PromoBanner />
      <LifestyleSplit />
    </>
  );
}
