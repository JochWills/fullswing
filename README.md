# Full-Swing Tennis Academy – Bookings

Calendly-style booking site for private tennis lessons and group sessions at St Francis Bay Tennis Court.

**Stack:** Next.js 15 (App Router) · Supabase (Postgres + magic-link auth) · Paystack · Google Calendar · Gmail SMTP or Resend email · Render hosting

---

## What it does

**Clients**
- Book a private lesson: pick a lesson type → pick a day on the calendar → pick an open time → enter details → pay with Paystack
- Book spots in one-off group sessions (shows spots left, can't be oversold)
- Guest checkout with name + email – no account needed
- Optional account (email magic link). Every booking made with that email is linked automatically once the email is verified – including bookings made before the account existed
- Manage link in every email: view booking, add to Google Calendar, cancel
- Cancel online up to 24h before (configurable) → automatic full Paystack refund

**Admin (`/admin`)**
- Overview: this week's schedule and monthly takings
- Weekly availability hours, plus time off / blocked dates
- Lesson types and prices
- Group sessions: create (optionally repeat weekly), see attendees, edit, cancel with refunds
- Bookings: search, cancel with or without refund
- Settings: venue, cancellation window, minimum notice, how far ahead clients can book, start-time interval, break between lessons, Google Calendar connection

**Automatic**
- Confirmation email to client + new-booking email to you
- Reminder email ~24h before each lesson
- Google Calendar: bookings and group sessions are added to your calendar; anything busy in your calendar is hidden from clients
- Unpaid bookings hold the slot for 20 minutes, then release it
- Double-booking is blocked at database level, even if two people pay at once

---

## Setup (about 30 minutes)

### 1. Supabase
1. Create a project at supabase.com (region: closest to SA, e.g. Frankfurt or Cape Town if offered).
2. **SQL Editor → New query** → paste all of `supabase/migrations/0001_init.sql` → **Run**.
3. **Authentication → URL Configuration**
   - Site URL: your live URL (e.g. `https://full-swing-tennis.onrender.com`)
   - Redirect URLs: add `https://YOUR-DOMAIN/auth/callback` and `http://localhost:3000/auth/callback`
4. **Authentication → Emails → SMTP Settings**: turn on custom SMTP so sign-in links reach everyone.
   No domain? Use a Gmail account with an app password: host `smtp.gmail.com`, port `465`,
   username = the Gmail address, password = the app password, sender email = the same Gmail address.
   (With a domain you can use Resend instead: host `smtp.resend.com`, port `465`, user `resend`, password = API key.)
   ⚠️ Supabase's built-in email only sends to your own team's addresses, so client sign-in links won't arrive without this.
5. **Project Settings → API**: copy the Project URL, the anon/publishable key and the service_role key.

### 2. Emails (confirmations, reminders, cancellations)
**No domain – Gmail (free, ~500 emails/day):**
1. Use a dedicated Gmail for the academy. Google Account → **Security** → turn on **2-Step Verification**.
2. Search "App passwords" in your Google Account → create one (name it "Full-Swing site") → copy the 16 characters.
3. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=<the Gmail>`, `SMTP_PASS=<app password>`,
   `EMAIL_FROM="Full-Swing Tennis Academy <the Gmail>"`.

**With a domain – Resend:** sign up at resend.com, verify your domain, create an API key → `RESEND_API_KEY`,
set `EMAIL_FROM`, e.g. `Full-Swing Tennis Academy <bookings@fullswingtennis.co.za>`, and leave the `SMTP_*` vars empty.

### 3. Google Calendar (optional but recommended)
1. console.cloud.google.com → new project → **APIs & Services → Library** → enable **Google Calendar API**.
2. **OAuth consent screen** → External → add your Gmail as a test user (or publish the app).
3. **Credentials → Create OAuth client ID** → Web application.
   Authorised redirect URI: `https://YOUR-DOMAIN/api/google/callback`
4. Copy client ID/secret into env vars.
5. After deploying: **Admin → Settings → Connect Google Calendar**.

### 4. Paystack
Until your account is approved, set `PAYMENTS_TEST_MODE=true` – bookings confirm without payment so you can test everything.

Once approved:
1. **Settings → API Keys & Webhooks** → copy the secret key (`sk_test_…` first, then `sk_live_…`) → `PAYSTACK_SECRET_KEY`.
2. Webhook URL: `https://YOUR-DOMAIN/api/paystack/webhook`
3. Set `PAYMENTS_TEST_MODE=false`.

Test card for Paystack test keys: `4084 0840 8408 4081`, any future expiry, CVV `408`.

### 5. Render
1. Push this folder to a GitHub repo.
2. Render → **New → Blueprint** → select the repo. It reads `render.yaml` and creates the web service
   (free plan, Frankfurt).
3. Fill in the environment variables (see `.env.example`). `CRON_SECRET` is generated for you.
   Set `NEXT_PUBLIC_SITE_URL` to the Render URL (e.g. `https://full-swing-tennis.onrender.com`) – it's
   baked in at build time, so redeploy if you change it.
4. In Supabase → **Authentication → URL Configuration**, set the Site URL to the live URL and add
   `https://YOUR-DOMAIN/auth/callback` to the redirect URLs.

**Keeping a free instance awake:** free Render services sleep after ~15 minutes without traffic (the next
visit then takes ~30–60s). Add an UptimeRobot HTTP(s) monitor for `https://YOUR-DOMAIN/api/health`
every 5 minutes. Switching the plan to `starter` in `render.yaml` gives an always-on instance instead.

**Reminders:** Render cron jobs aren't on the free plan, so trigger reminders externally. On
[cron-job.org](https://cron-job.org) (free) create a job every 30 minutes:
`POST https://YOUR-DOMAIN/api/cron/reminders` with header `Authorization: Bearer YOUR_CRON_SECRET`
(copy the value from the service's Environment tab in Render). It sends 24-hour reminders and clears
unpaid holds.

### 6. Become admin
1. Make sure your email is in `ADMIN_EMAILS`.
2. Go to `/login`, enter that email, click the link.
3. Open the profile menu (top right) → **Admin dashboard**. Starter lesson types and weekday hours are already loaded – change them to suit.

---

## Run locally

```bash
cp .env.example .env.local   # fill in Supabase keys
npm install
npm run dev                  # http://localhost:3000
npm test                     # slot-calculation tests
```

## Project layout

```
supabase/migrations/0001_init.sql   database schema, RLS, functions, starter data
src/lib/slots.ts                    pure availability/slot maths (unit tested)
src/lib/data.ts                     busy times (bookings, sessions, blocked, Google) + slot queries
src/lib/bookings.ts                 create / confirm / cancel / refund logic
src/lib/paystack.ts                 Paystack API + webhook signature
src/lib/google.ts                   Google OAuth, free/busy, events
src/lib/email.ts                    email templates (Gmail SMTP or Resend)
src/app/book                        private lesson booking flow
src/app/groups                      group sessions
src/app/booking/[token]             manage / cancel a booking (link in emails)
src/app/account                     client's bookings
src/app/admin                       admin dashboard + server actions
src/app/api                         availability, bookings, webhook, Google, cron
```
