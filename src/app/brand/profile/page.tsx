/* eslint-disable @next/next/no-img-element */
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "Brand profile" };

/** What creators get to work with: the product, its facts, and the cutout composited into every ad. */
export default async function BrandProfilePage() {
  const user = await requireRole("brand");
  const [brand, pitches] = await Promise.all([
    db().getBrand(user.brand_id!),
    db().listPitches({ brand_id: user.brand_id!, sent_only: true }),
  ]);
  const b = brand!;
  const creators = new Set(pitches.map((p) => p.creator_id)).size;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={b.category} title={b.name}>
        {b.tagline}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div
          className="card relative aspect-square overflow-hidden"
          style={{ background: `radial-gradient(circle at 50% 40%, ${b.accent}40, transparent 70%), var(--panel)` }}
        >
          <img src={b.cutout_path} alt={b.product_name} className="absolute inset-[12%] h-[76%] w-[76%] object-contain" />
          <span className="eyebrow absolute left-4 top-4">Composited into every ad</span>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 divide-x divide-line rounded-2xl border border-line">
            <Stat value={pitches.length} label="Pitches received" />
            <Stat value={creators} label="Creators" />
          </div>
          <section className="card space-y-4 p-6">
            <div className="eyebrow">Hero product</div>
            <div>
              <h2 className="text-2xl font-medium tracking-tight">{b.product_name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{b.product_description}</p>
            </div>
            <ul className="space-y-2 text-sm">
              {b.product_facts.map((f) => (
                <li key={f} className="flex gap-3">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-text" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              <a className="btn btn-ghost" href={b.product_url} target="_blank" rel="noreferrer">
                Product page ↗
              </a>
              <a className="btn btn-ghost" href={b.website} target="_blank" rel="noreferrer">
                Website ↗
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="p-5">
      <div className="display text-4xl">{value}</div>
      <div className="eyebrow mt-2">{label}</div>
    </div>
  );
}
