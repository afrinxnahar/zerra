import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/store";
import type { Brand, Creator } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { CreatorCard } from "@/components/CreatorCard";

export const metadata = { title: "Find creators" };

// ponytail: category + keyword match in memory. Fine for hundreds of creators;
// move it into a SQL filter (categories @> array[...]) when the list gets long.
function matches(c: Creator, brand: Brand) {
  if (!brand.category) return true;
  if ((c.categories ?? []).includes(brand.category)) return true;
  const text = `${c.niche} ${c.style_notes}`.toLowerCase();
  return brand.category.split(/[^a-z]+/).some((w) => w.length > 2 && text.includes(w));
}

export default async function CreatorsPage({ searchParams }: PageProps<"/brand/creators">) {
  const user = await requireRole("brand");
  const showAll = (await searchParams).all === "1";
  const [brand, creators, requests] = await Promise.all([
    db().getBrand(user.brand_id!),
    db().listCreators(),
    db().listRequests({ brand_id: user.brand_id! }),
  ]);
  const b = brand!;
  const matched = creators.filter((c) => matches(c, b));
  const list = showAll ? creators : matched;
  // newest request per creator decides what their card shows
  const latest = new Map<string, (typeof requests)[number]>();
  for (const r of requests) if (!latest.has(r.creator_id)) latest.set(r.creator_id, r);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={b.category ? `Matching ${b.category}` : "All creators"}
        title="Creators for your brand"
        actions={
          b.category && (
            <Link href={showAll ? "/brand/creators" : "/brand/creators?all=1"} className="btn btn-ghost">
              {showAll ? `Only ${b.category} creators` : `Show all creators (${creators.length})`}
            </Link>
          )
        }
      >
        Ask a creator for a spec ad. They set their rate and send you a finished ad starring your real product.
      </PageHeader>

      {list.length === 0 ? (
        <div className="card px-6 py-16 text-center text-muted">
          No creators match {b.category} yet.{" "}
          <Link href="/brand/creators?all=1" className="text-text underline underline-offset-4">
            Browse everyone
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {list.map((c) => (
            <CreatorCard key={c.id} creator={c} request={latest.get(c.id)} canRequest={b.published} />
          ))}
        </div>
      )}
    </div>
  );
}
