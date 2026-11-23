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
const BUILD = '75cdd3ba14';
const ASSETS = ["assets/CosmeticPreview-jV4rO1PJ.js","assets/CustomSongs-CeZg14TR.js","assets/DailyPage-7Vn5BoY0.js","assets/DailyPage-Ca-W3RTN.css","assets/DailySongPage-CWiGQhwh.css","assets/DailySongPage-Cs9w7Suc.js","assets/DrumPad-BPHo3vGT.js","assets/DuelOfferCard-Dlms65DL.js","assets/DuelPage-1dWpgqer.css","assets/DuelPage-CNe6bWzX.js","assets/Hotkeys-7DHh-QUZ.js","assets/Icon-D3s6Bc-X.js","assets/InfoPages-Cc4F98-T.js","assets/LeaguePage-CMDOb5rY.css","assets/LeaguePage-DosjLjri.js","assets/NoteTiles-DbP9hAUh.js","assets/OnlineLocked-BIAv8bPq.js","assets/PianoKeyboard-CBD0PdwT.js","assets/PianoRoll-l0oI0GNP.js","assets/PracticeHub-CCYXtkLb.js","assets/PracticeLocked-CAdnhuh7.js","assets/ProPage-CWHsfPMm.js","assets/ProParts-CvY-Io-f.css","assets/ProParts-DpeFuUCg.js","assets/ProfilePage-CNCjLlZS.js","assets/ProgressChart-DbJF9rLX.js","assets/ProgressPage-D2Nl3DyI.js","assets/RandomPractice-DhvrSsiX.js","assets/RewardsPage-BRTSCdIJ.js","assets/RoadmapPage-B-zyl2JA.js","assets/SectionPage-D72v09rU.js","assets/SessionRunner-dj5JESBS.js","assets/SettingsForm-i_WpDF7A.js","assets/SettingsPage-hflFkV-e.js","assets/ShareGift-CuvbPsXZ.js","assets/SongLibrary-D3rVUCVc.js","assets/SongPractice-CY4nzX3p.js","assets/StillFree-BMLdHTq7.js","assets/TrainingPage-1v4OA-jF.js","assets/actions-zlj8Nius.js","assets/appInfo-DeskfDeg.js","assets/contact-DP_lx1De.js","assets/content-Bf-19zhF.js","assets/cosmetics-BbfZfQFd.js","assets/dailySchedule-BP4Ayfd8.js","assets/dist-CVPAM7_G.js","assets/instrument-sans-CYOl9_OE.js","assets/instrument-sans-DxwcYSkZ.css","assets/keyboard-Cgyvk5E-.js","assets/main-Ci7_nOzv.css","assets/main-DSF1Kbs1.js","assets/matchEar-BYoiWoeU.js","assets/practice-BRvO--cg.js","assets/practice-CWXUm6fF.css","assets/practiceLimit-CsHd4u5D.js","assets/price-BhTleGDx.js","assets/purchase-Cu_zaiQn.js","assets/puzzles-DXHEovQK.js","assets/react-yghMKqPI.js","assets/roadmap-B5aTHjXW.js","assets/rolldown-runtime-XKyaHtl9.js","assets/rounds-aN9g7B_i.js","assets/schedule-DWclCeEP.js","assets/settings-B7H-X4D0.js","assets/store-NF7-QWlT.js","assets/survival-Mw7NSic8.js","assets/take-52lmhm-l.js","assets/typeInfo-zzm6FEYF.js"];
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
