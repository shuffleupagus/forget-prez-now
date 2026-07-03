/* Ain't Never Gonna Forget Presidents Now — offline cache (v2)
   Stale-while-revalidate: serve from cache instantly, refresh in background. */
var CACHE = "anfgpn-v3";
var ASSETS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./css/styles.css",
  "./js/presidents.js", "./js/pixelart.js", "./js/app.js",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"
];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var fresh = fetch(e.request).then(function (res) {
        if (res && res.ok && e.request.url.indexOf(self.location.origin) === 0) {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || fresh;
    })
  );
});
