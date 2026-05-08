# Architecture

This document describes how TeamTime is put together: the moving parts, the data model, the permission model, and the trust boundaries. If you're trying to set up your own deployment, start with [SELF_HOSTING.md](./SELF_HOSTING.md) — this doc is for understanding what you're deploying.

## Goal in one paragraph

TeamTime is an open-source, self-hostable, multi-tenant tool for visualising your team's working hours across timezones. The single deployable artifact is a SvelteKit static site backed by a [Supabase](https://supabase.com/) project. One deployment can serve many independent users — anyone who signs in becomes their own workspace owner, can create multiple teams, and can share each team via a per-team URL with an optional password. There is no server you run; there is no service-role secret on the client; isolation is enforced by Postgres row-level security.

## Stack

```
                    ┌──────────────────────────────────────┐
                    │ Browser                              │
                    │   SvelteKit 2 + Svelte 5 + Vite 8    │
                    │   Tailwind 3 · Luxon (offset math)   │
                    │   @supabase/supabase-js              │
                    └──────────────┬───────────────────────┘
                                   │
                            URL + anon key + (per-user JWT)
                                   │
                                   ▼
                    ┌──────────────────────────────────────┐
                    │ Supabase project (Postgres)          │
                    │   schema + RLS + RPC ← supabase.sql  │
                    │   tables · public.teams              │
                    │          · public.team_members       │
                    │          · public.shifts             │
                    │   auth   · auth.users (managed)      │
                    └──────────────────────────────────────┘
```

We deliberately do **not** run a backend of our own. SvelteKit deploys as a static site (Vercel / Cloudflare Pages / Netlify / GitHub Pages — anything will do). All data flow goes through Supabase's HTTPS + WebSocket connection from the browser. Authentication is built into Supabase; permissions are enforced server-side by Postgres row-level security.

### Why Supabase

