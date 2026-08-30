-- Hamza Footwear — initial schema
--
-- Money is stored as INTEGER PKR throughout. No REAL columns for money, ever.
-- JSON-shaped columns (sizes_available, images, items) are TEXT holding a JSON
-- array; repositories parse them so nothing above that layer sees a string.

CREATE TABLE IF NOT EXISTS cities (
  name              TEXT    PRIMARY KEY,
  delivery_fee_pkr  INTEGER NOT NULL CHECK (delivery_fee_pkr >= 0),
  tier              TEXT    NOT NULL CHECK (tier IN ('major', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_cities_tier ON cities (tier);

CREATE TABLE IF NOT EXISTS products (
  id               TEXT    PRIMARY KEY,
  slug             TEXT    NOT NULL UNIQUE,
  name             TEXT    NOT NULL,
  description      TEXT    NOT NULL DEFAULT '',
  price_pkr        INTEGER NOT NULL CHECK (price_pkr >= 0),
  sale_price_pkr   INTEGER          CHECK (sale_price_pkr IS NULL OR sale_price_pkr >= 0),
  category         TEXT    NOT NULL CHECK (category IN ('men', 'women', 'kids')),
  sizes_available  TEXT    NOT NULL DEFAULT '[]',
  images           TEXT    NOT NULL DEFAULT '[]',
  is_active        INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  stock_status     TEXT    NOT NULL DEFAULT 'in_stock'
                             CHECK (stock_status IN ('in_stock', 'low', 'out')),
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

  -- A sale price that is not actually a discount is a data bug, not a display bug.
  CHECK (sale_price_pkr IS NULL OR sale_price_pkr < price_pkr)
);

-- The storefront's hot path: active products in one category, newest first.
CREATE INDEX IF NOT EXISTS idx_products_active_category
  ON products (is_active, category, created_at DESC);

CREATE TABLE IF NOT EXISTS orders (
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
  delivery_fee_pkr  INTEGER NOT NULL CHECK (delivery_fee_pkr >= 0),
  total_pkr         INTEGER NOT NULL CHECK (total_pkr >= 0),
  payment_method    TEXT    NOT NULL
                              CHECK (payment_method IN ('cod', 'jazzcash', 'easypaisa')),
  payment_proof_key TEXT,
  payment_status    TEXT    NOT NULL DEFAULT 'pending'
                              CHECK (payment_status IN ('pending', 'verified', 'failed')),
  order_status      TEXT    NOT NULL DEFAULT 'new'
                              CHECK (order_status IN ('new', 'confirmed', 'dispatched',
                                                      'delivered', 'cancelled', 'returned')),
  tiktok_video_ref  TEXT,
  notes             TEXT    NOT NULL DEFAULT '',
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

  -- The one arithmetic invariant worth enforcing in the database.
  CHECK (total_pkr = subtotal_pkr + delivery_fee_pkr)
);

-- Admin's default view: newest orders first, and the "what needs action" filter.
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (order_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders (phone);

-- Which TikTok videos actually sell.
CREATE INDEX IF NOT EXISTS idx_orders_video_ref ON orders (tiktok_video_ref);
