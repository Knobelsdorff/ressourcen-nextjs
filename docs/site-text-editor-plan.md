# Inline text editor for admins – plan

Status: **prototype** at `/test/text-editor` (localStorage instead of the DB). Waiting for go-ahead.

## What the admin experiences

1. Admin is logged in → small "Texte bearbeiten" button bottom-left (visitors see nothing).
2. Click → dark bar on top: *Bearbeitungsmodus · Weitere Texte · Verlauf · N Änderungen · Verwerfen · Speichern · Fertig*.
3. Every editable text gets a faint outline. Hover → blue outline + pencil. Click pencil (or the text, needed on phones) → type directly in place, in the real layout.
4. Enter = apply, Shift+Enter = new line, Esc = cancel, click elsewhere = apply. Changed texts are highlighted yellow.
5. "N Änderungen" shows old → new for each change, with undo per item. **Speichern** (or Ctrl+S) publishes everything at once.
6. Texts without a visible spot (input placeholders, error messages, success messages) are edited in the "Weitere Texte" panel.
7. "Verlauf" lists past saves and can bring back any previous version. Every text has "Original" to go back to the text in the code.

Unsaved changes survive navigating between pages (dashboard → create-story) and the browser warns before closing the tab.

## Why explicit keys instead of "detect all text on the page"

Auto-detecting DOM text (by path or by the text itself) breaks as soon as a developer changes markup or copy, and React re-renders overwrite DOM edits. Instead each text gets a stable key once:

```tsx
<motion.h1 variants={item} className="font-bold">
  <T k="landing.hero.title">Finde innere Ruhe und fühl dich sicher und geborgen</T>
</motion.h1>

const placeholder = useSiteText("createStory.figure.placeholder", "Eine Figur, ein Thema, eine Idee …");
```

- The text in the code stays the **default**. If no override exists, nothing changes.
- Surrounding markup, animations, classes stay as they are. Migration is pure wrapping.
- Placeholders like `{name}` are supported (`vars={{ name }}`); the editor refuses to save if one is deleted.
- Key naming: `page.section.element` (e.g. `dashboard.welcome.title`).

## Database (Supabase)

```sql
create table public.site_texts (
  key              text primary key check (key ~ '^[a-zA-Z0-9_.-]{3,120}$'),
  value            text not null check (char_length(value) between 1 and 5000),
  default_snapshot text,               -- code default at time of edit
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users(id)
);

create table public.site_text_revisions (
  id         bigint generated always as identity primary key,
  key        text not null,
  old_value  text,                     -- null = was the code default
  new_value  text,                     -- null = reset to code default
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

alter table public.site_texts enable row level security;
alter table public.site_text_revisions enable row level security;
create policy "site_texts readable by everyone" on public.site_texts for select using (true);
-- no insert/update/delete policies: writes only through the API route (service role)
```

Saving uses one RPC (`save_site_texts(changes jsonb, actor uuid)`) so upserts, deletes (reset to original) and revision rows commit in a single transaction. A rollback SQL file goes into `supabase/rollback/` like the other migrations.

## Data flow

- **Read:** root `layout.tsx` (server) loads all overrides with `unstable_cache(..., { tags: ["site-texts"] })` and passes them to `<SiteTextProvider>`. That's a few hundred short rows, a few KB, cached, so visitors see the final text in the first HTML. No flicker, and correct for SEO.
- **Write:** `POST /api/admin/site-texts` → server checks the session user against a **server-only** `ADMIN_EMAILS` (the current `NEXT_PUBLIC_ADMIN_EMAILS` is visible in the browser bundle, so it's fine for showing UI but not for authorizing writes) → validates keys, length, placeholders → RPC → `revalidateTag("site-texts")`. All visitors get the new text immediately.
- **Conflicts:** the request sends the `updated_at` each text had when loaded. If another admin saved the same key in between, the API returns 409 and the editor shows "was changed by someone else – reload or overwrite".
- **Code default changed later:** if `default_snapshot` ≠ current default, the editor shows a badge "Original im Code wurde geändert" so nobody silently keeps outdated copy.
- **Bundle size:** the editor (bar, panels, contentEditable logic) is loaded with `next/dynamic` only when the user is an admin. Visitors only get the tiny `<T>` that renders a string.

## Safety details already solved in the prototype

- Clicking a text inside a button or link opens the editor and does **not** trigger the button. That includes Chrome firing a parent `<button>` on space keyup.
- Paste inserts plain text only. Rendering is always plain text (no `dangerouslySetInnerHTML`), so no XSS.
- Empty texts and removed `{placeholders}` are rejected.
- The same key rendered twice (mobile + desktop variants of a section) updates everywhere.

## Scope

| Area | Approx. strings | Notes |
|---|---|---|
| Landing page sections | ~160 | first, highest value |
| Dashboard + onboarding dialog | ~80 | `dashboard/page.tsx` is 3600 lines, so wrap carefully |
| Create-story flow, voice/figure selection | ~40 | incl. placeholders and error messages via panel |
| Header, footer, FAQ | ~40 | |
| Later / optional | | page `<title>`/OG meta, email templates, Impressum/Datenschutz as long blocks |

Not in scope: AI-generated story content, AI prompts, user data.

**Formatting in v1:** plain text + line breaks. If bold words or links inside a sentence are needed, v2 adds a tiny markup (`**fett**`, `[Text](/link)`) rendered safely, never raw HTML.

## Phases

1. **Foundation** (~2 days): migration + rollback, RPC, API route with server-side admin check, provider in root layout, `<T>`/`useSiteText`, edit bar, history, conflict check. Move the prototype from `src/app/test/text-editor/_site-text/` to `src/components/site-text/`.
2. **Landing page** (~0.5–1 day): wrap all sections. Copy stays byte-identical until someone edits.
3. **Dashboard + create-story + header/footer** (~2 days).
4. **Optional:** inline markup, meta tags, emails, "who changed what" in history.

## Open questions

1. Who may edit: only `NEXT_PUBLIC_ADMIN_EMAILS` admins, or music admins too?
2. Is plain text enough for v1, or are bold words or links inside sentences needed right away?
3. Should Impressum and Datenschutz be editable too (legal texts, long)?
