// Kairos service worker — offline app shell + notification clicks.
const VERSION = '202611010439';
const SHELL = `kairos-shell-${VERSION}`;
const RUNTIME = 'kairos-runtime';
const ASSETS = ['./', 'index.html', `app.js?v=${VERSION}`, `app.css?v=${VERSION}`, `config.js?v=${VERSION}`, 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'badge-96.png', 'metron/', 'metron/index.html', 'metron/manifest.webmanifest', 'metron/icon-192.png', 'metron/apple-touch-icon.png', 'metron/icon.svg', 'icon.svg', 'App-JVEH2QAB.js', 'MoneyLink-4M52KIUH.js', 'ProjectPM-DZ5GDYZS.js', 'activity-RP74W2G7.js', 'ai-Q3STMUMC.js', 'ai-Y34ZXXN7.js', 'apps-6QQ3IYCG.js', 'cattrans-5NRDU7U7.js', 'chunk-25X4SNVF.js', 'chunk-3IOHBBBU.js', 'chunk-3JPLASRB.js', 'chunk-4EVNIGRI.js', 'chunk-4TWN66YE.js', 'chunk-CAJKZY6T.js', 'chunk-ECSC66G4.js', 'chunk-EEHWE7ZE.js', 'chunk-EPNUDA3L.js', 'chunk-GBB4T5VH.js', 'chunk-GF75OO2U.js', 'chunk-IB2GK3W7.js', 'chunk-JUZMOXVU.js', 'chunk-JVR537IX.js', 'chunk-K7NABUZI.js', 'chunk-KDHXZKSN.js', 'chunk-KJRTNURU.js', 'chunk-KUXO5B24.js', 'chunk-M4RB7EMP.js', 'chunk-MO6CMK4P.js', 'chunk-PD4JBLWX.js', 'chunk-Q77BG7BA.js', 'chunk-QJUMC5XX.js', 'chunk-QYUDTP3N.js', 'chunk-UOG7UOPY.js', 'chunk-W36TXC5B.js', 'chunk-WOT6VMZA.js', 'chunk-WQICAVKF.js', 'chunk-WTXIYJYG.js', 'chunk-YWNZ5OC7.js', 'clock-VANC6RNN.js', 'cloud-BCTOXFO5.js', 'cloudctl-R443MFK4.js', 'date-LYFVD5QW.js', 'egg-BAO55PKA.js', 'index.esm-B43YSHPE.js', 'index.esm-RTEO4NVN.js', 'index.esm-SKEIU7C5.js', 'money-52WJYRCX.js', 'naming-QB35ITWE.js', 'parse-LUATSFMJ.js', 'review-MGXVNZ5I.js', 'server-BGOXOWGQ.js', 'state-23ZFRMBW.js', 'state-HXO2AGWJ.js', 'stickers-HIGQ2725.js', 'store-JICTNMRE.js'];

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
  // the v7 design preview at ./v7/ is left alone (not cached, never replaces the app's offline page)
  if (url.pathname.includes('/v7/')) return;
  // navigations: network-first, fall back to cached shell (offline)
  // v5.4: ./metron/ is the same app opened on its money face (its own page + manifest)
  if (req.mode === 'navigate') {
    const page = /\/metron\/?(index\.html)?$/.test(url.pathname) ? 'metron/index.html' : 'index.html';
    e.respondWith(fetch(req).then((res) => { if (res.ok) caches.open(SHELL).then((c) => c.put(page, res.clone())); return res; })
      .catch(async () => (await caches.match(page)) || (await caches.match(page === 'index.html' ? './' : 'metron/'))));
    return;
  }
  // app assets: cache-first (versioned), then network
  e.respondWith(caches.match(req, { ignoreSearch: false }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && url.pathname.match(/\.(png|webp|svg|js|css|webmanifest)$/)) caches.open(RUNTIME).then((c) => c.put(req, res.clone()));
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }))));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const d = e.notification.data || {};
  const taskId = d.taskId;
  const url = d.url || (taskId ? `./?task=${taskId}` : './');
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = all[0];
    if (client) {
      await client.focus();
      client.postMessage(taskId ? { type: 'open-task', taskId } : { type: 'open-url', url });
      return;
    }
    await self.clients.openWindow(url);
  })());
});

// Lock-screen / Notification Center alerts sent by the Kairos Worker (Web Push).
// The message is in the Declarative Web Push shape, so Safari can show it even
// without this handler; here we add the icon, badge count and tap target.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data?.json() || {}; } catch { d = { title: e.data?.text() }; }
  const n = d.notification || d;
  const data = { ...(n.data || {}), url: n.navigate || n.url || './' };
  e.waitUntil((async () => {
    if (n.app_badge != null && self.navigator.setAppBadge) { try { +n.app_badge ? await self.navigator.setAppBadge(+n.app_badge) : await self.navigator.clearAppBadge(); } catch {} }
    await self.registration.showNotification(n.title || 'Kairos', { body: n.body || '', data, icon: 'icon-192.png', badge: 'badge-96.png', tag: n.tag, lang: n.lang || 'th', silent: !!n.silent });
  })());
});
