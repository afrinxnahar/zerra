import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-[17px] font-semibold tracking-tight" aria-label="Zerra home">
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
        <path d="M5 5h14L5 19h14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Zerra
    </Link>
  );
}
