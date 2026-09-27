import { db } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { BrandPicker } from "@/components/BrandPicker";

export const metadata = { title: "Discover brands" };

export default async function DiscoverPage() {
  const brands = await db().listBrands();
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Discover" title="Pitch a brand with a spec ad">
        Pick a brand. Zerra writes a 15 to 20 second script in your voice, generates the shots, voiceover and music on
        Livepeer, and composites the brand&apos;s real product on top. You get 3 takes and send the best one.
      </PageHeader>
      <BrandPicker brands={brands} />
    </div>
  );
}
