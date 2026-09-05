-- The delivery charge becomes something the shop quotes, not something the site
-- computes.
--
-- The original schema priced delivery from the `cities` table and stored a
-- finished total on every order. That was wrong about the business: the owner
-- quotes the charge himself once he knows where the parcel is going, and the
-- courier is prepaid by wallet before anything ships. A total the site invented
-- is the number a customer would pay against, so it cannot be invented.
--
-- `delivery_fee_pkr` therefore becomes NULLABLE, and NULL means "not yet
-- quoted". Zero would have been indistinguishable from free delivery.
--
-- `total_pkr` stays NOT NULL and holds the subtotal until the quote lands, so
-- every reader still gets a number and only the code that cares about the quote
-- has to check for NULL. The arithmetic invariant is rewritten to allow that
-- interim state explicitly rather than leaning on SQLite treating a NULL CHECK
-- as a pass — the intent should be readable in the schema.
--
-- SQLite cannot drop NOT NULL in place, so this is the standard table rebuild.

PRAGMA foreign_keys = OFF;

CREATE TABLE orders_new (
  id                TEXT    PRIMARY KEY,
  order_number      TEXT    NOT NULL UNIQUE,
  customer_name     TEXT    NOT NULL,
  -- Normalised on the way in: 11 digits beginning 03.
  phone             TEXT    NOT NULL CHECK (length(phone) = 11 AND phone LIKE '03%'),
  city              TEXT    NOT NULL,
  area              TEXT    NOT NULL,
  address_line      TEXT    NOT NULL,
  items             TEXT    NOT NULL,
  subtotal_pkr      INTEGER NOT NULL CHECK (subtotal_pkr >= 0),
  -- NULL until the shop quotes it.
  delivery_fee_pkr  INTEGER CHECK (delivery_fee_pkr IS NULL OR delivery_fee_pkr >= 0),
  total_pkr         INTEGER NOT NULL CHECK (total_pkr >= 0),
  payment_method    TEXT    NOT NULL
                              CHECK (payment_method IN ('cod', 'jazzcash', 'easypaisa')),
  payment_proof_key TEXT,
  -- The wallet transaction id for the advance. It used to be folded into notes
  -- at creation; it now arrives afterwards, once the customer has been quoted
  -- and paid, so it needs somewhere of its own to land.
  payment_reference TEXT,
  -- Tracks THE ADVANCE: the delivery charge on a COD order, the whole amount on
  -- a prepaid one. Cash handed over at the door is carried by order_status.
  payment_status    TEXT    NOT NULL DEFAULT 'pending'
                              CHECK (payment_status IN ('pending', 'verified', 'failed')),
  order_status      TEXT    NOT NULL DEFAULT 'new'
                              CHECK (order_status IN ('new', 'confirmed', 'dispatched',
                                                      'delivered', 'cancelled', 'returned')),
  tiktok_video_ref  TEXT,
  notes             TEXT    NOT NULL DEFAULT '',
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  customer_id       TEXT REFERENCES customers (id) ON DELETE SET NULL,

  -- Before the quote the total is the subtotal; after it, the sum.
  CHECK (
    CASE WHEN delivery_fee_pkr IS NULL
         THEN total_pkr = subtotal_pkr
         ELSE total_pkr = subtotal_pkr + delivery_fee_pkr
    END
  )
);

INSERT INTO orders_new
  SELECT id, order_number, customer_name, phone, city, area, address_line, items,
         subtotal_pkr, delivery_fee_pkr, total_pkr, payment_method, payment_proof_key,
         NULL, payment_status, order_status, tiktok_video_ref, notes, created_at, customer_id
  FROM orders;

DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;

-- Dropping the table dropped its indexes with it. All four are recreated here,
-- including the two added after 0001 — miss one and the loss is silent, showing
-- up later only as a slow page.

-- Admin's default view: newest orders first, and the "what needs action" filter.
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (order_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders (phone);

-- Which TikTok videos actually sell.
CREATE INDEX IF NOT EXISTS idx_orders_video_ref ON orders (tiktok_video_ref);

-- A returning customer's own order history, and the guest-order adoption that
-- runs on first sign-in.
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id, created_at DESC);

PRAGMA foreign_keys = ON;
