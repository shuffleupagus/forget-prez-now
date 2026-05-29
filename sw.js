/* Wes Know Prez — offline cache (active only when hosted over http/https) */
var CACHE = "anfgpn-v2";
var ASSETS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./css/styles.css",
  "./js/presidents.js", "./js/pixelart.js", "./js/app.js",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"
];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  e.respondWith(caches.match(e.request).then(function (r) { return r || fetch(e.request); }));
});
