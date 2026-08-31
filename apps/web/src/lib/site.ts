/**
 * Site-wide constants that are not customer data.
 *
 * The WhatsApp number is NOT here — it comes from the `SHOP_WHATSAPP` binding
 * so it can be changed in the Cloudflare dashboard without a deploy.
 */

export const SITE = {
  name: 'Hamza Footwear',
  tagline: 'Shoes that reach your door.',
  url: 'https://hamzafootwear.com',
  description:
    'Shoes for men, women and kids, delivered across Pakistan. Cash on Delivery available.',
  /* Shown in the footer. Replace with the shop's real address before launch. */
  address: 'Delivering across Pakistan.',
} as const;

export interface NavLink {
  readonly href: string;
  readonly label: string;
}

export const PRIMARY_NAV: readonly NavLink[] = [
  { href: '/women', label: 'Women' },
  { href: '/men', label: 'Men' },
  { href: '/kids', label: 'Kids' },
];

export const FOOTER_NAV: readonly NavLink[] = [
  { href: '/size-guide', label: 'Size Guide' },
  { href: '/delivery', label: 'Delivery' },
  { href: '/returns', label: 'Returns & Exchange' },
  { href: '/account', label: 'Your account' },
];
