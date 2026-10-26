// Kairos service worker — offline app shell + notification clicks.
const VERSION = '202610261105';
const SHELL = `kairos-shell-${VERSION}`;
const RUNTIME = 'kairos-runtime';
const ASSETS = ['./', 'index.html', `app.js?v=${VERSION}`, `app.css?v=${VERSION}`, `config.js?v=${VERSION}`, 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'badge-96.png', 'metron/', 'metron/index.html', 'metron/manifest.webmanifest', 'metron/icon-192.png', 'metron/apple-touch-icon.png', 'metron/icon.svg', 'icon.svg', 'App-CMQKSF5I.js', 'MoneyLink-WUFCIAK6.js', 'ProjectPM-3U22RASK.js', 'activity-WU7X2U3M.js', 'ai-6CBVZMMO.js', 'ai-B65NNMQC.js', 'apps-SIRJT4HV.js', 'cattrans-RL5HE27X.js', 'chunk-3JPLASRB.js', 'chunk-4XUAPOIP.js', 'chunk-5VXQ3GW6.js', 'chunk-6Z4GMCBG.js', 'chunk-AYTDIMEA.js', 'chunk-BZJ65TKQ.js', 'chunk-CWIZCOTQ.js', 'chunk-DOE4OXEG.js', 'chunk-ECSC66G4.js', 'chunk-EQVORQRU.js', 'chunk-GBGPTSZF.js', 'chunk-HI2OHN3E.js', 'chunk-HP2CMSQN.js', 'chunk-JUZMOXVU.js', 'chunk-KDKM4VAL.js', 'chunk-KZV5XQCZ.js', 'chunk-M4RB7EMP.js', 'chunk-M5L6ZLX6.js', 'chunk-MO6CMK4P.js', 'chunk-PBRHPJHM.js', 'chunk-QHCQYCM5.js', 'chunk-QJUMC5XX.js', 'chunk-TQXA6436.js', 'chunk-U3VMJKHU.js', 'chunk-UWMF4IOM.js', 'chunk-VKPQIWMG.js', 'chunk-W2IRIKNE.js', 'chunk-WOT6VMZA.js', 'chunk-WTXIYJYG.js', 'chunk-ZZSN4MJE.js', 'clock-7SBRYNEP.js', 'cloud-BCTOXFO5.js', 'cloudctl-6VGY7L67.js', 'date-7LGD5MRZ.js', 'egg-BAO55PKA.js', 'index.esm-B43YSHPE.js', 'index.esm-RTEO4NVN.js', 'index.esm-SKEIU7C5.js', 'money-E7TTKZIR.js', 'naming-K5KNXKHC.js', 'parse-B5NNTIHE.js', 'review-OJ2F4L4A.js', 'server-XEOJVOWF.js', 'state-AOPY4N2Q.js', 'state-QMKLNR4C.js', 'stickers-AD27FCI6.js', 'store-QCBIZTMR.js'];

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
