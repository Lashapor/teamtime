1. Core Problems to Solve

Clarity: Right now, the orange highlight and hover effect work but it’s not immediately intuitive when there are many rows.

Scalability: With a large company (dozens/hundreds of staff), the vertical list becomes unreadable.

Dynamic Accuracy: People travel; working hours shift; you want to avoid stale data.

Ease of Setup: You don’t want every user to “register” — but you do want accurate info (maybe pulled from Google/Outlook calendars or Sheets).

2. UX / UI Improvements
A. Layout & Visualization

Group by timezone instead of only by person:

Example: Show “Team in Berlin (CET)” → list names under it.

This collapses 20 Berlin people into one block, avoiding clutter.

Heatmap rows by timezone:

Dark blue = work hours (9–18 local).

Orange vertical line = “current moment” across all zones.

Light orange = preview if hovering on a future slot.

Condensed / Expandable Rows:

Default: show timezones as groups.

Expand: see individual people under that timezone.

B. Interaction Patterns

Global vertical line (always visible):
Instead of only on hover, show a vertical “NOW” line across all rows, so you can compare instantly.

Meeting planner mode:

Drag across hours (like Google Calendar) → highlight possible overlap hours for all members.

It shades areas where all or most are available.

C. Handling Many People

Search bar: quickly type a name, and that person’s row highlights.

Pin favorites: for managers, pin their direct reports to the top.

Compact mode: switch to smaller cells (half-height) if >30 staff.