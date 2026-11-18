// Offline support (brief: Practice and a downloaded Daily Melody work offline).
// - Install precaches the page, the content, and every built JS/CSS file (the build fills in ASSETS and BUILD,
//   see vite.config.ts), so one visit is enough to open any page offline; the piano samples come along too.
// - Registration (src/serviceWorker.ts): a returning visitor registers at load as always; a first visit only after
//   the player's first interaction (or first sound) and the chosen instrument's samples, so a visitor who leaves
//   without touching the page downloads none of this.
// - Pages and content: network-first (fresh when online), the cached copy when offline. A page request that
//   hangs for 4 s on a bad connection is answered from the cache while the network keeps trying in the background.
// - Hashed build files: cache-first (their names change whenever their content does).
// - Instrument samples: cache-first in their own cache, which survives app updates (the files never change;
//   bump AUDIO if one ever does).
const BUILD = '2004273a96';
const ASSETS = ["assets/AchievementsPage-C5VpKoUc.js","assets/CustomSongs-u2sZIcy2.js","assets/DailyAwardLink-C3_aINnP.js","assets/DailyPage-Ca-W3RTN.css","assets/DailyPage-CmuiJywM.js","assets/DailySongPage-CWiGQhwh.css","assets/DailySongPage-D0clgx4R.js","assets/DrumPad-D2YlhTMx.js","assets/DuelOfferCard-CotS4kHn.js","assets/DuelPage-C0N4kuj_.css","assets/DuelPage-l7wXDeCo.js","assets/Feedback-BP2qWfYv.js","assets/Hotkeys-D8RGkYVY.js","assets/Icon-D3s6Bc-X.js","assets/InfoPages-DIyMWmxl.js","assets/NoteTiles-D6IzeAQh.js","assets/OnlineLocked-CbKu7ixr.js","assets/PianoKeyboard-Ci0qcJmq.js","assets/PianoRoll-D1sYWx0E.js","assets/PracticeHub-Ci5FC-pU.js","assets/PracticeLocked-2w6-1_w7.js","assets/ProPage-C0ndALGM.js","assets/ProParts-BoxKXV52.css","assets/ProParts-C8__N0fb.js","assets/ProfilePage-CB80Fb6L.js","assets/ProgressChart-D3-gKRN4.js","assets/ProgressPage-CjEKOqxf.js","assets/RandomPractice-ItyxA5zl.js","assets/RewardsPage-nZK2dxgN.js","assets/SectionPage-Dm1udmhl.js","assets/SettingsForm-ChkLXdob.js","assets/SettingsPage-DmQXH-ou.js","assets/SongLibrary-BcJYEPoO.js","assets/SongPractice-CZ5IjGcV.js","assets/appInfo-DeskfDeg.js","assets/contact-DP_lx1De.js","assets/daily-Bgfoqqlb.js","assets/dailySchedule-RQLFowGi.js","assets/definitions-BNaiox6I.js","assets/dist-CVPAM7_G.js","assets/instrument-sans-B8ilUnkd.css","assets/instrument-sans-D8wwoWNZ.js","assets/keyboard-CF7OLt8T.js","assets/main-CJjRY5r6.js","assets/main-DWEycMqZ.css","assets/melody-Bw_VkoLA.js","assets/practice-DBZp_r0i.js","assets/practice-dy0wu2Wj.css","assets/practiceLimit-C93cuiBo.js","assets/puzzles-BNsYuawI.js","assets/questions-VtfT6OAJ.js","assets/random-CKQTcKNu.js","assets/react-yghMKqPI.js","assets/rolldown-runtime-XKyaHtl9.js","assets/runtime-D1q6j2RQ.js","assets/scales-B27NbP_V.js","assets/schedule-DWclCeEP.js","assets/settings-DYlrcF3H.js","assets/store-DGEuW1jM.js","assets/take-52lmhm-l.js","assets/typeInfo-C9WXIap7.js"];
const APP = `eartrainer-v18-${BUILD}`;
const AUDIO = 'eartrainer-audio-v1';
const SHELL = ['./content/content.v1.json', './icon.svg', './icon-180.png', './icon-192.png', './manifest.webmanifest'];
const PIANO = ['A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6', 'Ds6', 'Fs6', 'A6', 'C7'].map((n) => `./audio/piano/${n}.mp3`);
const PAGE_TIMEOUT_MS = 4000;
// One entry per URL, so the Vary header (some servers send `Vary: Origin`, and module scripts carry an Origin) must not cause misses.
const MATCH = { ignoreVary: true };

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const app = await caches.open(APP);
      // The page itself skips the HTTP cache so it always matches the ASSETS of this build.
      await app.addAll([new Request('./', { cache: 'reload' }), ...SHELL, ...ASSETS.map((a) => `./${a}`)]);
      // Best effort: the page usually fetched these already (HTTP cache), and a missing one must not block the update.
      const audio = await caches.open(AUDIO);
      await Promise.allSettled(PIANO.map(async (u) => (await audio.match(u, MATCH)) || audio.add(u)));
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== APP && k !== AUDIO).map((k) => caches.delete(k)));
      // Lets the page request start while the worker boots.
      await self.registration.navigationPreload?.enable().catch(() => {});
      await self.clients.claim();
    })(),
  );
});

/** Only good, same-origin responses are cached: a 404 or 500 must not replace the working offline copy. */
function store(e, cacheName, key, res) {
  if (res.ok && res.type === 'basic') {
    const copy = res.clone();
    e.waitUntil(caches.open(cacheName).then((c) => c.put(key, copy)));
  }
  return res;
}

function cacheFirst(e, cacheName) {
  return caches.match(e.request, MATCH).then((hit) => hit || fetch(e.request).then((res) => store(e, cacheName, e.request, res)));
}

/** Network first; the cached copy (then `fallback`) when the network fails, or after `timeoutMs` if one is cached. */
function networkFirst(e, key, fallback, timeoutMs, network) {
  const fromCache = () => caches.match(key, MATCH).then((hit) => hit || (fallback ? caches.match(fallback, MATCH) : undefined));
  const net = (network ?? fetch(e.request)).then((res) => store(e, APP, key, res));
  e.waitUntil(net.catch(() => {}));
  return new Promise((resolve) => {
    let settled = false;
    const answer = (res) => {
      if (settled || !res) return;
      settled = true;
      resolve(res);
    };
    const timer = timeoutMs ? setTimeout(() => fromCache().then(answer), timeoutMs) : 0;
    net.then(
      (res) => {
        clearTimeout(timer);
        answer(res);
      },
      () => {
        clearTimeout(timer);
        fromCache().then((hit) => answer(hit || Response.error()));
      },
    );
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/assets/')) return e.respondWith(cacheFirst(e, APP));
  if (url.pathname.includes('/audio/')) return e.respondWith(cacheFirst(e, AUDIO));
  if (req.mode === 'navigate') {
    // Hash routing: every page is the same document, kept under './' whatever its query string.
    const scope = new URL(self.registration.scope);
    const isApp = url.pathname === scope.pathname || url.pathname === `${scope.pathname}index.html`;
    const network = Promise.resolve(e.preloadResponse).then((r) => r || fetch(req));
    return e.respondWith(networkFirst(e, isApp ? './' : req, './', PAGE_TIMEOUT_MS, network));
  }
  e.respondWith(networkFirst(e, req, null, 0));
});
