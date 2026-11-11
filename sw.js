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
const BUILD = 'e9095b7e9a';
const ASSETS = ["assets/AchievementsPage-pqf5AgFR.js","assets/CustomSongs-C895_qpe.js","assets/DailyPage-C4xnhQ78.js","assets/DailyPage-Ca-W3RTN.css","assets/DailySongPage-ChRNeGk4.js","assets/DailySongPage-Da2vf2zy.css","assets/DrumPad-DM67ghkZ.js","assets/DuelPage-CrY3JzEl.css","assets/DuelPage-nvfCZ27g.js","assets/Feedback-DNeRbt-K.js","assets/Hotkeys-D-mP8LC5.js","assets/InfoPages-B8tqReFV.js","assets/NoteTiles-BHw4NSQ7.js","assets/PianoRoll-CS_w7sml.js","assets/PracticeHub-Ba23J5zI.js","assets/ProfilePage-DypmJkqz.js","assets/ProgressChart-DVugxjlt.js","assets/ProgressPage-C3XvCeXK.js","assets/RandomPractice-CoHsCA97.js","assets/SectionPage-DspT3lSR.js","assets/SettingsForm-DIiqpDa4.js","assets/SettingsPage-ePzntve9.js","assets/SongLibrary-DX2JN6QK.js","assets/SongPractice-p8Y-14u-.js","assets/contact-DP_lx1De.js","assets/dailySchedule-22QMHIjX.js","assets/definitions-BhrRf2ZT.js","assets/dist-CVPAM7_G.js","assets/duel-LXW7bH6O.js","assets/instrument-sans-Cm1bVu8-.js","assets/instrument-sans-_-DRIdT8.css","assets/keyboard-CF7OLt8T.js","assets/main-0s7KXdEY.css","assets/main-3upoqYPn.js","assets/melody-B-grjK1E.js","assets/practice-CkRMHqFP.css","assets/practice-D4pu7DxV.js","assets/puzzles-Bi_pa1Oq.js","assets/questions-CKrSDN42.js","assets/random-CKQTcKNu.js","assets/react-yghMKqPI.js","assets/rolldown-runtime-XKyaHtl9.js","assets/rounds-DVUw5w4f.js","assets/scales-aexqJG9c.js","assets/schedule-DSIgM5Yp.js","assets/serverError-CRa6eI2t.js","assets/settings-BXeXtWB2.js","assets/store-CDoAIUOt.js","assets/take-52lmhm-l.js","assets/typeInfo-HbB4ziWL.js","assets/ui-Bn6k94P8.js"];
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
