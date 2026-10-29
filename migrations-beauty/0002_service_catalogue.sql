-- Preserve the applied initial schema and any historical requests.
-- service retains the original manicure/pedicure grouping; service_key identifies the treatment.
ALTER TABLE bookings ADD COLUMN service_key TEXT NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN design INTEGER NOT NULL DEFAULT 0 CHECK(design IN (0,1));
ALTER TABLE bookings ADD COLUMN price_cents INTEGER;
UPDATE settings SET value=json_set(value,'$.durations.manicura',70,'$.durations.pedicura',70) WHERE key='schedule';
