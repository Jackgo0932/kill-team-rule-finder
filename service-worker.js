const CACHE = "kt-rule-finder-v2.2.6.3-aod-tactics-weapon-style-rows";
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
  "./data/universal_equipment.js",
  "./data/tac_ops.js",
  "./data/mission_ops.js",
  "./data/approved_ops.js",
  "./data/plague_marines.js",
  "./data/angels_of_death.js",
  "./data/wrecka_krew.js",
  "./data/murderwing.js",
  "./data/legionary.js",
  "./data/deathwatch.js",
  "./data/celestian_insidiants.js",
  "./data/canoptek_circle.js",
  "./data/kasrkin.js",
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
  "./assets/angels_of_death/intercessor-warrior.webp",
  "./assets/wrecka_krew/bomb-squig.webp",
  "./assets/wrecka_krew/boss-nob.webp",
  "./assets/wrecka_krew/demolisha.webp",
  "./assets/wrecka_krew/fighter.webp",
  "./assets/wrecka_krew/gunner.webp",
  "./assets/wrecka_krew/krusha.webp",
  "./assets/wrecka_krew/rokkiteer.webp",
  "./assets/murderwing/chaos-lord.webp",
  "./assets/murderwing/warp-talon.webp",
  "./assets/murderwing/skysear.webp",
  "./assets/murderwing/depredator.webp",
  "./assets/murderwing/huntmaster.webp",
  "./assets/murderwing/champion.webp",
  "./assets/murderwing/shrieker.webp",
  "./assets/murderwing/raptor.webp",
  "./assets/murderwing/curseclaw.webp",
  "./assets/deathwatch/watch-sergeant.webp",
  "./assets/deathwatch/aegis.webp",
  "./assets/deathwatch/blademaster.webp",
  "./assets/deathwatch/bombard.webp",
  "./assets/deathwatch/breacher.webp",
  "./assets/deathwatch/demolisher.webp",
  "./assets/deathwatch/disruptor.webp",
  "./assets/deathwatch/gunner.webp",
  "./assets/deathwatch/headtaker.webp",
  "./assets/deathwatch/horde-slayer.webp",
  "./assets/deathwatch/marksman.webp",
  "./assets/celestian_insidiants/superior.webp",
  "./assets/celestian_insidiants/abjuror.webp",
  "./assets/celestian_insidiants/censor.webp",
  "./assets/celestian_insidiants/cremator.webp",
  "./assets/celestian_insidiants/denuncia.webp",
  "./assets/celestian_insidiants/mortisanctus.webp",
  "./assets/celestian_insidiants/reliquarius.webp",
  "./assets/celestian_insidiants/warrior.webp",
  "./assets/canoptek_circle/geomancer.webp",
  "./assets/canoptek_circle/accelerator.webp",
  "./assets/canoptek_circle/reanimator.webp",
  "./assets/canoptek_circle/warrior.webp",
  "./assets/canoptek_circle/tomb-crawler.webp",
  "./assets/kasrkin/sergeant.webp",
  "./assets/kasrkin/combat-medic.webp",
  "./assets/kasrkin/demo-trooper.webp",
  "./assets/kasrkin/gunner.webp",
  "./assets/kasrkin/recon-trooper.webp",
  "./assets/kasrkin/sharpshooter.webp",
  "./assets/kasrkin/trooper.webp",
  "./assets/kasrkin/vox-trooper.webp",
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
