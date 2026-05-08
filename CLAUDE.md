# TeamTime — Claude instructions

Project context lives in three places. Read what's relevant before making changes:

- [README.md](README.md) — what TeamTime is, how to set up, project structure.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — data model, RLS, trust boundary, route table.
- [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) — setup wizard flow, Google OAuth steps, troubleshooting.
- [supabase.sql](supabase.sql) — full Postgres schema + RLS + RPCs (idempotent; the user re-runs it after changes).

## Verify before claiming done

```
npm run check     # type-check; expect 0 errors
npm run build     # static build; must succeed
npm test          # vitest; all green
```

## Conventions

- **Svelte 5 in legacy compat mode.** Use `$:` reactivity, `let` declarations, classic stores. Don't introduce runes (`$state`, `$derived`, `$props`) unless explicitly asked.
- **No backend.** TeamTime is BYO-Supabase. The browser talks directly to the user's Supabase project. Don't add Edge Functions, server endpoints, or required env vars.
- **Trust boundary is Postgres RLS.** Client-side checks are UX-only; the server (RLS + `security definer` RPCs) is the truth.
- **Schema changes** go in `supabase.sql` and must be idempotent (`drop ... if exists` / `do $$ if not exists ... $$` patterns). The user re-applies the file by pasting it into Supabase's SQL Editor — there is no migration tool.
- **Mutations** live in `src/lib/db/queries.ts`. Pages await mutations and re-fetch their own data. No Realtime channels in v1 — additions are fine but say so explicitly.
- **Auth:** magic-link OTP + Google OAuth, both via `@supabase/supabase-js`. Configured per-deployment in the user's Supabase dashboard.

## Don't

- Don't break the BYO model: no central credentials, no shared Supabase, no required env vars (`PUBLIC_SUPABASE_*` are *optional* fixed-tenant overrides).
- Don't add new top-level docs files. README + the two files in `docs/` are the canon — extend those instead.
- Don't generate `.md` files for plans, summaries, or notes unless the user asks. Keep them in conversation.
