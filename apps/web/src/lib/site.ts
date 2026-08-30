/**
 * Site-wide constants that are not customer data.
 *
 * The WhatsApp number is NOT here — it comes from the `SHOP_WHATSAPP` binding
 * so it can be changed in the Cloudflare dashboard without a deploy.
 */

export const SITE = {
  name: 'Hamza Footwear',
  tagline: 'Shoes delivered across Pakistan',
  url: 'https://hamzafootwear.com',
  description:
    'Shoes for men, women and kids, delivered across Pakistan. Cash on Delivery available.',
} as const;

export interface NavLink {
  readonly href: string;
  readonly label: string;
}

export const PRIMARY_NAV: readonly NavLink[] = [
  { href: '/men', label: 'Men' },
  { href: '/women', label: 'Women' },
  { href: '/kids', label: 'Kids' },
];

export const FOOTER_NAV: readonly NavLink[] = [
  { href: '/size-guide', label: 'Size Guide' },
  { href: '/delivery', label: 'Delivery' },
  { href: '/returns', label: 'Returns & Exchange' },
];
