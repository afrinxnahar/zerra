/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getUser, homeFor } from "@/lib/auth";
import { db } from "@/lib/store";
import { SiteHeader } from "@/components/SiteHeader";
import { Logo } from "@/components/Logo";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#get-started", label: "Creators & brands" },
];

const STATS = [
  { value: "3", label: "Takes per pitch" },
  { value: "15–20s", label: "Spec ad length" },
  { value: "3–5 min", label: "To a finished ad" },
  { value: "$0.55", label: "Per 3-take pitch" },
];

const STEPS = [
  { title: "Set your style", body: "Niche, style notes, voice and format. Every script is written the way you talk." },
  { title: "Pick a brand", body: "Browse brands with real product cutouts and facts, then generate three takes." },
  { title: "Livepeer generates", body: "Script, shots, voiceover, music and motion, with the real product composited in." },
  { title: "Send the best take", body: "Add a note and it lands in the brand's inbox as a playable spec ad." },
];

const SCRIPT = [
  ["hook", "Okay, 2am coding session, and I need something that isn't coffee."],
  ["product", "OLIPOP Orange Cream. Tastes like the ice cream truck."],
  ["benefit", "3 grams of sugar, 3 grams of fiber, 25 calories."],
  ["cta", "Link's below. Thank me later."],
];

export default async function Home() {
  const [user, brands] = await Promise.all([getUser(), db().listBrands()]);
  const hero = brands.find((b) => b.slug === "olipop") || brands[0];
  const start = (role: "creator" | "brand") => (user ? homeFor(user) : `/signup?role=${role}`);

  return (
    <>
      <SiteHeader links={LINKS} user={user} />
      <main className="flex-1">
        {/* hero */}
        <section className="glow px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
          <Link
            href="#how"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-panel py-1 pl-1 pr-3 text-xs text-muted transition hover:text-text"
          >
            <span className="rounded-full bg-text px-2 py-0.5 font-medium text-bg">New</span>
            Spec ads generated on Livepeer Agent ↗
          </Link>
          <h1 className="display mx-auto mt-8 max-w-4xl text-5xl sm:text-6xl lg:text-7xl">
            Pitch brands with the ad, not the DM.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Zerra turns your style into a finished spec ad starring a brand&apos;s real product. Brands open a playable
            pitch, not a paragraph.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={start("creator")} className="btn btn-primary !px-6 !py-3">
              Start as a creator →
            </Link>
            <Link href={start("brand")} className="btn btn-ghost !px-6 !py-3">
              I&apos;m a brand
            </Link>
          </div>
        </section>

        {/* product showcase: script → ad → inbox */}
        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:px-6 md:grid-cols-3">
          <div className="card flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="eyebrow ml-2">script.json</span>
            </div>
            <ol className="flex-1 space-y-4 p-5 font-mono text-[13px] leading-relaxed">
              {SCRIPT.map(([slot, line]) => (
                <li key={slot}>
                  <span className="text-muted">{slot}</span>
                  <p className="text-text/90">&ldquo;{line}&rdquo;</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="card grid place-items-center overflow-hidden bg-panel p-6">
            <div className="relative aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-2xl border border-line">
              <img src="/mock/frame-1.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <img
                src={hero.cutout_path}
                alt={hero.product_name}
                className="absolute left-1/2 top-[60%] h-[36%] w-auto -translate-x-1/2 -translate-y-1/2 object-contain"
              />
              <span className="absolute inset-x-3 bottom-3 rounded-md bg-black/60 px-2 py-1 text-center text-[11px] text-white backdrop-blur">
                OLIPOP Orange Cream. Tastes like the ice cream truck.
              </span>
            </div>
          </div>

          <div className="card flex flex-col p-5">
            <div className="eyebrow">Brand inbox</div>
            <ul className="mt-4 flex-1 space-y-2">
              {brands.slice(0, 4).map((b, i) => (
                <li key={b.id} className="flex items-center gap-3 rounded-xl bg-panel-2 p-3">
                  <img src={b.cutout_path} alt="" className="h-9 w-9 object-contain" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{b.name}</div>
                    <div className="truncate text-xs text-muted">Spec ad · {b.product_name}</div>
                  </div>
                  {i === 0 && <span className="rounded-full bg-text px-2 py-0.5 text-[10px] font-medium text-bg">New</span>}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* stats */}
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
          <dl className="grid grid-cols-2 gap-px border-y border-line bg-line lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-bg px-2 py-8 sm:px-6">
                <dd className="display text-4xl sm:text-5xl">{s.value}</dd>
                <dt className="eyebrow mt-3">{s.label}</dt>
              </div>
            ))}
          </dl>
        </section>

        {/* brands */}
        <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
          <div className="eyebrow text-center">Pitch brands like</div>
          <div className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {brands.slice(0, 12).map((b) => (
              <div key={b.id} className="flex flex-col items-center gap-3 rounded-2xl border border-line p-4">
                <img src={b.cutout_path} alt="" className="h-14 w-14 object-contain" />
                <span className="text-center text-xs text-muted">{b.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* how it works */}
        <section id="how" className="mx-auto mt-32 max-w-7xl scroll-mt-24 px-4 sm:px-6">
          <h2 className="display max-w-2xl text-4xl sm:text-5xl">From profile to pitch in four steps.</h2>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="bg-bg p-6">
                <span className="font-mono text-sm text-muted">0{i + 1}</span>
                <h3 className="mt-10 text-lg font-medium">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* get started */}
        <section id="get-started" className="mx-auto mt-32 max-w-7xl scroll-mt-24 px-4 pb-24 sm:px-6">
          <h2 className="display text-3xl sm:text-4xl">Choose how to get started</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Audience
              eyebrow="For creators"
              title="Land brand deals with a finished ad"
              points={["Scripts in your voice and style", "Three takes per brand, send the best", "Track every pitch you send"]}
              href={start("creator")}
              cta="Sign up as a creator"
              primary
            />
            <Audience
              eyebrow="For brands"
              title="See the ad before you sign the deal"
              points={["Pitches arrive as playable spec ads", "Your real product in every shot", "Mark the creators you want to work with"]}
              href={start("brand")}
              cta="Sign up as a brand"
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <span>© {new Date().getFullYear()} Zerra · Generated with Livepeer Agent</span>
        </div>
      </footer>
    </>
  );
}

function Audience(props: { eyebrow: string; title: string; points: string[]; href: string; cta: string; primary?: boolean }) {
  return (
    <div className="card flex flex-col p-6 sm:p-8">
      <div className="eyebrow">{props.eyebrow}</div>
      <h3 className="mt-4 text-2xl font-medium tracking-tight">{props.title}</h3>
      <ul className="mt-6 flex-1 space-y-3 text-sm text-muted">
        {props.points.map((p) => (
          <li key={p} className="flex gap-3">
            <span className="text-text">✓</span>
            {p}
          </li>
        ))}
      </ul>
      <Link href={props.href} className={`btn mt-8 self-start ${props.primary ? "btn-primary" : "btn-ghost"}`}>
        {props.cta} →
      </Link>
    </div>
  );
}
