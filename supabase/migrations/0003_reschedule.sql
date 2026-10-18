-- Admin rescheduling: remember when a booking was moved and where it was originally.
-- A client whose booking was moved by the coach may cancel for a full refund any time before it starts.
alter table public.bookings add column if not exists rescheduled_at   timestamptz;
alter table public.bookings add column if not exists rescheduled_from timestamptz;
