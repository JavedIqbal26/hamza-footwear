/**
 * Money formatting.
 *
 * All amounts in this project are a whole number of PKR. There are no decimals
 * and no floats anywhere near money — see CLAUDE.md.
 *
 * Grouping is done by hand rather than via `Intl.NumberFormat` so the output is
 * byte-identical in the Worker, at build time, and in the browser, regardless of
 * the runtime's ICU data.
 */

const GROUP_SEPARATOR = ',';

export class InvalidMoneyError extends Error {
  constructor(value: number) {
    super(`Money must be a whole number of PKR, received: ${value}`);
    this.name = 'InvalidMoneyError';
  }
}

/** True when `value` is a safe, whole, non-negative number of rupees. */
export function isValidPkr(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function assertValidPkr(value: number): void {
  if (!isValidPkr(value)) throw new InvalidMoneyError(value);
}

/** Groups digits in threes: 4500 -> "4,500". */
export function groupDigits(value: number): string {
  const digits = String(Math.abs(value));
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += GROUP_SEPARATOR;
    out += digits[i];
  }
  return value < 0 ? `-${out}` : out;
}

/** The canonical customer-facing price string: 4500 -> "Rs 4,500". */
export function formatPKR(value: number): string {
  assertValidPkr(value);
  return `Rs ${groupDigits(value)}`;
}

/** Bare grouped number, for places that supply their own currency label. */
export function formatPKRAmount(value: number): string {
  assertValidPkr(value);
  return groupDigits(value);
}
