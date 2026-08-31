/**
 * Trust-critical microcopy, in Roman Urdu.
 *
 * The UI chrome is English; these specific lines are not. They are the moments
 * where a hesitant customer decides whether to order — delivery promise, COD
 * confirmation, returns, sign-in and the WhatsApp prompt — and they land better
 * in the language people actually message the shop in.
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
  whatsappSizeTitle: 'Size ka masla?',
  whatsappSizeBody: 'WhatsApp par pooch lein — 10 min mein jawab.',

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
  dispatchToday: 'Stock mein — dispatch aaj',
  lowStock: 'Sirf chand jorey baaqi hain',
  outOfStock: 'Abhi stock mein nahi hai',

  /** Shown on the checkout page inside the TikTok in-app browser. */
  openInBrowser: 'Behtar tajurbe ke liye Chrome mein kholein',

  /** Empty states. */
  emptyCart: 'Aap ka cart khali hai.',
  emptySaved: 'Abhi tak kuch save nahi kiya.',
  noResults: 'Is talash ka koi natija nahi mila.',
} as const;

/**
 * Passwordless sign-in.
 *
 * There is no password and no email anywhere in this flow, and guest checkout
 * is never more than one tap away — COD shoppers abandon forms, and an account
 * has to earn itself rather than block the sale.
 */
export const AUTH = {
  numberTitle: 'Apna number dein',
  numberBody: 'Order track karein, COD checkout tez ho jaye, aur apna size save rehta hai.',
  numberLabel: 'Mobile number',
  numberHint: 'Ek code SMS aur WhatsApp dono par jayega.',
  whatsappOptIn: 'Order updates WhatsApp par bhejein',
  sendCode: 'Code bhejein',
  guest: 'Guest ke tor par kharidein',
  terms: 'Continue karke aap hamari terms aur privacy policy se ittefaq karte hain.',

  codeTitle: 'Code daalein',
  codeSentTo: 'Code bheja gaya',
  changeNumber: 'Number badlein',
  resend: 'Dobara bhejein',
  verify: 'Verify karein',

  welcome: 'Salaam',
  verified: 'Aapka number verify ho gaya. Ab COD checkout do tap mein.',
  keepShopping: 'Shopping jari rakhein',
  signOut: 'Sign out',

  savedSize: 'saved size',
  pastOrders: 'past orders',
  addresses: 'addresses',
} as const;

export type TrustKey = keyof typeof TRUST;
export type AuthKey = keyof typeof AUTH;
