import { requireRole } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";

const LINKS = [
  { href: "/creator", label: "Discover brands" },
  { href: "/creator/pitches", label: "My pitches" },
  { href: "/creator/profile", label: "Profile" },
];

export default async function CreatorLayout({ children }: LayoutProps<"/creator">) {
  const user = await requireRole("creator");
  return (
    <>
      <SiteHeader links={LINKS} user={user} app />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">{children}</main>
    </>
  );
}
