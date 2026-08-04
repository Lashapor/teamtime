# TeamTime

Self-hosted timezone scheduler for distributed teams.

## The Problem

Distributed teams live across timezones. You can never quickly see who's at desk, who's about to log off, or what window you've got to talk live. Most tools either lock the data in their cloud, charge per-seat, or only show the current local time — not actual working hours.

## The Solution

A static SvelteKit app backed by your own Supabase. Every teammate's working hours render as a 24-hour grid in their local timezone — current-hour ring, day boundaries, tap-to-translate-time. Each team gets a shareable URL; sign-in unlocks editing. No central server.

```
Browser (SvelteKit) → Supabase (your account) → Postgres + RLS
```

## Features

- **Timeline grid** — 24-hour blocks per teammate, with current-hour ring, day-boundary chips, and hover/tap-to-translate-time across rows.
- **Up to two shifts/day** — handles split work patterns (e.g. on-call sweeps, evening syncs).
- **Per-team share URL** — `/teams/<your-slug>`. Optional password on top. Rename the slug to revoke.
- **Multi-tenant** — every signed-in user owns their own teams, isolated by Postgres row-level security.
- **Auto-link** — invited members bind to their auth identity automatically when they first sign in with a matching email.
- **Magic-link or Google sign-in** — both built-in, configured per-deployment in your Supabase.
- **Mobile-friendly** — tap-to-pin highlights an hour across rows; the timeline scrolls horizontally on small screens.

## Prerequisites

- [Node.js 20+](https://nodejs.org) (only for `npm run dev`/`build` — production deploys are static and run anywhere)
- Free [Supabase](https://supabase.com) account
- Modern browser (Chrome, Safari, Firefox — `localStorage` + `Intl` are required)

## Setup

```bash
git clone https://github.com/Lashapor/teamtime.git
cd teamtime
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The setup wizard walks you through everything:

1. Sign up at supabase.com and create a new project (~30s).
2. Paste your **Project URL** and **publishable key** into the wizard.
3. Click **Copy SQL** → **Open SQL Editor** → paste → **Run**. (~5s; one time only.)
4. Optional: enable Google sign-in by configuring an OAuth client in Google Cloud Console (10 min, instructions in [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md)).
5. Click **Connect** → sign in via magic-link → create your first team.

No `.env` files. No `npm run db:push`. Everything runs from the browser.

## Usage

```bash
npm run dev          # http://localhost:5173
npm run build        # production build (deploys to any static host)
npm run preview      # preview production build locally

npm test             # vitest unit tests on time + offset math
npm run check        # svelte-check
```

Once connected, copy your **Setup link** from the `/account` page. Save it in your password manager — opening that link on any new browser, phone, or invited teammate's device skips the wizard entirely.

## Project Structure

```
teamtime/
├── supabase.sql              # Schema + RLS + RPCs (paste once into Supabase SQL Editor)
├── src/
│   ├── routes/
│   │   ├── +page.svelte                      # Landing page
│   │   ├── setup/                            # In-browser BYO-Supabase wizard
│   │   ├── login/                            # Magic-link + Google sign-in
│   │   ├── dashboard/                        # Your teams list
│   │   ├── teams/new/                        # Create a team
│   │   ├── teams/[slug]/                     # Public read-only timeline
│   │   ├── teams/[slug]/admin/               # Owner admin: members, settings, sharing
│   │   └── account/                          # Profile, sign-out, setup-link copy
│   └── lib/
│       ├── db/
│       │   ├── client.ts                     # Supabase client + localStorage config
│       │   ├── queries.ts                    # Typed query/mutation helpers
│       │   └── auth-store.ts                 # Reactive auth store
│       ├── auth/supabase-auth.ts             # Magic-link + Google + signOut wrappers
│       ├── team/                             # Timeline UI (rows, cells, edit panel)
│       ├── time/                             # Timezone offset + shift math (no DST)
│       ├── components/                       # Generic UI (Button, TextInput, etc.)
│       └── stores/                           # Svelte stores (viewer, day anchor, hover)
└── docs/
    ├── SELF_HOSTING.md       # Step-by-step deployment guide + troubleshooting
    └── ARCHITECTURE.md       # Trust model, data model, permission rules
```

## Tech Stack

- **Frontend:** SvelteKit 2 + Svelte 5 (legacy syntax), Vite 8, Tailwind 3, Luxon
- **Backend:** none — your browser talks directly to Supabase
- **Database:** Supabase (Postgres + RLS + Auth)
- **Tests:** Vitest 4 (focused on timezone + shift math)
- **Deploy target:** any static host. `adapter-auto` picks Vercel, Netlify, Cloudflare Pages, etc. without configuration.

## Privacy

All your team's data lives in *your* Supabase project. There is no central TeamTime database, no analytics, no telemetry, no third-party tracking. The TeamTime code only runs in your browser and talks directly to your Supabase instance over HTTPS. Drop your Supabase project to delete every byte.

## License

MIT
