import { api, type PushSubscriptionBody } from '../../../lib/api-client.js';

/**
 * Turning browser notifications on and off.
 *
 * Everything here can fail for reasons that are not bugs — permission denied,
 * a browser without push, an iPhone that has not been added to the home screen
 * — so each returns a reason the settings screen can show rather than throwing.
 */

export type PushEnableResult =
  | { ok: true }
  | { ok: false; reason: string };

const UNSUPPORTED =
  'This browser cannot show notifications. On an iPhone, add the app to your home screen first.';

const DENIED =
  'Notifications are blocked for this site. Allow them in your browser settings, then try again.';

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * base64url → the key `PushManager.subscribe` wants.
 *
 * Allocated and filled rather than built with `Uint8Array.from`, which yields
 * a `Uint8Array<ArrayBufferLike>` that `BufferSource` will not accept.
 */
function toApplicationServerKey(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function keyOf(subscription: PushSubscription, name: 'p256dh' | 'auth'): string {
  const key = subscription.getKey(name);
  if (!key) throw new Error(`Subscription is missing its ${name} key`);
  return btoa(String.fromCharCode(...new Uint8Array(key)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Something the owner will recognise in a list of devices. */
function describeBrowser(): string {
  const agent = navigator.userAgent;
  if (/Android/i.test(agent)) return 'Android phone';
  if (/iPhone|iPad/i.test(agent)) return 'iPhone';
  if (/Windows/i.test(agent)) return 'Windows';
  if (/Mac/i.test(agent)) return 'Mac';
  return 'This device';
}

export async function enablePush(vapidPublicKey: string): Promise<PushEnableResult> {
  if (!isPushSupported()) return { ok: false, reason: UNSUPPORTED };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: DENIED };

  try {
    /*
     * Scoped to `/admin/`, matching the app's base. A worker registered at the
     * root would claim pages it has no business controlling.
     */
    const registration = await navigator.serviceWorker.register('/admin/sw.js', {
      scope: '/admin/',
    });
    await navigator.serviceWorker.ready;

    /* Re-subscribing an already-subscribed browser is fine and refreshes keys. */
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toApplicationServerKey(vapidPublicKey),
      }));

    const body: PushSubscriptionBody = {
      endpoint: subscription.endpoint,
      p256dh: keyOf(subscription, 'p256dh'),
      auth: keyOf(subscription, 'auth'),
      label: describeBrowser(),
    };

    await api.subscribePush(body);
    return { ok: true };
  } catch (error) {
    console.error('Push subscribe failed', error);
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Could not turn on notifications.',
    };
  }
}

/**
 * Unsubscribes this browser, server-side first.
 *
 * Order matters: if the browser unsubscribed first and the server call then
 * failed, the row would linger and the sender would push to a dead endpoint
 * forever.
 */
export async function disablePush(): Promise<void> {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.getRegistration('/admin/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  await api.unsubscribePush(subscription.endpoint);
  await subscription.unsubscribe();
}
