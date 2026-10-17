/* Generated from the complete local static bundle. */
const CACHE = 'recruitdesk-ba3484ff50b49c54ba6c917a';
const ASSETS = ["/assets/index-CyuEYU_b.js","/assets/index-D96d_EGj.css","/assets/inter-cyrillic-ext-wght-normal-BOeWTOD4.woff2","/assets/inter-cyrillic-wght-normal-DqGufNeO.woff2","/assets/inter-greek-ext-wght-normal-DlzME5K_.woff2","/assets/inter-greek-wght-normal-CkhJZR-_.woff2","/assets/inter-latin-ext-wght-normal-DO1Apj_S.woff2","/assets/inter-latin-wght-normal-Dx4kXJAl.woff2","/assets/inter-vietnamese-wght-normal-CBcvBZtf.woff2","/icon.svg","/index.html","/manifest.webmanifest"];
self.addEventListener('install', event => {
  // No skipWaiting: existing tabs keep the version they opened.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(path => new Request(path, { cache: 'reload', credentials: 'same-origin' })))));
});
self.addEventListener('activate', event => {
  // Keep old caches: another tab may still require its previous bundle.
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET') {
    event.respondWith(Promise.resolve(Response.error()));
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const asset = await cache.match(url.pathname);
    if (asset) return asset;
    if (request.mode === 'navigate' && !url.pathname.split('/').pop().includes('.')) {
      return (await cache.match('/index.html')) || Response.error();
    }
    return new Response('Not available offline', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
