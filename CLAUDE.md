# CLAUDE.md – Full-Swing Tennis Academy bookings

Booking platform for a single tennis coach (owner: Josh). Read README.md for features and setup.

## Commands
- `npm run dev` – local dev on :3000 (needs `.env.local`, see `.env.example`)
- `npm run build` – production build (must pass before deploying to Render)
- `npm run typecheck` – TypeScript check
- `npm test` – unit tests for slot generation (`tests/*.test.ts`, Node test runner)

## Architecture
- Next.js 15 App Router, React 19, Tailwind 3, TypeScript strict. Path alias `@/` → `src/`.
- Supabase: Postgres + magic-link auth. Schema lives in `supabase/migrations/` – add new numbered files, never edit an applied migration.
- **All database writes happen server-side with the service-role client (`db()` in `src/lib/supabase/admin.ts`).** RLS is on for every table; public roles can only read active lesson types, scheduled group sessions and their own bookings. Never import `db()` into a client component.
- Admin access = signed-in user whose email is in `ADMIN_EMAILS`. Every admin server action calls `requireAdmin()` first.
- Timezone is fixed to Africa/Johannesburg (`TZ` in `src/lib/env.ts`). Availability rules are stored as local times; timestamps are timestamptz. Convert with `date-fns-tz` (`fromZonedTime` / `formatInTimeZone`).
- Money is integer cents (ZAR). Paystack amounts are also cents.

## Booking lifecycle
1. `POST /api/bookings` → re-checks the slot (`isSlotAvailable`) → inserts `pending` booking with a Paystack reference → returns Paystack checkout URL (or confirms straight away when `PAYMENTS_TEST_MODE=true` or price is 0).
2. Pending bookings hold the slot for 20 minutes (`expire_stale_pending()` flips them to `expired`).
3. Paystack redirect (`/booking/callback`) and webhook (`/api/paystack/webhook`) both call `confirmByReference()`; it's idempotent – only the call that flips status to `confirmed` sends emails and creates the Google event.
4. Overlapping private bookings are prevented by the `bookings_no_private_overlap` exclusion constraint (error 23P01). Group capacity is enforced inside the `book_group_session()` SQL function with a row lock.
5. If payment lands after the hold expired and the slot is gone, the client is auto-refunded.
6. Cancellation: clients via `/api/bookings/[token]/cancel` (only ≥ `cancellation_hours` before start, auto refund); admin from dashboard (refund optional). See `cancelBooking()`.
7. Account linking: DB trigger on `auth.users` links bookings by email once the email is confirmed.

## Things that are not built yet (ideas)
- Lesson packages / credits
- Rescheduling (currently cancel + rebook)
- Waitlist for full group sessions
- SMS/WhatsApp reminders
