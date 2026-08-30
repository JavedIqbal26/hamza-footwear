-- Delivery destinations and fees.
--
-- This file is the source of truth for the city list. The fees below are
-- PLACEHOLDERS pending the owner's actual courier rate card — change them here
-- and re-run the seed; nothing else in the codebase hard-codes a fee.
--
-- Idempotent: re-running updates fees in place rather than failing.

INSERT INTO cities (name, delivery_fee_pkr, tier) VALUES
  -- Tier: major (cheapest courier rates)
  ('Karachi',          200, 'major'),
  ('Lahore',           200, 'major'),
  ('Islamabad',        200, 'major'),
  ('Rawalpindi',       200, 'major'),
  ('Faisalabad',       200, 'major'),

  -- Tier: other
  ('Abbottabad',       300, 'other'),
  ('Bahawalpur',       300, 'other'),
  ('Chiniot',          300, 'other'),
  ('Dera Ghazi Khan',  300, 'other'),
  ('Gujranwala',       300, 'other'),
  ('Gujrat',           300, 'other'),
  ('Hyderabad',        300, 'other'),
  ('Jhang',            300, 'other'),
  ('Jhelum',           300, 'other'),
  ('Kasur',            300, 'other'),
  ('Kohat',            300, 'other'),
  ('Larkana',          300, 'other'),
  ('Mardan',           300, 'other'),
  ('Mirpur Khas',      300, 'other'),
  ('Multan',           300, 'other'),
  ('Nawabshah',        300, 'other'),
  ('Okara',            300, 'other'),
  ('Peshawar',         300, 'other'),
  ('Quetta',           300, 'other'),
  ('Rahim Yar Khan',   300, 'other'),
  ('Sahiwal',          300, 'other'),
  ('Sargodha',         300, 'other'),
  ('Sheikhupura',      300, 'other'),
  ('Sialkot',          300, 'other'),
  ('Sukkur',           300, 'other'),
  ('Swat (Mingora)',   300, 'other'),
  ('Wah Cantt',        300, 'other')
ON CONFLICT (name) DO UPDATE SET
  delivery_fee_pkr = excluded.delivery_fee_pkr,
  tier             = excluded.tier;
