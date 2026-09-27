import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { RequestCard } from "@/components/RequestCard";

export const metadata = { title: "Requests" };

export default async function RequestsPage() {
  const user = await requireRole("creator");
  const requests = await db().listRequests({ creator_id: user.creator_id! });
  const open = requests.filter((r) => r.status === "open");
  const past = requests.filter((r) => r.status !== "open");

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={`Requests · ${open.length} open`} title="Brands asking for you">
        Brands that want a spec ad from you. Set your rate and Zerra generates three takes starring their real product.
      </PageHeader>
      {requests.length === 0 && (
        <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
          <p className="text-muted">No requests yet. Add categories to your profile so matching brands find you.</p>
          <Link href="/creator/profile" className="btn btn-primary">
            Update profile
          </Link>
        </div>
      )}
      {open.length > 0 && (
        <div className="space-y-4">
          {open.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="eyebrow">Past requests</h2>
          {past.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </section>
      )}
    </div>
  );
}
