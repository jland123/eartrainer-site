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
const BUILD = '8df8991b6a';
const ASSETS = ["assets/CosmeticPreview-D8DJooWR.js","assets/CustomSongs-QJW0iO5B.js","assets/DailyPage-Ca-W3RTN.css","assets/DailyPage-UdK8pqs9.js","assets/DailySongPage-BF6ykibb.js","assets/DailySongPage-CxzVmzXG.css","assets/DrumPad-B1Jtc14W.js","assets/DuelOfferCard-0M39RJkM.js","assets/DuelPage-BrnpZRJe.css","assets/DuelPage-CqclwhOb.js","assets/Hotkeys-DCszoj0Q.js","assets/Icon-CBeg3cC5.js","assets/InfoPages-beyKWX5m.js","assets/LeaguePage-CMDOb5rY.css","assets/LeaguePage-DDViH_DA.js","assets/NoteTiles-CXzPinzF.js","assets/OnlineLocked-CjX8-an2.js","assets/PianoKeyboard-BQyvnsbg.js","assets/PianoRoll-CE-vts6G.js","assets/PracticeHub-B4O3Ylx5.js","assets/PracticeLocked-CeWH-y1P.js","assets/ProPage-Ca-hWxgt.js","assets/ProParts-4fWanbck.js","assets/ProParts-CvY-Io-f.css","assets/ProfilePage-pOtkiOE8.js","assets/ProgressChart-O4xvDPoU.js","assets/ProgressPage-DntDyrXE.js","assets/RandomPractice-DG3Y7q_G.js","assets/RewardsPage-CafX-35n.js","assets/RoadmapPage-RHOYbe_k.js","assets/SectionPage-CtkusxKB.js","assets/SessionRunner-Bww5e_vQ.js","assets/SettingsForm-kFubaKrd.js","assets/SettingsPage-BpNAHJoE.js","assets/ShareGift-BYs3D1uy.js","assets/SongLibrary-BQ-gdEFn.js","assets/SongPractice-Cyyq_xGB.js","assets/StillFree-C8rNomvE.js","assets/TrainingPage-YtKaM_7s.js","assets/actions-STPqmerg.js","assets/appInfo-CVjq4h_z.js","assets/appStore-BCISTFe7.js","assets/contact-DP_lx1De.js","assets/content--83YF1gN.js","assets/cosmetics-DVP5VG1d.js","assets/dailySchedule-Nt-PpuwX.js","assets/dist-CVPAM7_G.js","assets/instrument-sans-Chlbrycc.css","assets/instrument-sans-D0OXMkCW.js","assets/key-cW5v7nxm.js","assets/keyboard-BAH0rOj1.js","assets/main-CbiFolnb.js","assets/main-Dgucywlm.css","assets/matchEar-ynbjapK4.js","assets/practice-8FL5g0Ag.css","assets/practiceLimit-oNYlLriG.js","assets/presets-BhSxaU80.js","assets/price-BhTleGDx.js","assets/purchase-DoMEagu1.js","assets/react-yghMKqPI.js","assets/roadmap-CW38kKWw.js","assets/rolldown-runtime-XKyaHtl9.js","assets/rounds-CwVTinpX.js","assets/schedule-DWclCeEP.js","assets/serverError-mGOANtgM.js","assets/settings-CAoHJf1A.js","assets/survival-yyP8BDMp.js","assets/take-52lmhm-l.js","assets/typeInfo-Bi3G-WqT.js"];
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
