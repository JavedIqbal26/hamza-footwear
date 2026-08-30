/**
 * Redirect target safety.
 *
 * Form posts carry a `return_to` so the customer lands back where they were.
 * That value is attacker-controllable, so only same-site paths are honoured —
 * anything absolute, protocol-relative, or otherwise unusual falls back.
 *
 * Without this, `return_to=https://evil.example` turns the shop into an open
 * redirect that phishing can borrow.
 */
export function safeReturnPath(value: FormDataEntryValue | null, fallback: string): string {
  if (typeof value !== 'string') return fallback;

  const path = value.trim();

  /* Must be a rooted path, and must not be protocol-relative ("//host"). */
  if (!path.startsWith('/') || path.startsWith('//')) return fallback;

  /* Backslashes are treated as slashes by some browsers — do not take the risk. */
  if (path.includes('\\')) return fallback;

  return path;
}
