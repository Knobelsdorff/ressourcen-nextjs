# Safari Audio Rollout & Verification

## 1) Inventory (before migration)

- Endpoint: `GET /api/admin/resources/list-sent`
- New fields:
  - `audio_format`
  - `is_safari_compatible`
  - `formatSummary`
- Goal: confirm how many `webm/ogg` files exist.

## 2) On-demand migration (recommended default)

- Endpoint: `POST /api/audio/migrate-on-demand`
- Body:

```json
{
  "storyId": "<saved_stories.id>"
}
```

- Behavior:
  - If source is already `mp3/m4a/mp4`: returns existing URL immediately.
  - If source is `webm/ogg`: transcodes to `_safari.mp3` on first Safari request.
  - If another request is already migrating same story: waits and reuses result.

## 3) Optional bulk migration dry-run

- Endpoint: `GET /api/admin/audio/migrate-formats?limit=200`
- Endpoint: `POST /api/admin/audio/migrate-formats` with body:

```json
{
  "dryRun": true,
  "limit": 50
}
```

- Verify candidate list and spot-check `filename`.

## 4) Optional pilot bulk migration (5-10 files)

Run:

```json
{
  "dryRun": false,
  "limit": 10
}
```

Success criteria:
- `migrated > 0`
- `errors = 0` for pilot batch
- `saved_stories.audio_url` now points to `_safari.mp3` for migrated entries

## 5) Browser verification matrix

- Safari macOS: migrated old file plays end-to-end.
- Safari iOS: migrated old file plays end-to-end.
- Chrome: migrated files and new MP3/M4A uploads still play.
- First Safari click on old webm/ogg: short preparation phase, then playback.
- Second Safari click on same story: immediate playback (already migrated URL).

## 6) Full rollout (if desired)

- Migrate in batches (`limit` 25-50), repeat until candidates are exhausted.
- Re-check `formatSummary` after each batch.

## Vercel / ffmpeg

- Transcoding nutzt `ffmpeg-static` (Binary wird mit dem Build mitgeliefert).
- Kein manuelles `apt install ffmpeg` auf Vercel nötig.
- Migrate-Routen: 120s Timeout, 1024 MB RAM (`vercel.json`).

## 7) Monitoring

- Watch server logs:
  - `[audio/migrate-on-demand] migrated story for safari`
  - `[audio/migrate-on-demand] reused existing migrated file`
  - `[audio/migrate-on-demand] waited for concurrent migration`
  - `[audio/migrate-on-demand] failed`
  - `[DashboardAudioPlayer] Safari format guard triggered`
  - `[DashboardAudioPlayer] Using Safari fallback URL`
  - `[API/admin/audio/migrate-formats]` results and error reasons

## 8) Rollback strategy

- Migration is file-additive and idempotent:
  - Original source file remains in storage.
  - DB only switches `audio_url`.
- To rollback a story, reset `saved_stories.audio_url` to previous URL (from migration response logs).
