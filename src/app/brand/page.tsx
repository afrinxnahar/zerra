import { requireRole } from "@/lib/auth";
import { db } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Inbox } from "@/components/Inbox";

export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const user = await requireRole("brand");
  const [brand, pitches] = await Promise.all([
    db().getBrand(user.brand_id!),
    db().listPitches({ brand_id: user.brand_id!, sent_only: true }),
  ]);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={`Inbox · ${pitches.length} pitch${pitches.length === 1 ? "" : "es"}`} title={`${brand!.name} pitch inbox`}>
        Creators who want to work with you sent a spec ad starring your real product. Press play.
      </PageHeader>
      <Inbox pitches={pitches} />
    </div>
  );
}
