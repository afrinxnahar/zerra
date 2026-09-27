import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/store";
import { SiteHeader } from "@/components/SiteHeader";

const LINKS = [
  { href: "/brand", label: "Inbox" },
  { href: "/brand/creators", label: "Find creators" },
  { href: "/brand/profile", label: "Brand settings" },
];

export default async function BrandLayout({ children }: LayoutProps<"/brand">) {
  const user = await requireRole("brand");
  const brand = await db().getBrand(user.brand_id!);
  return (
    <>
      <SiteHeader links={LINKS} user={user} app />
      {!brand?.published && (
        <div className="border-b border-line bg-panel">
          <p className="mx-auto max-w-7xl px-4 py-3 text-sm text-muted sm:px-6">
            Your brand isn&apos;t live yet. Add your product photo and details, then publish so creators can pitch you.{" "}
            <Link href="/brand/profile" className="text-text underline underline-offset-4">
              Finish your profile
            </Link>
          </p>
        </div>
      )}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">{children}</main>
    </>
  );
}
