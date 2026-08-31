-- Customer accounts, passwordless sign-in, and product reviews.
--
-- Sign-in is phone + one-time code, with no password and no email anywhere:
-- COD shoppers abandon forms, and the phone number is already the only field
-- the shop genuinely needs. Guest checkout stays fully supported — an account
-- is an optional convenience, never a gate.

CREATE TABLE IF NOT EXISTS customers (
  id           TEXT PRIMARY KEY,
  -- Normalised on the way in: 11 digits beginning 03. One account per number.
  phone        TEXT NOT NULL UNIQUE
                 CHECK (length(phone) = 11 AND phone LIKE '03%'),
  name         TEXT NOT NULL DEFAULT '',
  -- The size the customer buys most. Prefills the size picker; purely a convenience.
  saved_size   TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id           TEXT    PRIMARY KEY,
  customer_id  TEXT    NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  label        TEXT    NOT NULL DEFAULT 'Home',
  city         TEXT    NOT NULL,
  area         TEXT    NOT NULL,
  address_line TEXT    NOT NULL,
  is_default   INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_addresses_customer
  ON customer_addresses (customer_id, is_default DESC);

-- One-time sign-in codes.
--
-- The code is stored as a SHA-256 hash, never in plain text: a leaked database
-- row must not be a working credential. Rows are short-lived and swept on use.
CREATE TABLE IF NOT EXISTS otp_codes (
  id          TEXT    PRIMARY KEY,
  phone       TEXT    NOT NULL,
  code_hash   TEXT    NOT NULL,
  expires_at  TEXT    NOT NULL,
  -- Guessing budget. Exhausting it burns the code, not just the attempt.
  attempts    INTEGER NOT NULL DEFAULT 0,
  consumed_at TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Both the verify lookup and the per-phone send-rate check ride this index.
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes (phone, created_at DESC);

-- Sessions.
--
-- `id` is the SHA-256 of the token held in the customer's cookie, so the
-- database never stores anything that could be replayed as a session.
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_customer ON sessions (customer_id);

-- Product reviews.
--
-- Only written against a delivered order, so a rating always comes from someone
-- who actually received the shoes. `is_published` lets the owner hide abuse
-- without deleting the row.
CREATE TABLE IF NOT EXISTS reviews (
  id           TEXT    PRIMARY KEY,
  product_id   TEXT    NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  customer_id  TEXT    REFERENCES customers (id) ON DELETE SET NULL,
  order_id     TEXT    REFERENCES orders (id) ON DELETE SET NULL,
  author_name  TEXT    NOT NULL DEFAULT '',
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body         TEXT    NOT NULL DEFAULT '',
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- The product page's rating aggregate reads straight off this index.
CREATE INDEX IF NOT EXISTS idx_reviews_product
  ON reviews (product_id, is_published, created_at DESC);

-- One review per customer per product, so a rating cannot be stacked.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_author
  ON reviews (product_id, customer_id) WHERE customer_id IS NOT NULL;

-- Attach past orders to an account, so "Track order #4192" and saved addresses
-- work. Nullable: guest orders remain first-class and are never orphaned.
ALTER TABLE orders ADD COLUMN customer_id TEXT REFERENCES customers (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id, created_at DESC);
