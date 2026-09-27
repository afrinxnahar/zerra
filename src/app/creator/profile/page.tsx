import { requireRole } from "@/lib/auth";
import { db } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { CreatorPanel } from "@/components/CreatorPanel";
import { StatusCard } from "@/components/StatusCard";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireRole("creator");
  const creator = (await db().getCreator(user.creator_id!))!;
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Profile" title="How your ads sound">
        Your niche, style notes and voice go into every script. Brands see your channel name and link next to the ad.
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <CreatorPanel creator={creator} />
        <StatusCard />
      </div>
    </div>
  );
}
