# Documentation

## setup/
Getting the project running: environment, auth, admin accounts, deployment
commands, edge functions, git conventions.

## integrations/
- `stripe/`   — checkout, subscriptions, customer portal, going live
- `webhooks/` — Stripe webhook setup, local vs production, testing
- `email/`    — Resend/SMTP config, magic links, password reset

## infrastructure/
Vercel and DNS configuration, environment checks, reading production logs.

## features/
Product features and pricing: paywall, packages, subscription strategy,
multi-account prevention, Safari audio rollout.

## operations/
Recurring manual tasks — granting client access, managing music admins,
storage policies. The SQL these describe lives in `scripts/ops/`.

## testing/
Manual test procedures and debugging walkthroughs.

## archive/
Resolved incidents, kept for history. Useful when a problem recurs, but they
describe past states — verify against current code before acting on them.
Grouped by `stripe/`, `webhooks/`, `dns/`, `email/`.

---

## Related

- `supabase/migrations/` — schema, versioned and ordered. Add with `npm run db:new <name>`.
- `supabase/legacy-sql/` — pre-migration hand-run scripts, archived.
- `scripts/ops/`         — one-off operational SQL, run manually.
- `scripts/deploy/`      — edge function deployment.

## Database workflow

```bash
npm run db:new <name>   # create a migration
npm run db:reset        # rebuild locally from migrations (needs Docker)
npm run db:push         # apply to production
npm run db:diff         # show drift between local and remote
```
