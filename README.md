# Zerra

Creators and brands pitch each other with a short generated video ad instead of a text message.
A creator picks a brand, and the app generates a 15 to 30 second spec ad showing that brand's real
product in the creator's style and voice. The brand opens a playable pitch, not a paragraph.

Built for the Livepeer Agent hackathon (Atumera). Livepeer Agent is the whole generation pipeline.

## The one flow

1. Sign up as a **creator** (channel name) or a **brand** (pick one of the seeded brands).
2. Creator sets up a profile (niche, style notes, channel link, voice, 9:16 or 16:9).
3. Creator picks a brand in **Discover brands** and hits **Generate spec ad ×3**.
4. Three takes (Relatable moment, Straight value, Playful) run through the pipeline in parallel.
5. Creator picks the best take in **My pitches**, adds a note and sends it.
6. It shows up playable in that brand's **Inbox**.

## Pages

| Route | Who | What |
|---|---|---|
| `/` | everyone | Landing page |
| `/login`, `/signup` | signed out | Email + password, `?role=brand` preselects brand signup |
| `/creator` | creator | Discover brands, generate a 3-take pitch |
| `/creator/pitches` | creator | Pitches in progress, pick a take, send |
| `/creator/profile` | creator | Voice, style, format, generation status |
| `/brand` | brand | Inbox of playable spec ads |
| `/brand/profile` | brand | The product, facts and cutout creators work with |

Auth is **Supabase Auth**: email + password and SSO through any OAuth provider you enable (Google,
GitHub, ...). `src/proxy.ts` refreshes the session cookie, `src/lib/auth.ts` reads it. Each auth user
gets one row in `users` saying creator or brand; OAuth users pick on `/onboarding` the first time.
API routes derive the creator or brand from the session, never from the request body.

## Pipeline (all on Livepeer Agent)

Each variant is a job chain: `script → visuals → audio → motion → mux`.

| Step | Livepeer capability | What it does |
|---|---|---|
| script | `gemini-text` | Slot filled script (hook, product, benefit, cta) from fixed templates, brand facts and the creator's style notes |
| visuals | `flux-dev` | One 9:16 frame per beat, same style frame for all 4, product never rendered |
| audio | `inworld-tts`, `sonilo-t2m` | Voiceover per beat in the creator's chosen voice, instrumental music bed sized to the ad |
| motion | `ffmpeg-kenburns` | Animatic motion per shot, each cut to the exact length of its VO line |
| mux | `ffmpeg-concat`, `ffmpeg-overlay`, `ffmpeg-burn-subtitles`, `ffmpeg-audio-mix`, `ffmpeg-mux` | Stitch, composite the brand's **real** product cutout, burn captions, mix VO + music, final mp4 |

Cost is roughly $0.18 per variant (about $0.55 per 3 take pitch). A pitch takes 3 to 5 minutes.

Quality rules baked in: the model never renders the product (the real cutout is composited), animatic
style over shaky full motion, fixed prompt templates only, 3 variants per pitch, and if the creator's
channel link is set the ad opens on their latest video thumbnail.

## Run it

```bash
npm install
cp keys.env.example keys.env      # then fill it in (see below)
npm run dev                        # http://localhost:3000
```

`keys.env` holds every secret and is gitignored. Nothing is sent to the browser.

| Variable | Default | Notes |
|---|---|---|
| `LIVEPEER_MODE` | `mock` | `mock` returns canned assets instantly and spends nothing. `real` generates on Livepeer. |
| `LIVEPEER_MCP_URL` | `https://agent.livepeer.org/api/mcp` | Hosted Livepeer Agent MCP (raw surface) |
| `LIVEPEER_AGENT_KEY` | empty | Empty runs on keyless demo credits. Daydream `sk_` keys are rejected by this endpoint. |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | empty | **Required** for login (Supabase Auth). The legacy anon key also works. |
| `SUPABASE_SERVICE_ROLE_KEY` | empty | Server-side data access. Without it data goes to `.data/db.json` and videos to `.data/videos` |
| `AUTH_PROVIDERS` | empty | OAuth providers to show as "Continue with …", e.g. `google,github` |
| `DEMO_PASSWORD` | empty | Only for `npm run seed`: password of the demo logins it creates |
| `REDIS_URL` | empty | Without it the job chain runs inline in the Next.js process. With it, run `npm run worker` too. |
| `VARIANTS_PER_PITCH` | `3` | 1 to 3 |

### Set up the cloud database

1. Put `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `DEMO_PASSWORD` in `keys.env`.
2. Push the schema. Get the connection string from the dashboard (**Connect** > Session pooler),
   with your database password filled in:

   ```bash
   npx supabase db push --db-url "postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
   ```

   No CLI? Paste `supabase/migrations/001_init.sql` then `002_users.sql` into the SQL editor instead.
3. Push all the dummy data (brands, the demo creator, 4 pitches with 12 finished takes, their videos
   into Storage, and demo logins). Safe to re-run.

   ```bash
   npm run seed
   ```

   The data lives in `supabase/seed/demo.json` + `supabase/seed/videos/`. Demo logins are
   `demo-creator@example.com` and `<brand-slug>@example.com` (e.g. `olipop@example.com`), all with `DEMO_PASSWORD`.

### Auth setup in the Supabase dashboard

- **Authentication > URL Configuration**: Site URL = your app URL, and add `https://<your-app>/auth/callback`
  (plus `http://localhost:3000/auth/callback` for dev) to Redirect URLs.
- **SSO / OAuth**: enable providers under **Authentication > Sign In / Providers**. In each provider's own
  console (Google Cloud, GitHub OAuth app) the callback URL is `https://<ref>.supabase.co/auth/v1/callback`.
  List the enabled ones in `AUTH_PROVIDERS`.
- Email confirmation is on by default on hosted projects: signups get a link that lands on `/auth/callback`.

### Redis (BullMQ)

Put `REDIS_URL` (Upstash works) in `keys.env`, then `npm run dev` in one terminal and `npm run worker` in another.

Finished ads are copied into the public `pitches` storage bucket so pitches never depend on a third party URL.

### Pre-generate the demo

```bash
LIVEPEER_MODE=real npm run dev
ZERRA_COOKIE='<cookie header>' npm run pregen -- olipop keychron loop
```

Log in as a creator first and copy the request `cookie` header from DevTools (it carries `sb-…-auth-token`). Then pick and send
the best take for each in **My pitches** so the brand inboxes are full for the demo.

## Code map

```
src/lib/livepeer/client.ts     MCP client: run_capability, job polling, uploads
src/lib/livepeer/generate.ts   one function per media op, real + mock, retries and concurrency gates
src/lib/pipeline/templates.ts  fixed prompt templates, angles, voices, caption cues
src/lib/pipeline/steps.ts      the 5 steps + runner + product placement
src/lib/queue.ts               BullMQ chain (or inline fallback)
src/lib/store/                 Supabase store + zero setup local JSON store
src/data/brands.json           10+ seeded brands with real product images and facts
public/brands/                 background removed product cutouts (made with ideogram-bg-remove)
worker/index.ts                BullMQ worker
scripts/                       seed + pregen
docs/livepeer-notes.md         capability params we probed and gotchas
```
