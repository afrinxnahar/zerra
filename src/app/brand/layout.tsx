import { requireRole } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";

const LINKS = [
  { href: "/brand", label: "Inbox" },
  { href: "/brand/profile", label: "Brand profile" },
];

export default async function BrandLayout({ children }: LayoutProps<"/brand">) {
  const user = await requireRole("brand");
  return (
    <>
      <SiteHeader links={LINKS} user={user} app />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">{children}</main>
    </>
  );
}
