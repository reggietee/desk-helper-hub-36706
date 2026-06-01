## Goal

Create a one-off `export-all` edge function in this HomeBase project that dumps all member data + auth users as JSON, gated by a shared secret. Use it once to migrate to Haven Virtual, then delete.

## Steps

1. **Add secret** — Use the secrets tool to add `EXPORT_SECRET` (random value chosen by you).

2. **Create edge function** at `supabase/functions/export-all/index.ts`:
   - `verify_jwt = false` (added to `supabase/config.toml`)
   - Requires header `x-export-secret` matching `EXPORT_SECRET` → 401 otherwise
   - Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
   - CORS headers on all responses
   - Iterates these tables and returns `{ tables: { <name>: [...rows] }, auth_users: [...] }`:
     - profiles, haven_credits, haven_credits_ledger, meeting_room_bookings, call_room_bookings, private_office_bookings, issues, guest_day_pass_requests, product_signouts, weekly_schedules, member_visits, onboarding_progress, calendar_events, calendar_invite_logs, daily_calls, livestreams, coworking_sprints, coworking_sprint_participants, coworking_sprint_emails, feed_items, haven_settings, haven_updates, daily_credits_report_logs, user_roles
   - For each table: paginate in batches of 1000 (Supabase default cap) until exhausted, so large tables export fully
   - `auth_users`: `supabase.auth.admin.listUsers()` paginated; project `{ id, email, created_at, raw_user_meta_data }`
   - Returns JSON with `Content-Type: application/json`

3. **Surface the URL** — After deploy, the function URL will be:
   `https://qzqucuiwgdilgramnizm.supabase.co/functions/v1/export-all`
   Call with:
   ```
   curl -H "x-export-secret: <your-secret>" \
        -H "Authorization: Bearer <anon-key>" \
        https://qzqucuiwgdilgramnizm.supabase.co/functions/v1/export-all \
        -o homebase-export.json
   ```

4. **After migration** — Tell me when done and I'll delete the function + secret.

## Notes

- Storage files (`avatars`, `haven-updates` buckets) are NOT included — they need a separate file-copy step if needed.
- No schema changes, no data changes — read-only export.
