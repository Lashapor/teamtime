# Setting up TeamTime

This is the practical guide. If you want to understand *why* it works the way it does, read [ARCHITECTURE.md](./ARCHITECTURE.md) first.

The whole setup happens in your browser — no `.env` files, no `npm` commands for the database, no terminal. Three steps, ~3 minutes.

## What you'll end up with

- Your own [Supabase](https://supabase.com/) project storing your team's data (free tier).
- TeamTime running at any URL (localhost for trying it out, or a deployed Vercel/Netlify URL for everyday use).
- The connection between the two stored in your browser's `localStorage`.

## Step 1 · Open TeamTime and start the wizard

Open the TeamTime URL. The first time you visit, you'll be redirected to the setup wizard. The wizard has three sub-steps; here's what each one does.

> **For people running it locally:** `git clone … && cd teamtime && npm install && npm run dev`, then open [http://localhost:5173](http://localhost:5173). The wizard appears immediately.

## Step 2 · Create a Supabase project

The wizard's first step is a button that opens [https://supabase.com/dashboard](https://supabase.com/dashboard) in a new tab. There:

1. Sign up (GitHub or email — Supabase does its own magic codes).
2. Click **New project**. Pick the closest region. Set a strong DB password (you won't need it for TeamTime, but Supabase wants one).
3. Wait ~30 seconds for the project to provision.

## Step 3 · Paste your Project URL and anon key

In your project's dashboard, go to **Project Settings → API**. Two values you need:

- **Project URL** — looks like `https://abcdefghijkl.supabase.co`.
- **anon public** key — a long JWT starting with `eyJ…`.

> **Do not copy the `service_role` key.** It bypasses RLS and is meant for server-side code only. TeamTime never needs it.

Switch back to TeamTime's setup wizard and paste both into their fields. The wizard validates the formats so you know if you grabbed the wrong value.

## Step 4 · Run the schema in Supabase's SQL Editor (one-time)

In the wizard, click **Copy SQL** to copy our schema + RLS + RPC into your clipboard. Then click **Open SQL Editor** — it opens your project's SQL Editor in a new tab. Paste, click **Run**. About 5 seconds.

That's the only "configuration" your Supabase project ever needs. The SQL is idempotent, so it's safe to re-run on a future TeamTime release if the schema changes.

## Step 5 · Click Connect

The wizard saves the URL + anon key to your browser's `localStorage`, then reloads. You land on the sign-in page.

## Step 6 · Sign in and create a team

1. Click **Sign in**, enter your email, and Supabase sends you a 6-digit code. Paste it back, you're in.
2. Land on `/dashboard`. Empty state: "Create your first team".
3. Click through. Add yourself plus a few teammates with their timezones and working hours.
4. From the team's admin page, copy the share link — anyone with that URL can view the timeline read-only.

## Day-2 operations

### Switching to a different Supabase project

Go to `/account` and click **Change Supabase project**. The current URL + anon key are cleared from `localStorage` and you're sent back to the setup wizard. Your data is **not** deleted — it stays in your old Supabase project, and you can switch back later by entering its URL + anon key again.

### Revoking a leaked share link

In the team's admin UI, change the **URL slug** under Team settings. The old URL 404s immediately (the `get_shared_team` RPC matches by slug, and the slug no longer exists), and you re-share the new one. The slug is the entire access secret for share-link readers — there is no separate token to "rotate."

### Working from multiple browsers / devices

`localStorage` is per-browser, so each browser needs to know your project. The fastest way to set up a new browser, phone, or invited teammate is the **setup link** on `/account`:

1. On a device that's already connected, go to `/account` and click **Copy setup link**. You get a URL like `https://your-teamtime/setup#u=…&k=…`.
2. Save it in your password manager (1Password, Bitwarden, Apple Keychain, etc.).
3. On any new browser/device, open that link → TeamTime auto-imports the config and drops you on the sign-in page. No pasting, no wizard.

The link is safe to put in a password manager: the anon key in the fragment is **public-by-design**, and Supabase row-level security (created by `supabase.sql`) is what actually protects your data. The fragment (`#…`) never hits any server, only your browser sees it.

If you'd rather not use the link, you can also save the URL + anon key separately in your password manager and re-paste them on each device. Either approach works.

TeamTime also calls `navigator.storage.persist()` after the first save, which asks the browser to keep your config across cache pressure / Safari's 7-day inactivity rule (best-effort; explicit "Clear browsing data" still wipes it — that's what the setup link is for).

### Deploying TeamTime publicly

Push the repo to your host of choice. The build is a static SvelteKit site — Vercel, Netlify, Cloudflare Pages, GitHub Pages all work without configuration. **No env vars are required**; every visitor goes through the setup wizard on their first visit (and their data lives in *their* Supabase project, not yours — full multi-tenant isolation by default).

### Updating to a new TeamTime release

```bash
git pull
npm install
git push          # if you've forked it to a host that auto-deploys
```

If the CHANGELOG mentions a schema change, also re-run the SQL in your project's SQL Editor.

## Optional: env-var override (for deployers)

If you're running TeamTime for a defined audience and you want every visitor to use the same fixed Supabase project (so they don't have to paste anything), set:

```
PUBLIC_SUPABASE_URL=<your project URL>
PUBLIC_SUPABASE_ANON_KEY=<your anon key>
```

In Vercel/Netlify/etc. these go in the project's environment-variable UI. With these set, the setup wizard is skipped for everyone visiting the site. Useful for "single-tenant" deployments where you've already decided which DB to use.

## Recommended: enable Google sign-in (avoids the email rate limit)

Supabase's built-in SMTP is hard-capped at **2 magic-link emails per hour**. You'll hit this fast while testing. Two ways out, easiest first.

### Option A — Google OAuth (~10 min, no emails sent)

This is the recommended path. End users click "Continue with Google" — no rate limits, no SMTP setup, nothing for them to remember.

#### Part 1 — Google Cloud Console

1. Open [console.cloud.google.com](https://console.cloud.google.com) → create a project (or pick an existing one).
2. **APIs & Services → OAuth consent screen** → choose **External** → fill in:
   - App name (anything)
   - User support email (yours)
   - Developer contact email (yours)
   
   Scopes can stay default. Save.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → type **Web application**. Give it any name.
4. **Authorized redirect URIs**: click **Add URI** and paste your Supabase callback URL:
   
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   
   Supabase also displays this exact URL next to the Google provider toggle, so you can copy it from there.
5. **Authorized JavaScript origins**: leave **empty**. Supabase's redirect-based flow never needs it.
6. Click **Create**. A modal pops up showing two values:
   - **Client ID** — ends in `.apps.googleusercontent.com` (long, public-ish)
   - **Client Secret** — starts with `GOCSPX-` (shorter, sensitive)
   
   Copy both. **Save the Client Secret in your password manager** — Google still shows it later in the Credentials page, but a password manager entry saves you a trip.

#### Part 2 — Supabase dashboard

7. Open your Supabase project → **Authentication → Sign In / Providers**.
8. Find **Google** in the list and click it to open its panel.
9. Paste the **Client ID** (the long one ending in `.apps.googleusercontent.com`).
10. Paste the **Client Secret** (the one starting with `GOCSPX-`). **Don't confuse the two** — they go in different fields.
11. **Toggle "Enable Sign in with Google" ON.** This is a separate switch from the Save button — easy to miss, and a common cause of "Unsupported provider" errors.
12. Click **Save**.

That's it. The "Continue with Google" button on `/login` now works. Hard-refresh TeamTime in your browser if it was already open.

#### Common gotchas

| Error | Fix |
|---|---|
| `"Unsupported provider: provider is not enabled"` | The "Enable Sign in with Google" toggle in step 11 is off, or you forgot to click Save. |
| `"Unsupported provider: missing OAuth secret"` | The Client Secret field in Supabase is empty. Re-paste and save. The field may appear blank after a save (the value is still stored server-side); paste again and save if unsure. |
| `"redirect_uri_mismatch"` from Google | The Authorized redirect URI in step 4 doesn't exactly match Supabase's callback URL. Copy it character-for-character — including the `https://` prefix and the `/auth/v1/callback` suffix. |
| Toggle keeps flipping back to off | Sometimes Supabase requires both the Client ID and Client Secret to be present *before* the toggle persists. Paste both first, toggle on, then save. |

> Google's "testing mode" caps you at 100 sign-ins. Fine for a self-hosted team. To lift the cap you submit for verification, which takes days — only worth it if you're going public-scale.

### Option B — custom SMTP (keeps magic-link, raises the rate limit)

If you'd rather stay with magic-link sign-in, swap Supabase's built-in SMTP for your own. Recommended providers:

- **Resend** — free 3,000/month. `smtp.resend.com:587`, username `resend`, password = your API key.
- **Brevo** (formerly Sendinblue) — free 300/day, no domain required.
- **Gmail SMTP** — free 500/day. Requires 2FA + an [App Password](https://myaccount.google.com/apppasswords). Host `smtp.gmail.com:587`, username = your Gmail address, password = the 16-char app password.

In Supabase: **Authentication → Settings → SMTP Settings** → toggle "Enable Custom SMTP" → paste the host/port/username/password/sender. Then bump **Authentication → Rate Limits → "Token verifications"** to something usable (30/hour is plenty).

## Cost summary

| Component | Cost |
|---|---|
| Supabase free tier | $0 |
| Vercel / Netlify / Cloudflare Pages free tier | $0 |
| Domain (optional) | varies |
| Total to run for a team of ≤50 | $0 |

You only start paying if you outgrow your hosting provider's free bandwidth tier or Supabase's 500 MB DB / 50K MAU caps — neither of which is a concern at TeamTime's data shape, even for an active team.

## Troubleshooting

**The wizard says my Project URL is invalid**
The URL is the form `https://<project-ref>.supabase.co`. Make sure you copied the URL, not a different field. The project-ref is the random subdomain Supabase assigns.

**The wizard says my key looks too short**
Make sure you copied the **anon public** key, not the project secret (`service_role`) or the JWT secret. The anon key is a JWT (three dot-separated segments) and is several hundred characters long.

**SQL Editor errors when I paste**
The SQL is idempotent — if you ran an older version once, the new run should still succeed. If you see a permission error mentioning `auth.users`, make sure you're pasting it into the SQL Editor of *your* project (not a Supabase-managed shared editor) — the editor runs as `postgres` and has the rights to alter `auth.users` triggers.

**Sign-in works but `/dashboard` is empty and frozen**
Open the browser devtools network tab. If you see `401`/`403` responses from the Supabase REST API, the SQL didn't run successfully — open the SQL Editor again and check that the `public.teams`, `public.team_members`, etc. tables exist with RLS enabled.

**I lost my Project URL**
Go to your Supabase dashboard. The URL is shown at the top of every project page. There's no recovery to do — your data is fine.

**Old share links stopped working after I renamed the slug**
That's the point — renaming the slug is the revoke mechanism. Share the new URL with whoever should still have access.

## Where to go next

- [ARCHITECTURE.md](./ARCHITECTURE.md) — the *why*. Trust model, data model, permission rules, and what we deliberately don't do.
- [README.md](../README.md) — repo overview and contributing notes.
