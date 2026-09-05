import type { D1Database } from '@cloudflare/workers-types';

/**
 * Web Push subscriptions for the admin app.
 *
 * One row per browser the owner has turned notifications on in — his phone and
 * the shop laptop are separate subscriptions and both should ring.
 *
 * Subscriptions are disposable. Browsers expire and reissue them without
 * warning, so the sender treats a 404 or 410 from the push service as "delete
 * this row", never as an error worth retrying. That is why `remove` exists and
 * why nothing here throws on a missing endpoint.
 */

export interface PushSubscription {
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
  readonly label: string;
}

export interface PushRepository {
  list(): Promise<PushSubscription[]>;
  /** Idempotent: re-subscribing the same browser refreshes its keys. */
  save(subscription: PushSubscription): Promise<void>;
  remove(endpoint: string): Promise<void>;
  count(): Promise<number>;
}

export function createPushRepository(db: D1Database): PushRepository {
  return {
    async list(): Promise<PushSubscription[]> {
      const { results } = await db
        .prepare('SELECT endpoint, p256dh, auth, label FROM push_subscriptions')
        .all<PushSubscription>();

      return results;
    },

    async save(subscription: PushSubscription): Promise<void> {
      await db
        .prepare(
          `INSERT INTO push_subscriptions (endpoint, p256dh, auth, label)
           VALUES (?1, ?2, ?3, ?4)
           ON CONFLICT (endpoint) DO UPDATE
             SET p256dh = excluded.p256dh,
                 auth   = excluded.auth,
                 label  = excluded.label`,
        )
        .bind(subscription.endpoint, subscription.p256dh, subscription.auth, subscription.label)
        .run();
    },

    async remove(endpoint: string): Promise<void> {
      await db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?1').bind(endpoint).run();
    },

    async count(): Promise<number> {
      const row = await db
        .prepare('SELECT COUNT(*) AS count FROM push_subscriptions')
        .first<{ count: number }>();

      return row?.count ?? 0;
    },
  };
}
