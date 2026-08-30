-- Sample catalogue for development and for the first deploy.
--
-- Image arrays are intentionally empty: the real photos come off the owner's
-- phone through admin in Phase 2, and the storefront renders a neutral inline
-- placeholder until then (no broken images, no extra request).
--
-- Idempotent: re-running refreshes these rows rather than failing on the slug.

INSERT INTO products (
  id, slug, name, description, price_pkr, sale_price_pkr,
  category, sizes_available, images, is_active, stock_status
) VALUES
  ('p_men_derby_black', 'classic-derby-black',
   'Classic Derby — Black',
   'Full-grain leather derby with a cushioned insole. Smart enough for a wedding, comfortable enough for a full day.',
   6500, 5200, 'men', '["6","7","7.5","8","8.5","9","10","11"]', '[]', 1, 'in_stock'),

  ('p_men_loafer_brown', 'suede-loafer-brown',
   'Suede Loafer — Brown',
   'Slip-on suede loafer with a flexible sole. Pairs with both shalwar kameez and jeans.',
   4800, NULL, 'men', '["7","8","9","10","11"]', '[]', 1, 'in_stock'),

  ('p_men_sneaker_white', 'everyday-sneaker-white',
   'Everyday Sneaker — White',
   'Lightweight lace-up sneaker with a padded collar. Wipes clean in seconds.',
   3900, NULL, 'men', '["6","7","8","9","10","11","12"]', '[]', 1, 'low'),

  ('p_men_sandal_tan', 'leather-sandal-tan',
   'Leather Sandal — Tan',
   'Two-strap leather sandal with a stitched footbed. Built for Karachi summers.',
   2900, 2400, 'men', '["7","8","9","10"]', '[]', 1, 'in_stock'),

  ('p_women_khussa_gold', 'embroidered-khussa-gold',
   'Embroidered Khussa — Gold',
   'Hand-embroidered khussa with a soft leather lining. A shaadi-season staple.',
   3500, NULL, 'women', '["3","4","5","6","7","8"]', '[]', 1, 'in_stock'),

  ('p_women_flat_black', 'ballet-flat-black',
   'Ballet Flat — Black',
   'Everyday ballet flat with a padded insole and a non-slip sole.',
   2800, 2200, 'women', '["3","4","5","6","7"]', '[]', 1, 'in_stock'),

  ('p_women_heel_nude', 'block-heel-nude',
   'Block Heel — Nude',
   'Two-inch block heel with an ankle strap. Stable enough to stand in all evening.',
   4200, NULL, 'women', '["4","5","6","7","8"]', '[]', 1, 'low'),

  ('p_women_slipper_grey', 'house-slipper-grey',
   'House Slipper — Grey',
   'Fleece-lined slipper with a soft rubber sole for indoor and courtyard wear.',
   1800, NULL, 'women', '["4","5","6","7","8"]', '[]', 1, 'out'),

  ('p_kids_sneaker_blue', 'school-sneaker-blue',
   'School Sneaker — Blue',
   'Velcro-strap sneaker with a scuff-resistant toe. Built for the school run.',
   2400, NULL, 'kids', '["3","3.5","4","4.5","5","5.5","6"]', '[]', 1, 'in_stock'),

  ('p_kids_sandal_pink', 'summer-sandal-pink',
   'Summer Sandal — Pink',
   'Lightweight sandal with an adjustable strap that grows with fast-growing feet.',
   1900, 1500, 'kids', '["3","4","5","6"]', '[]', 1, 'in_stock')

ON CONFLICT (slug) DO UPDATE SET
  name            = excluded.name,
  description     = excluded.description,
  price_pkr       = excluded.price_pkr,
  sale_price_pkr  = excluded.sale_price_pkr,
  category        = excluded.category,
  sizes_available = excluded.sizes_available,
  is_active       = excluded.is_active,
  stock_status    = excluded.stock_status,
  updated_at      = strftime('%Y-%m-%dT%H:%M:%SZ', 'now');
