-- Sample reviews, for development only.
--
-- NOT part of the production seed: real ratings must come from real delivered
-- orders, which is what `findReviewableOrder` enforces at write time. Loading
-- these on the live shop would put invented social proof on a real storefront.
--
-- `customer_id` and `order_id` are deliberately NULL here — these rows exist to
-- exercise the aggregate and the review list, not to impersonate customers.

INSERT INTO reviews (id, product_id, customer_id, order_id, author_name, rating, body) VALUES
  ('rv_derby_1', 'p_men_derby_black', NULL, NULL, 'Bilal', 5,
   'Leather asli hai aur stitching bohot saaf. Shaadi ke liye liya tha, bilkul theek.'),
  ('rv_derby_2', 'p_men_derby_black', NULL, NULL, 'Hamza', 4,
   'Comfortable hain lekin thora tight aaye. Ek size upar lein.'),
  ('rv_derby_3', 'p_men_derby_black', NULL, NULL, 'Usman', 5,
   'Delivery do din mein Lahore. COD tha, koi masla nahi hua.'),

  ('rv_khussa_1', 'p_women_khussa_gold', NULL, NULL, 'Ayesha', 5,
   'Embroidery bohot khoobsurat hai. Eid par pehna, sab ne poocha kahan se liya.'),
  ('rv_khussa_2', 'p_women_khussa_gold', NULL, NULL, 'Sana', 4,
   'Rang tasveer jaisa hi hai. Andar se thora sakht tha shuru mein.'),

  ('rv_sneaker_1', 'p_men_sneaker_white', NULL, NULL, 'Ali', 4,
   'Rozana pehnne ke liye acha hai, saaf karna asaan.'),

  ('rv_flat_1', 'p_women_flat_black', NULL, NULL, 'Maryam', 5,
   'Poora din pehna, paon bilkul nahi dukhe. Paisay wasool.'),
  ('rv_flat_2', 'p_women_flat_black', NULL, NULL, 'Zainab', 5,
   'Sale par mila, quality expect se behtar nikli.'),

  ('rv_school_1', 'p_kids_sneaker_blue', NULL, NULL, 'Farhan', 4,
   'Bachay ke school ke liye liya. Velcro strap se woh khud pehen leta hai.')

ON CONFLICT (id) DO NOTHING;
