import type { D1Database } from '@cloudflare/workers-types';

/**
 * One-time codes and sessions.
 *
 * Two rules govern everything here:
 *
 * 1. **Nothing replayable is ever stored.** The OTP is kept as a SHA-256 hash
 *    and the session row's primary key is the hash of the cookie token, so a
 *    dumped database yields no working credential.
 * 2. **Codes are single-use and budgeted.** A code is consumed on success and
 *    burned after too many wrong guesses, so a five-digit secret cannot be
 *    brute-forced across attempts.
 */

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
/** Per-number send ceiling, to stop the SMS bill being someone else's toy. */
export const OTP_MAX_SENDS_PER_HOUR = 5;
export const SESSION_TTL_DAYS = 90;

export type VerifyResult =
  | { readonly status: 'ok' }
  | { readonly status: 'invalid'; readonly attemptsLeft: number }
  | { readonly status: 'expired' }
  | { readonly status: 'exhausted' };

export interface AuthRepository {
  createCode(id: string, phone: string, codeHash: string): Promise<void>;
  countRecentSends(phone: string): Promise<number>;
  verifyCode(phone: string, codeHash: string): Promise<VerifyResult>;

  createSession(idHash: string, customerId: string): Promise<void>;
  findSessionCustomer(idHash: string): Promise<string | null>;
  deleteSession(idHash: string): Promise<void>;
  deleteExpired(): Promise<void>;
}

const NOW = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";

interface OtpRow {
  id: string;
  expires_at: string;
  attempts: number;
  consumed_at: string | null;
  code_hash: string;
}

export function createAuthRepository(db: D1Database): AuthRepository {
  return {
    async createCode(id: string, phone: string, codeHash: string): Promise<void> {
      /*
       * Any earlier live code for this number is consumed first. Only the most
       * recent code can ever work, so "resend" cannot widen the guess surface.
       */
      await db.batch([
        db
          .prepare(
            `UPDATE otp_codes SET consumed_at = ${NOW}
             WHERE phone = ?1 AND consumed_at IS NULL`,
          )
          .bind(phone),
        db
          .prepare(
            `INSERT INTO otp_codes (id, phone, code_hash, expires_at)
             VALUES (?1, ?2, ?3, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+${OTP_TTL_MINUTES} minutes'))`,
          )
          .bind(id, phone, codeHash),
      ]);
    },

    async countRecentSends(phone: string): Promise<number> {
      const row = await db
        .prepare(
          `SELECT COUNT(*) AS count FROM otp_codes
           WHERE phone = ?1 AND created_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 hour')`,
        )
        .bind(phone)
        .first<{ count: number }>();
      return row?.count ?? 0;
    },

    /**
     * Verification is deliberately not a single clever statement: the outcomes
     * differ (expired / exhausted / wrong / ok) and the caller must be able to
     * tell the customer which, without leaking whether a code exists at all.
     */
    async verifyCode(phone: string, codeHash: string): Promise<VerifyResult> {
      const row = await db
        .prepare(
          `SELECT id, expires_at, attempts, consumed_at, code_hash FROM otp_codes
           WHERE phone = ?1 AND consumed_at IS NULL
           ORDER BY created_at DESC LIMIT 1`,
        )
        .bind(phone)
        .first<OtpRow>();

      if (row === null) return { status: 'expired' };

      if (new Date(row.expires_at).getTime() <= Date.now()) {
        return { status: 'expired' };
      }

      if (row.attempts >= OTP_MAX_ATTEMPTS) {
        await db
          .prepare(`UPDATE otp_codes SET consumed_at = ${NOW} WHERE id = ?1`)
          .bind(row.id)
          .run();
        return { status: 'exhausted' };
      }

      if (row.code_hash !== codeHash) {
        const attempts = row.attempts + 1;
        await db
          .prepare('UPDATE otp_codes SET attempts = ?2 WHERE id = ?1')
          .bind(row.id, attempts)
          .run();

        const attemptsLeft = OTP_MAX_ATTEMPTS - attempts;
        return attemptsLeft <= 0
          ? { status: 'exhausted' }
          : { status: 'invalid', attemptsLeft };
      }

      /* Correct: burn it, so the same code cannot be replayed. */
      await db
        .prepare(`UPDATE otp_codes SET consumed_at = ${NOW} WHERE id = ?1`)
        .bind(row.id)
        .run();

      return { status: 'ok' };
    },

    async createSession(idHash: string, customerId: string): Promise<void> {
      await db
        .prepare(
          `INSERT INTO sessions (id, customer_id, expires_at)
           VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+${SESSION_TTL_DAYS} days'))`,
        )
        .bind(idHash, customerId)
        .run();
    },

    async findSessionCustomer(idHash: string): Promise<string | null> {
      const row = await db
        .prepare(
          `SELECT customer_id FROM sessions
           WHERE id = ?1 AND expires_at > ${NOW}`,
        )
        .bind(idHash)
        .first<{ customer_id: string }>();
      return row?.customer_id ?? null;
    },

    async deleteSession(idHash: string): Promise<void> {
      await db.prepare('DELETE FROM sessions WHERE id = ?1').bind(idHash).run();
    },

    /** Housekeeping; safe to call opportunistically. */
    async deleteExpired(): Promise<void> {
      await db.batch([
        db.prepare(`DELETE FROM sessions WHERE expires_at <= ${NOW}`),
        db.prepare(
          `DELETE FROM otp_codes WHERE created_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day')`,
        ),
      ]);
    },
  };
}
