/* IKEMEN LAB — Service Worker
   オフラインで起動できるように、アプリ本体をキャッシュする。
   index.html を更新したら CACHE の版数を上げること（古いキャッシュが破棄される）。 */
const CACHE = 'ikemenlab-v6';   /* v6: マイ食品を栄養成分表示の並びで登録・貼り付け読み取り */
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  if(new URL(req.url).origin !== location.origin) return;   // 外部リンク（動画検索など）は素通し

  // ページ遷移はネット優先→失敗したらキャッシュ（更新をすぐ反映しつつオフラインでも開ける）
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req)
        .then(res => { const cp = res.clone(); caches.open(CACHE).then(c=>c.put('./index.html', cp)); return res; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // それ以外はキャッシュ優先＋裏で更新
  e.respondWith(
    caches.match(req).then(hit=>{
      const net = fetch(req).then(res=>{
        if(res && res.status === 200) caches.open(CACHE).then(c=>c.put(req, res.clone()));
        return res;
      }).catch(()=> hit);
      return hit || net;
    })
  );
});
