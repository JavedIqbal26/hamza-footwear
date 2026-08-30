/**
 * Trust-critical microcopy, in Roman Urdu.
 *
 * The UI chrome is English; these specific lines are not. They are the moments
 * where a hesitant customer decides whether to order — delivery promise, COD
 * confirmation, returns, and the WhatsApp prompt — and they land better in the
 * language people actually message the shop in.
 *
 * No Urdu script: Nastaliq webfonts are far too heavy for the performance budget.
 *
 * Every string lives here so a native speaker can review the whole set in one
 * pass rather than hunting through templates.
 */

export const TRUST = {
  /** Shown next to the WhatsApp button. */
  whatsappPrompt: 'WhatsApp par order karein',
  whatsappHelp: 'Size ya rang ke baare mein poochhna ho to message karein',

  /** Cash on Delivery. The single most important reassurance on the site. */
  cod: 'Cash on Delivery — saman haath mein lene ke baad paisay dein',
  codShort: 'Cash on Delivery available',

  /** Delivery promise. Keep vague enough to always be true. */
  deliveryTime: 'Pakistan bhar mein 2 se 4 din mein delivery',
  deliveryFeeNote: 'Delivery charges aap ke shehar ke hisaab se lagte hain',

  /** Returns. */
  returns: '7 din ke andar exchange — size theek na aaye to badal lein',
  returnsCondition: 'Joota bilkul naya aur original box mein hona zaroori hai',

  /** Sizing. Sizing confusion is the leading cause of returns. */
  sizeHelp: 'Size ka masla? Pehle apna paon cm mein naapein',
  sizeUk: 'Tamam sizes UK hain',

  /** Stock. */
  outOfStock: 'Abhi stock mein nahi hai',
  lowStock: 'Sirf chand jorey baaqi hain',

  /** Shown on the checkout page inside the TikTok in-app browser. */
  openInBrowser: 'Behtar tajurbe ke liye Chrome mein kholein',
} as const;

export type TrustKey = keyof typeof TRUST;
