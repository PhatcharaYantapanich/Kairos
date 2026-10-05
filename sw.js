// Kairos service worker — offline app shell + notification clicks.
const VERSION = '202610051743';
const SHELL = `kairos-shell-${VERSION}`;
const RUNTIME = 'kairos-runtime';
const ASSETS = ['./', 'index.html', `app.js?v=${VERSION}`, `app.css?v=${VERSION}`, `config.js?v=${VERSION}`, 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'badge-96.png', 'icon.svg', 'chunk-DN2KA74K.js', 'chunk-EL62TQZ5.js', 'chunk-UCAEQB2A.js', 'chunk-VI6NNQR2.js', 'chunk-WOT6VMZA.js', 'chunk-ZZCOH46R.js', 'cloud-A3Z5Y5V6.js', 'cloudctl-P4KVG6UL.js', 'date-MAJRIMOM.js', 'egg-BVHPPTKC.js', 'state-MDF2GOHK.js', 'store-VMO5CFQL.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS)).catch(() => {}));
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('kairos-shell-') && k !== SHELL).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', (e) => { if (e.data?.type === 'skip-waiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // never cache API / auth traffic
  if (/googleapis\.com$|google\.com$|firebaseio|firestore|identitytoolkit|securetoken|gstatic\.com$/.test(url.hostname) && !/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return;
  if (url.pathname.includes('/__/auth/')) return;
  // fonts: cache-first
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(RUNTIME).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  // navigations: network-first, fall back to cached shell (offline)
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { caches.open(SHELL).then((c) => c.put('index.html', res.clone())); return res; })
      .catch(async () => (await caches.match('index.html')) || (await caches.match('./'))));
    return;
  }
  // app assets: cache-first (versioned), then network
  e.respondWith(caches.match(req, { ignoreSearch: false }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && url.pathname.match(/\.(png|svg|js|css|webmanifest)$/)) caches.open(RUNTIME).then((c) => c.put(req, res.clone()));
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }))));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const taskId = e.notification.data?.taskId;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = all[0];
    if (client) { await client.focus(); if (taskId) client.postMessage({ type: 'open-task', taskId }); return; }
    await self.clients.openWindow(taskId ? `./?task=${taskId}` : './');
  })());
});

// Ready for server push (Firebase Cloud Messaging) if added later.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data?.json() || {}; } catch { d = { title: e.data?.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Kairos', { body: d.body || '', data: d.data || {}, icon: 'icon-192.png', badge: 'badge-96.png', tag: d.tag }));
});
