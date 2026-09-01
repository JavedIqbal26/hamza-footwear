/**
 * Pakistani mobile numbers.
 *
 * The stored form is exactly 11 digits beginning `03` — no spaces, no dashes,
 * no `+92`. This is the only reliable way to reach a customer, so it is
 * validated hard on both the client and the server (CLAUDE.md).
 */

export const PK_MOBILE_PATTERN = /^03\d{9}$/;

/** Accepts an already-normalised number only. Run `normalisePhone` first. */
export function isValidPkMobile(value: string): boolean {
  return PK_MOBILE_PATTERN.test(value);
}

/**
 * Coerces the shapes customers actually type into the stored form.
 *
 *   "0300 123 4567"  -> "03001234567"
 *   "0300-1234567"   -> "03001234567"
 *   "+92 300 1234567"-> "03001234567"
 *   "923001234567"   -> "03001234567"
 *
 * Returns the digits it managed to produce; the caller still validates. This
 * never throws, so it is safe to run on every keystroke in a form.
 */
export function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith('3') && digits.length === 10) return `0${digits}`;
  return digits;
}

/** Normalise then validate, in the one call most callers want. */
export function parsePkMobile(input: string): string | null {
  const normalised = normalisePhone(input);
  return isValidPkMobile(normalised) ? normalised : null;
}

/** Display form, grouped for readability: "03001234567" -> "0300 1234567". */
export function formatPhone(value: string): string {
  return isValidPkMobile(value) ? `${value.slice(0, 4)} ${value.slice(4)}` : value;
}

/** `wa.me` requires the international form without a leading `+`. */
export function toWhatsAppNumber(value: string): string {
  const normalised = normalisePhone(value);
  return isValidPkMobile(normalised) ? `92${normalised.slice(1)}` : normalised;
}

/**
 * `tel:` form, in full international notation.
 *
 * The `+92` matters: a stored `03001234567` dialled from a phone roaming on a
 * foreign network, or from a laptop softphone, resolves to the wrong country
 * without it. Falls back to whatever digits it has rather than refusing to
 * produce a link — a slightly wrong number the owner can see and correct beats
 * no way to call at all.
 */
export function toTelNumber(value: string): string {
  const normalised = normalisePhone(value);
  return isValidPkMobile(normalised) ? `+92${normalised.slice(1)}` : normalised;
}
