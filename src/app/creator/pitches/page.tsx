import { requireRole } from "@/lib/auth";
import { db } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { PitchList } from "@/components/PitchList";

export const metadata = { title: "My pitches" };

export default async function PitchesPage() {
  const user = await requireRole("creator");
  const pitches = await db().listPitches({ creator_id: user.creator_id! });
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Pitches" title="Your spec ads">
        Every pitch generates 3 takes. Pick the one that sells it best, add a note, and send it to the brand&apos;s inbox.
      </PageHeader>
      <PitchList initial={pitches} />
    </div>
  );
}
