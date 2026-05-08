# Team Time

A live, side-by-side view of your team's working hours across timezones — and one-click Google Calendar booking from any time slot.

- **Landing page:** `/` — short intro with a CTA to view the team
- **Timeline:** `/<team-slug>` — WorldTimeBuddy-style 24-hour grid, one row per teammate (e.g., `/thn`). Each team has its own slug + password, configured in [src/lib/team/teams.ts](src/lib/team/teams.ts).
- **Source of truth:** a Google Sheet, published as CSV
- **Editing & writes:** a Google Apps Script Web App attached to the sheet
- **Auth:** Google Identity Services (Sign in with Google)
- **Booking:** Google Calendar API v3, sends invites to both attendees

## Sheet schema

Required columns (header row, in this order):

```
name | timezone | imgUrl | startWorkTime | endWorkTime | startWorkTime | endWorkTime | email
```

- `timezone`: `UTC+4`, `UTC-04:00`, `UTC+5:30`, etc. Half-hour and 45-minute offsets are supported. (Legacy `GMT±N` is also parsed.)
- The two `startWorkTime/endWorkTime` pairs let a teammate have a split shift (e.g., `9:00–18:00` and `21:30–0:00`). The second pair can be left blank.
- Use `0:00` to mean "midnight at the end of the day" (e.g., a shift ending at midnight).
- `email` is required for any row that wants to be editable or invited to meetings; values are matched case-insensitively against the signed-in user's Google email.

## Local development

```bash
npm install
cp .env.example .env   # fill in your values (see below)
npm run dev            # http://localhost:5173
npm test               # vitest run on time + parser logic
npm run check          # svelte-check
```

## Environment variables

Set these in `.env` for local dev and in your hosting provider for production. All four are public (the `PUBLIC_` prefix exposes them to the browser).

| Var                          | What it is                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `PUBLIC_CSV_URL`             | The "Publish to web" CSV URL of your sheet. Optional — falls back to the bundled default sheet.             |
| `PUBLIC_APPS_SCRIPT_URL`     | The Web App URL of your deployed Apps Script. Required for editing rows.                                    |
| `PUBLIC_GOOGLE_CLIENT_ID`    | OAuth 2.0 Web Client ID. Required for Sign in with Google + Calendar booking.                               |
| `PUBLIC_SHEET_WRITE_SECRET`  | Random shared secret. Frontend sends it to Apps Script; Apps Script verifies it. Rotate when needed.        |

You can also pass a custom CSV URL at runtime via the URL hash, e.g. `/thn#https://docs.google.com/.../pub?output=csv`.

## Adding a team

Each team is a slug-keyed entry in [src/lib/team/teams.ts](src/lib/team/teams.ts) and a folder under `src/routes/<slug>/`. To add a new team, append an entry to `TEAMS` (with its own password and optional `csvUrl`) and create `src/routes/<slug>/+page.svelte` that mirrors `src/routes/thn/+page.svelte`.

## Deploying the Apps Script writer

1. Open the Google Sheet → **Extensions → Apps Script**.
2. Replace the contents of `Code.gs` with [scripts/Code.gs](scripts/Code.gs).
3. **Project Settings → Script Properties → Add script property**, four entries:
   - `SHARED_SECRET` — same value as `PUBLIC_SHEET_WRITE_SECRET` in the frontend
   - `SHEET_ID` — the spreadsheet ID (from its URL)
   - `SHEET_NAME` — e.g., `Sheet1`
   - `GOOGLE_CLIENT_ID` — same OAuth Web Client ID as the frontend
4. **Deploy → New deployment → Web app**
   - Description: `TeamTime writer v1`
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the resulting `/exec` URL into `PUBLIC_APPS_SCRIPT_URL`.
6. Re-deploy ("Manage deployments → ✏️ → New version") whenever you change `Code.gs`.

The frontend POSTs as `text/plain` to dodge CORS preflight; the script parses the JSON body itself.

## Setting up Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) → create / pick a project.
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** → External, fill in basics, add the scope `https://www.googleapis.com/auth/calendar.events`.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**.
   - Authorized JavaScript origins: `http://localhost:5173`, your production URL.
   - Authorized redirect URIs: not needed for the implicit / token client we use.
5. Copy the Client ID into `PUBLIC_GOOGLE_CLIENT_ID`.

## How it works

- `src/lib/sheet/parser.ts` parses the CSV manually so duplicate `startWorkTime/endWorkTime` columns are preserved. d3 is no longer used.
- `src/lib/time/*` uses Luxon for all offset math. We model fixed UTC offsets only (no DST).
- `src/lib/team/*` renders the timeline. The viewer's reference timezone is auto-detected from `Intl` and overrideable via a dropdown (persisted in `localStorage`).
- `src/lib/auth/gis.ts` lazily loads Google Identity Services. Sign-in must be triggered from a real user click.
- `src/lib/calendar/client.ts` calls Calendar API v3 with `sendUpdates=all` so both attendees get the invite email.
- `src/lib/sheet/writer.ts` POSTs row edits to the Apps Script Web App. Edits are gated by signed-in email matching the row's email.

## Out of scope (for now)

DST-aware named zones · persisted sessions · server-side avatar caching · multi-team / per-row PTO · drag-to-select multi-hour booking · reschedule / cancel from UI · admin UI for the Apps Script secret.