| Need | Supabase | Notes |
|---|---|---|
| Free tier good enough for a small team | ✅ | 500 MB DB, 50K MAU, unlimited API requests |
| Standard, debuggable storage | ✅ | Plain Postgres — works with every tool you already know |
| Auth (magic-link + Google, etc.) built-in | ✅ | No separate identity provider to wire |
| Permissions on the server (so the client is untrusted) | ✅ | Postgres RLS — declarative, audited, well-understood |
| Schema-as-code (committable, reviewable) | ✅ | `supabase.sql` at the repo root, pasted into the SQL Editor — no terminal needed |
| Aligns with the [Xarji](https://github.com/tornikegomareli/Xarji) flow we're modelling on | ✅ | Same "bring your own DB credentials" ethos |

## Trust model

Two values get pasted into the browser: the **Project URL** and the **anon key**. Both are public-by-design — they identify the project, but they grant no privileges by themselves. Every request is also signed with a per-user JWT (after sign-in), and every read or write is filtered by RLS policies running inside Postgres.

The dangerous credential — the **service role** key — is never used by TeamTime. It exists only inside Supabase's dashboard; we never touch it, never bundle it, never instruct anyone to paste it anywhere. If you see a Supabase guide telling you to set `SUPABASE_SERVICE_ROLE_KEY`, that is for server-side code, which TeamTime doesn't have.

A leaked anon key + URL is harmless: an attacker still has to defeat RLS to read or write anything they shouldn't.

## Data model

Defined in `supabase.sql` at the repo root. Run it once in your Supabase project's SQL Editor. The TypeScript code reads/writes these tables via `@supabase/supabase-js`.

```sql
public.teams (
  id              uuid primary key,
  owner_id        uuid not null  references auth.users(id) on delete cascade,
  slug            text not null,
  name            text not null,
  share_enabled   boolean not null default true,
  share_password  text,
  created_at      timestamptz not null default now(),
  unique (owner_id, slug)
);

public.team_members (
  id          uuid primary key,
  team_id     uuid not null references public.teams(id) on delete cascade,
  user_id     uuid     references auth.users(id) on delete set null, -- auto-linked by trigger when signup matches
  email       text not null,
  name        text not null,
  img_url     text,
  offset_min  int  not null,                -- -720..+840
  role        text not null,                -- 'owner' | 'editor' | 'viewer'
  created_at  timestamptz not null default now()
);

public.shifts (
  id              uuid primary key,
  team_member_id  uuid not null references public.team_members(id) on delete cascade,
  start_min       int  not null,            -- 0..1440
  end_min         int  not null,            -- 0..1440 (1440 = midnight at end)
  ord             int  not null             -- 0 or 1; up to 2 shifts per day
);

```

A trigger on `auth.users` insert/update auto-fills `team_members.user_id` whenever a sign-up's email matches a previously-added row. This is how an invited teammate's row "binds" to their identity once they actually sign in.

`teams.slug` is **globally unique** across the project (enforced by a unique constraint), because the URL `/teams/<slug>` has to route deterministically to one team. Owners pick their own slug; the wizard checks availability live as you type via the `is_slug_available` RPC.

### Why slug is the share secret (and how revocation works)

There is no separate share token. The slug *is* the secret that gates public read access — anyone with the URL can see the team if `share_enabled = true`. To revoke a leaked URL, the owner renames the slug; the old URL 404s instantly because the `get_shared_team` RPC matches by slug, and the old slug no longer exists.

This trades the "rotate token without breaking memorability" feature for a much simpler model: one URL, one secret, one rename = one revocation. If the slug is too guessable, an optional password gate is also available (set in **Password** under Team settings).

### Why allow up to two shifts per day

Empirically, "I'm online 9–18 and again 21:30–24:00" comes up often enough (split work day, on-call sweep, evening sync) that hard-coding it into the data model beats forcing every user to model recurring patterns. More than two starts to need a real recurrence engine, which is intentionally out of scope.

## Permission rules

Every table has RLS enabled, with policies that boil down to:

```
teams:        owner-only writes, owner & members read
team_members: owner full CRUD; member can edit their own row only
shifts:       inherit access from the parent team_member (owner or self)
```

The full SQL lives in `supabase.sql`. The most subtle rule is `team_members.update`: an invited teammate, signed in with a matching email, can edit **only** their own row. They cannot promote themselves, change another teammate's row, or reach into a different team's data.

### Public read by slug

RLS doesn't allow anonymous reads from `teams` directly — that would let any visitor enumerate every shared team in the project. Instead, the public share-link read goes through a `security definer` Postgres function called `get_shared_team(p_slug)`. The function:

1. Looks up the team by slug, requires `share_enabled = true`.
2. Returns a single JSON blob with the team + members + shifts, or `null` if the slug doesn't match a shared team.

It only returns one team at a time, by exact slug — there's no way to list shared teams through it. `security definer` is what lets it see the `teams` row that RLS would otherwise hide. There is exactly one such RLS-bypass function, with this one signature.

A second `security definer` helper, `is_slug_available(p_slug)`, returns a boolean used by the admin's live availability check. Granted only to `authenticated` (not `anon`), so signed-out visitors can't probe the namespace.

## Routes

| Route | Auth | Purpose |
|---|---|---|
| `/` | public | Landing page. CTA: "Sign in to start". |
| `/setup` | public | Wizard: paste Project URL + anon key, copy/run SQL, click Connect. |
| `/login` | public | Magic-link email (6-digit OTP). |
| `/dashboard` | required | Lists teams the user owns; "Create a team" CTA when empty. |
| `/teams/new` | required | Form: name, slug (auto from name), optional share password. |
| `/teams/[slug]` | viewer | Read-only timeline. Honors `?token=` (share access) and the inline password gate. |
| `/teams/[slug]/admin` | owner | Add/remove members, edit timezone & shifts, manage the share link & password. |
| `/account` | required | Profile, sign-out, "Change Supabase project". |

Notable: `/teams/[slug]` does the right thing for everyone:
- Owner → renders the timeline; a "Manage" link in the header goes to `/admin`.
- Invited teammate (signed in, email matches a member row) → renders the timeline; an "Edit my row" link goes to `/admin`.
- Anyone with a valid `?token=…` → renders the timeline read-only.
- Anyone else → "Team not found".

## Lifecycle of a typical write

To make the trust boundaries concrete, here's what happens when an owner edits a teammate's working hours:

1. Owner is on `/teams/engineering/admin`. Their session has a Supabase JWT in `localStorage`.
2. They change the shift in the UI. The component calls `setMemberShifts(memberId, [...])`.
3. `@supabase/supabase-js` sends an HTTPS PATCH/INSERT over the wire, signed with the JWT.
4. PostgREST validates the JWT, evaluates the RLS policy for `shifts` writes (owner can write any of their team's shifts; member can write their own). True. Write committed.
5. The page that initiated the write awaits the response and refetches its local view. Other tabs need a refresh to see the change — Realtime is intentionally not wired in v1 (see "What we deliberately don't do").

If the same write came from a logged-out visitor, step 4 would fail and the transaction would be rejected before touching storage. The browser-side code can't bypass it — there's no "service role" key on the client to abuse.

## What we deliberately don't do

- **No server.** No Edge Functions, no Apps Script, no proxy. Less to maintain, less to secure.
- **No realtime channels in v1.** Mutations refetch the local page; cross-tab/user updates need a refresh. Adding `supabase.channel(...).on('postgres_changes', ...)` later is a few lines per page; we kept v1 simple.
- **No DST.** Timezones are modelled as fixed UTC offsets (with half-hour and 45-minute support). Adding DST means modelling named zones and Olson rules; it's a meaningful complexity bump and we don't need it for the "see the team across the world" use case.
- **No invite emails (yet).** Owners share the link manually. Email delivery is a deployment headache and an obvious follow-on, not a v1 requirement.
- **No audit log.** v1.

## Files of interest

| Concern | File |
|---|---|
| Schema + RLS + RPC | `supabase.sql` |
| DB client (singleton) | `src/lib/db/client.ts` |
| Typed query/mutation helpers | `src/lib/db/queries.ts` |
| Auth wrapper | `src/lib/auth/supabase-auth.ts` |
| Auth state store | `src/lib/db/auth-store.ts` |
| Timezone & shift math | `src/lib/time/*` |
| Timeline UI primitives | `src/lib/team/{TimelineRow,HourCell,AvatarImg,EditRowPanel}.svelte` |
| Setup wizard | `src/routes/setup/+page.svelte` |
| Public viewer route | `src/routes/teams/[slug]/+page.svelte` |
| Owner admin route | `src/routes/teams/[slug]/admin/+page.svelte` |
