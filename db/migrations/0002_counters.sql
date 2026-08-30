-- Human-readable order numbers.
--
-- `HF-1042` is what the owner and the customer quote to each other on WhatsApp,
-- so it has to be short, sequential, and never reused. A UUID would be correct
-- and unusable over the phone.
--
-- Allocated with a single atomic statement:
--
--   UPDATE counters SET value = value + 1 WHERE name = 'order_number'
--   RETURNING value;
--
-- D1 has no interactive transactions, so this one-statement read-modify-write is
-- what keeps concurrent orders from colliding.

CREATE TABLE IF NOT EXISTS counters (
  name  TEXT    PRIMARY KEY,
  value INTEGER NOT NULL
);

-- Starts at 1000 so the first order is HF-1001 — a shop that looks open.
INSERT INTO counters (name, value) VALUES ('order_number', 1000)
ON CONFLICT (name) DO NOTHING;
