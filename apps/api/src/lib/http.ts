import type { Context } from 'hono';
import type { ZodError } from 'zod';

/**
 * Response shapes.
 *
 * Kept in one place so every route answers in the same shape and the admin
 * client has exactly one error format to handle.
 */

export interface ApiError {
  readonly error: string;
  /** Field-level messages, when the failure was validation. */
  readonly fields?: Record<string, string>;
}

/** Flattens a Zod error to one message per field. */
export function toFieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !fields[key]) {
      fields[key] = issue.message;
    }
  }
  return fields;
}

export function validationFailed(c: Context, error: ZodError) {
  return c.json<ApiError>(
    { error: 'Please check the highlighted fields.', fields: toFieldErrors(error) },
    422,
  );
}

export function notFound(c: Context, what = 'Not found') {
  return c.json<ApiError>({ error: what }, 404);
}
