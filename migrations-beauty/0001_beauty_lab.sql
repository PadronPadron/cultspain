-- Beauty LAB only. Apply to BEAUTY_DB, never to the CULT database.
CREATE TABLE clients (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', archived INTEGER NOT NULL DEFAULT 0, revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE bookings (id TEXT PRIMARY KEY, request_key TEXT UNIQUE, client_id TEXT NOT NULL REFERENCES clients(id), date TEXT NOT NULL, time TEXT NOT NULL, service TEXT NOT NULL CHECK(service IN ('manicura','pedicura')), duration INTEGER NOT NULL CHECK(duration BETWEEN 15 AND 480), status TEXT NOT NULL CHECK(status IN ('pending','confirmed','completed','cancelled')), notes TEXT NOT NULL DEFAULT '', revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE INDEX bookings_date ON bookings(date);
CREATE TABLE booking_minutes (key TEXT PRIMARY KEY, booking_id TEXT NOT NULL REFERENCES bookings(id));
CREATE TABLE entries (id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('income','expense')), date TEXT NOT NULL, description TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK(amount_cents>0), method TEXT NOT NULL CHECK(method IN ('cash','card','transfer','other')), client_id TEXT REFERENCES clients(id), booking_id TEXT UNIQUE REFERENCES bookings(id), notes TEXT NOT NULL DEFAULT '', archived INTEGER NOT NULL DEFAULT 0, revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX entries_date ON entries(date);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE audit_log (id TEXT PRIMARY KEY, at TEXT NOT NULL, actor TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL, before_json TEXT, after_json TEXT);
CREATE TABLE guards (id TEXT PRIMARY KEY, valid INTEGER NOT NULL CONSTRAINT beauty_guard CHECK(valid=1));
CREATE TABLE request_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
