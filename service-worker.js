const CACHE = "kt-rule-finder-v2.0.0-wrecka-krew";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./404.html",
  "./VERSION.txt",
  "./data/core_rules.js",
  "./data/weapon_rules.js",
  "./data/plague_marines.js",
  "./data/angels_of_death.js",
  "./data/wrecka_krew.js",
  "./assets/plague_marines/bombardier.webp",
  "./assets/plague_marines/caster.webp",
  "./assets/plague_marines/champion.webp",
  "./assets/plague_marines/fighter.webp",
  "./assets/plague_marines/heavy.webp",
  "./assets/plague_marines/icon.webp",
  "./assets/plague_marines/warrior.webp",
  "./assets/angels_of_death/assault-sergeant.webp",
  "./assets/angels_of_death/assault-warrior.webp",
  "./assets/angels_of_death/captain.webp",
  "./assets/angels_of_death/eliminator.webp",
  "./assets/angels_of_death/grenadier.webp",
  "./assets/angels_of_death/heavy-gunner.webp",
  "./assets/angels_of_death/intercessor-gunner.webp",
  "./assets/angels_of_death/intercessor-sergeant.webp",
  "./assets/angels_of_death/intercessor-warrior.webp"
  "./assets/wrecka_krew/bomb-squig.webp",
  "./assets/wrecka_krew/boss-nob.webp",
  "./assets/wrecka_krew/demolisha.webp",
  "./assets/wrecka_krew/fighter.webp",
  "./assets/wrecka_krew/gunner.webp",
  "./assets/wrecka_krew/krusha.webp",
  "./assets/wrecka_krew/rokkiteer.webp",
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => {
        if (event.request.mode === "navigate") return caches.match("./index.html");
        return Promise.reject();
      });
    })
  );
});
