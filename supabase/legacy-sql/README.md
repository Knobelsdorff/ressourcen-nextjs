# Legacy SQL (pre-migrations)

Hand-run scripts from before `supabase/migrations/` existed. Each was executed
manually in the Supabase SQL editor, so there is no record of which ran when.

**Superseded by the baseline** `20260904180840_remote_schema.sql`, which was
dumped from production and reflects the actual current schema.

Kept for historical context only — do not run these. Two exceptions were
promoted into real migrations because the baseline did not cover them:

- storage policies -> `20260904181600_storage_policies.sql`
  (`db pull` dumps the `public` schema only, not `storage.objects`)
- `has_seen_dashboard_intro` -> `20260904181500_add_dashboard_intro_flag.sql`
  (referenced in app code but never applied to production)

Safe to delete once the baseline is validated with `supabase db reset --local`.
