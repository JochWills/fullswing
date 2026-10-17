export type Settings = {
  id: number;
  business_name: string;
  venue_name: string;
  venue_address: string;
  contact_email: string | null;
  contact_phone: string | null;
  timezone: string;
  cancellation_hours: number;
  min_notice_hours: number;
  booking_horizon_days: number;
  slot_interval_minutes: number;
  buffer_minutes: number;
  google_calendar_id: string;
  google_connected_email: string | null;
};

export type LessonType = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  active: boolean;
  sort_order: number;
};

export type AvailabilityRule = {
  id: string;
  weekday: number;
  start_time: string; // "HH:MM:SS"
  end_time: string;
};

export type BlockedPeriod = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export type GroupSession = {
  id: string;
  title: string;
  description: string | null;
  level: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  price_cents: number;
  status: "scheduled" | "cancelled";
  google_event_id: string | null;
};

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "expired";

export type Booking = {
  id: string;
  kind: "private" | "group";
  lesson_type_id: string | null;
  group_session_id: string | null;
  starts_at: string;
  ends_at: string;
  spots: number;
  title: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  player_name: string | null;
  notes: string | null;
  user_id: string | null;
  status: BookingStatus;
  amount_cents: number;
  paystack_reference: string | null;
  paid_at: string | null;
  refund_status: "none" | "pending" | "processed" | "failed" | "manual";
  refund_note: string | null;
  cancelled_at: string | null;
  cancelled_by: "client" | "admin" | "system" | null;
  google_event_id: string | null;
  reminder_sent_at: string | null;
  manage_token: string;
  created_at: string;
};
