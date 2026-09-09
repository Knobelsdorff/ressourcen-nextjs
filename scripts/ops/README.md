# Operational SQL

One-off queries for manual tasks. **Not migrations** — these are run by a human
against production when needed, and must never change schema structure.

Schema changes belong in `supabase/migrations/` (`npm run db:new <name>`).

- `access/`      — granting, fixing, revoking user access
- `admin/`       — creating admin users, updating access functions
- `analytics/`   — cleaning spam/temp-mail entries from analytics
- `diagnostics/` — read-only `check-*` / `debug-*` inspection queries

## Before running

Read the file first. Many contain hardcoded emails and IDs from the original
incident and need editing before reuse. Prefer `diagnostics/` (read-only) when
investigating; anything in the other folders writes to production data.
