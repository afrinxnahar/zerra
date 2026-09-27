import Link from "next/link";
import { logout } from "@/lib/actions";
import { homeFor } from "@/lib/auth";
import type { User } from "@/lib/types";
import { Logo } from "./Logo";
import { NavLinks, type NavLink } from "./NavLinks";

/** One header for every page: marketing links when signed out, role nav + log out when signed in. */
export function SiteHeader({ links = [], user, app = false }: { links?: NavLink[]; user: User | null; app?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-x-8 px-4 sm:px-6">
        <Logo href={user ? homeFor(user) : "/"} />
        {links.length > 0 && (
          <div className="order-last w-full pb-2 sm:order-none sm:w-auto sm:pb-0">
            <NavLinks links={links} />
          </div>
        )}
        <div className="ml-auto flex items-center gap-2 py-3">
          {user && app ? (
            <>
              <span className="eyebrow mr-2 hidden md:block">
                {user.role} · {user.email}
              </span>
              <form action={logout}>
                <button className="btn btn-ghost !py-2">Log out</button>
              </form>
            </>
          ) : user ? (
            <Link href={homeFor(user)} className="btn btn-primary !py-2">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn !px-3 !py-2 text-muted hover:text-text">
                Log in
              </Link>
              <Link href="/signup" className="btn btn-primary !py-2">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
