/*
 * Service worker for admin notifications.
 *
 * Deliberately tiny and deliberately not a cache. Caching an app that sits
 * behind Cloudflare Access is a good way to serve a stale shell to someone
 * whose session has expired, and offline support is worth nothing to a shop
 * that needs live order data anyway. This does one job: receive a push and
 * open the order it names.
 *
 * Plain JavaScript in `public/`, not a bundled module: a service worker is
 * fetched by the browser at its own URL and must be servable as-is.
 */

self.addEventListener('install', () => {
  /* Take over immediately rather than waiting for every tab to close. */
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    /* A malformed payload should still ring — an order arrived either way. */
  }

  const title = payload.title || 'New order';
  const options = {
    body: payload.body || 'Open admin to set the delivery charge.',
    /* The mark, so the notification is recognisably from the shop. */
    icon: '/admin/icon-192.png',
    badge: '/admin/icon-192.png',
    /* Tagged by order, so two pushes for one order collapse rather than stack. */
    tag: payload.orderId || 'order',
    renotify: true,
    requireInteraction: false,
    data: { url: payload.url || '/admin/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = (event.notification.data && event.notification.data.url) || '/admin/';

  /*
   * Focus an admin tab if one is already open rather than piling up windows —
   * the owner taps these all day.
   */
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes('/admin') && 'focus' in client) return client.focus();
        }
        return self.clients.openWindow(target);
      }),
  );
});
