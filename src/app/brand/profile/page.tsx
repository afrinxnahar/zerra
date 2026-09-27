import { requireRole } from "@/lib/auth";
import { db } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { BrandProfileForm } from "@/components/BrandProfileForm";

export const metadata = { title: "Brand settings" };

/** Everything creators see about the brand, and what every spec ad is built from. */
export default async function BrandProfilePage() {
  const user = await requireRole("brand");
  const brand = (await db().getBrand(user.brand_id!))!;
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={brand.published ? "Live for creators" : "Draft"} title={brand.name}>
        Your product photo, facts and links are what creators build their spec ads from. Only the facts you list here
        can be claimed in an ad.
      </PageHeader>
      <BrandProfileForm brand={brand} />
    </div>
  );
}
