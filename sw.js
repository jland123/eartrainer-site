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
const BUILD = 'd653cb70e8';
const ASSETS = ["assets/AchievementsPage-DrFSUs9q.js","assets/CosmeticPreview-CDwx_hNE.js","assets/CustomSongs-DUev1Qb3.js","assets/DailyAwardLink-BtQt2z2A.js","assets/DailyPage-Ca-W3RTN.css","assets/DailyPage-o74Qcwbi.js","assets/DailySongPage-CWiGQhwh.css","assets/DailySongPage-DzSRU5y5.js","assets/DrumPad-BkCHisDN.js","assets/DuelOfferCard-BaaoI01B.js","assets/DuelPage-1dWpgqer.css","assets/DuelPage-Dp_Gveyr.js","assets/Hotkeys-DBpVxUBB.js","assets/Icon-D3s6Bc-X.js","assets/InfoPages-tfgMF8vr.js","assets/LeaguePage-CMDOb5rY.css","assets/LeaguePage-YNjNe9Hu.js","assets/NoteTiles-CmW2BJuI.js","assets/OnlineLocked-DBt32Xc5.js","assets/PianoKeyboard-BRr2fxNI.js","assets/PianoRoll-DnNWkP2T.js","assets/PracticeHub-DEuEVS9e.js","assets/PracticeLocked-BLd9CEhg.js","assets/ProPage-KPQ2SAW7.js","assets/ProParts-BoxKXV52.css","assets/ProParts-DohFP6oP.js","assets/ProfilePage-9mwGljPz.js","assets/ProgressChart-0lYjDMKQ.js","assets/ProgressPage-BiMqcsCy.js","assets/RandomPractice-Bkkz0Dt2.js","assets/RewardsPage-CuUnR1l_.js","assets/RoadmapPage-BqkwGHRS.js","assets/SectionPage-C38Fjx6t.js","assets/SessionRunner-C06YvjRK.js","assets/SettingsForm-ATQUUQbs.js","assets/SettingsPage-D_PEab5K.js","assets/SongLibrary-C4vc-vux.js","assets/SongPractice-eZs51Ehp.js","assets/TrainingPage-DzSELetI.js","assets/actions-ClI-rtQb.js","assets/appInfo-DeskfDeg.js","assets/contact-DP_lx1De.js","assets/content-Ck1dMwTP.js","assets/cosmetics-ClaI2Lxe.js","assets/dailySchedule-CtoTuYbz.js","assets/dayClock-Clhe8rLx.js","assets/definitions-Chfkeu_N.js","assets/dist-CVPAM7_G.js","assets/instrument-sans-BqH64HvP.js","assets/instrument-sans-eJhuPpRc.css","assets/keyboard-oUnmYp1q.js","assets/main-CwqjbsXn.css","assets/main-DZIcGuWy.js","assets/matchEar-Cz0AEeGA.js","assets/practice-C8MdOlMe.js","assets/practice-CWXUm6fF.css","assets/practiceLimit-hycE2ESF.js","assets/puzzles-BTApbHLa.js","assets/react-yghMKqPI.js","assets/roadmap-D9kG3R9H.js","assets/rolldown-runtime-XKyaHtl9.js","assets/rounds-CepklpqL.js","assets/schedule-DWclCeEP.js","assets/settings-CU652jAr.js","assets/store-DdXJhnSR.js","assets/survival-CbjVVTx4.js","assets/take-52lmhm-l.js","assets/typeInfo-BqCxkK62.js"];
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
