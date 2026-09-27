import { redirect } from "next/navigation";
import { getUser, homeFor } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();
  if (user) redirect(homeFor(user));
  return (
    <>
      <SiteHeader user={null} />
      <main className="glow flex flex-1 items-start justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </>
  );
}
