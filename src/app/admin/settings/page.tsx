import { getSettings } from "@/lib/data";
import { googleConfigured, paymentsTestMode, siteUrl } from "@/lib/env";
import Flash from "@/components/admin/Flash";
import SubmitButton from "@/components/admin/SubmitButton";
import Select from "@/components/ui/Select";
import NumberField from "@/components/ui/NumberField";
import { saveSettings } from "../actions";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; google?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const googleMsg: Record<string, string> = {
    connected: "Google Calendar connected.",
    disconnected: "Google Calendar disconnected.",
  };
  const googleErr: Record<string, string> = {
    error: "Google connection failed. Try again.",
    "not-configured": "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment first.",
  };

  return (
    <div className="grid max-w-5xl gap-8 lg:grid-cols-[1fr_360px]">
      <div className="lg:col-span-2">
        <Flash error={sp.error || (sp.google ? googleErr[sp.google] : undefined)} success={(sp.saved && "Settings saved.") || (sp.google ? googleMsg[sp.google] : undefined)} />
      </div>

      <form action={saveSettings} className="card space-y-6 p-6">
        <fieldset className="space-y-3">
          <legend className="h-display mb-2 text-2xl">Venue & contact</legend>
          <div><label className="label">Venue name</label><input name="venue_name" className="input" defaultValue={s.venue_name} required /></div>
          <div><label className="label">Venue address</label><input name="venue_address" className="input" defaultValue={s.venue_address} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Contact email (shown to clients)</label><input type="email" name="contact_email" className="input" defaultValue={s.contact_email ?? ""} /></div>
            <div><label className="label">Contact phone</label><input name="contact_phone" className="input" defaultValue={s.contact_phone ?? ""} /></div>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="h-display mb-2 text-2xl">Booking rules</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Num name="cancellation_hours" label="Free cancellation up to (hours before)" v={s.cancellation_hours} min={0} max={168} />
            <Num name="min_notice_hours" label="Minimum notice to book (hours)" v={s.min_notice_hours} min={0} max={168} />
            <Num name="booking_horizon_days" label="How far ahead clients can book (days)" v={s.booking_horizon_days} min={1} max={365} />
            <Num name="buffer_minutes" label="Break between lessons (minutes)" v={s.buffer_minutes} min={0} max={120} />
            <div>
              <label className="label">Start times every</label>
              <Select
                name="slot_interval_minutes"
                defaultValue={String(s.slot_interval_minutes)}
                options={[15, 30, 60].map((n) => ({ value: String(n), label: `${n} minutes` }))}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="h-display mb-2 text-2xl">Google Calendar</legend>
          <div><label className="label">Calendar ID</label><input name="google_calendar_id" className="input" defaultValue={s.google_calendar_id} /></div>
          <p className="text-xs text-slate-500">Use &quot;primary&quot; for your main calendar, or a specific calendar&apos;s ID from Google Calendar settings.</p>
        </fieldset>

        <SubmitButton>Save settings</SubmitButton>
      </form>

      <aside className="space-y-4">
        <div className="card p-5">
          <p className="h-display text-2xl">Google Calendar sync</p>
          {s.google_connected_email ? (
            <>
              <p className="mt-2 text-sm"><span className="badge bg-ball text-ink">Connected</span> {s.google_connected_email}</p>
              <p className="mt-2 text-sm text-slate-600">New bookings and group sessions are added to your calendar, and anything busy in your calendar is hidden from clients.</p>
              <form action="/api/google/disconnect" method="post" className="mt-3"><button className="btn-ghost btn-sm">Disconnect</button></form>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-600">Connect to block out your personal events and get bookings in your calendar automatically.</p>
              {googleConfigured() ? (
                <a href="/api/google/connect" className="btn-primary btn-sm mt-3">Connect Google Calendar</a>
              ) : (
                <p className="mt-3 rounded-lg bg-slate-100 p-3 text-xs text-slate-600">Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first. Redirect URI: <code className="break-all">{siteUrl()}/api/google/callback</code></p>
              )}
            </>
          )}
        </div>
        <div className="card p-5">
          <p className="h-display text-2xl">Paystack</p>
          <p className="mt-2 text-sm">{paymentsTestMode() ? <span className="badge bg-amber-200 text-amber-900">Test mode – no payments</span> : process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_live") ? <span className="badge bg-ball text-ink">Live</span> : <span className="badge bg-brand-50 text-brand-700">Paystack test keys</span>}</p>
          <p className="mt-2 text-xs text-slate-600">Webhook URL for Paystack: <code className="break-all">{siteUrl()}/api/paystack/webhook</code></p>
        </div>
      </aside>
    </div>
  );
}

function Num({ name, label, v, min, max }: { name: string; label: string; v: number; min: number; max: number }) {
  return (
    <div>
      <label className="label">{label}</label>
      <NumberField name={name} defaultValue={v} min={min} max={max} required />
    </div>
  );
}
