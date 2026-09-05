-- Notification settings the shop owner controls, and the push subscriptions
-- that back one of the channels.
--
-- Telegram and email were already written but configured only through
-- environment variables, so turning a channel on meant a redeploy. That is the
-- wrong place for a preference: it belongs to the person being notified, not to
-- the deployment.

-- A generic key/value store, so the next setting needs no migration.
--
-- Deliberately not a single typed row: settings arrive one at a time over the
-- life of a shop, and a column per preference means a table rebuild for each.
-- Values are TEXT and parsed by the repository, which is the only thing that
-- knows a given key holds a boolean.
--
-- NOT a home for credentials. The Telegram bot token stays a Worker secret; a
-- token in here would be a token in every database backup. Only the chat id and
-- the on/off flags live here, and neither is usable on its own.
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Web Push subscriptions for the admin app.
--
-- One row per browser the owner has enabled notifications in — his phone and
-- the shop laptop are separate subscriptions, and both should ring. The
-- endpoint is the push service's URL for that browser and is unique; p256dh and
-- auth are the keys its payload is encrypted to, per RFC 8291.
--
-- A subscription is disposable. Browsers expire and reissue them freely, so a
-- 404 or 410 from the push service means "delete this row", never "retry".
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint   TEXT PRIMARY KEY,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  -- Which browser this came from, so the settings screen can name it.
  label      TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
