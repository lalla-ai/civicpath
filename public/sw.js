/**
 * CivicPath Service Worker — Web Push Notifications
 * Receives push events and shows browser notifications.
 */

self.addEventListener('push', (event) => {
  let data = { title: '🔍 CivicPath', body: 'New grants found for you!', url: '/seeker' };
  try {
    if (event.data) data = { ...data, ...JSON.parse(event.data.text()) };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'civicpath-watcher',
      renotify: true,
      requireInteraction: false,
      data: { url: data.url },
      actions: [
        { action: 'view', title: 'View Grants →' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/seeker';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      const existing = cs.find((c) => c.url.includes('civicpath.ai') && 'focus' in c);
      if (existing) { existing.focus(); existing.navigate(url); }
      else if (clients.openWindow) clients.openWindow(url);
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
