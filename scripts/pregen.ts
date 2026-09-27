/**
 * Pre-generate demo pitches so the live demo never waits on generation.
 * Talks to the running app over HTTP, so it works with any store/queue setup.
 *
 *   npm run dev            (in another terminal, with LIVEPEER_MODE=real)
 *   ZERRA_COOKIE='<Cookie header of a logged-in creator>' npm run pregen -- olipop keychron graza
 *   (DevTools > Network > any request > Request Headers > cookie; it carries the sb-...-auth-token)
 */
const BASE = process.env.APP_URL || "http://localhost:3000";
const headers = { "content-type": "application/json", cookie: process.env.ZERRA_COOKIE || "" };
const brands = process.argv.slice(2);
if (!brands.length) {
  console.log("usage: npm run pregen -- <brand-slug> [more slugs]");
  process.exit(1);
}

type V = { angle: string; status: string; step: string | null; video_url: string | null; error: string | null };
type P = { id: string; status: string; variants: V[] };

async function main() {
  const started: { brand: string; id: string }[] = [];
  for (const brand_id of brands) {
    const res = await fetch(`${BASE}/api/pitches`, {
      method: "POST",
      headers,
      body: JSON.stringify({ brand_id }),
    });
    const p = await res.json();
    if (!res.ok) throw new Error(`${brand_id}: ${p.error}`);
    started.push({ brand: brand_id, id: p.id });
    console.log(`started ${brand_id} -> ${p.id}`);
  }
  const done = new Set<string>();
  while (done.size < started.length) {
    await new Promise((r) => setTimeout(r, 10_000));
    for (const s of started) {
      if (done.has(s.id)) continue;
      const p: P = await (await fetch(`${BASE}/api/pitches/${s.id}`, { headers })).json();
      const line = p.variants.map((v) => `${v.angle}:${v.status}${v.step ? `(${v.step})` : ""}`).join("  ");
      console.log(`${s.brand.padEnd(14)} ${p.status.padEnd(10)} ${line}`);
      if (p.status !== "generating") {
        done.add(s.id);
        p.variants.forEach((v) => v.error && console.log(`   ${v.angle} error: ${v.error.slice(0, 160)}`));
      }
    }
  }
  console.log("\nDone. Open Zerra (Creator > Pitches) to pick the best take for each and send it.");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
