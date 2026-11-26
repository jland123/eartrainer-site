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
const BUILD = '4635d2f359';
const ASSETS = ["assets/CosmeticPreview-COs2P1fk.js","assets/CustomSongs-U_Vcp-eW.js","assets/DailyPage-CJgKylfU.js","assets/DailyPage-Ca-W3RTN.css","assets/DailySongPage-C0fh64Tn.js","assets/DailySongPage-CxzVmzXG.css","assets/DrumPad-1OZ-mAO7.js","assets/DuelOfferCard-CbNwkTBQ.js","assets/DuelPage-BT2a0JZy.js","assets/DuelPage-BrnpZRJe.css","assets/Hotkeys-Dzeg3biL.js","assets/Icon-CBeg3cC5.js","assets/InfoPages-8wC4nPdk.js","assets/LeaguePage-CMDOb5rY.css","assets/LeaguePage-Dcj4EBVo.js","assets/NoteTiles-BS0FyMvr.js","assets/OnlineLocked-kWpaPOXK.js","assets/PianoKeyboard-D9pYAllx.js","assets/PianoRoll-CTeuePCs.js","assets/PracticeHub-BCAKubnX.js","assets/PracticeLocked-CiTcthjF.js","assets/ProPage-NCPpiNEa.js","assets/ProParts-C7HaawUJ.js","assets/ProParts-CvY-Io-f.css","assets/ProfilePage-BhOTod6B.js","assets/ProgressChart-BIXCgMmF.js","assets/ProgressPage-4xkhVK4D.js","assets/RandomPractice-NBGgsMqv.js","assets/RewardsPage-8MaQRZx7.js","assets/RoadmapPage-DVeM5xfP.js","assets/SectionPage-BGghggLY.js","assets/SessionRunner-CjI7omMb.js","assets/SettingsForm-DpDsp2DN.js","assets/SettingsPage-q2MFoAp_.js","assets/ShareGift-Btmryr3S.js","assets/SongLibrary-Cv3UOjSd.js","assets/SongPractice-DGkRixjH.js","assets/StillFree-CHJdLJN-.js","assets/TrainingPage-Bg09djz3.js","assets/actions-C-h5j5WY.js","assets/appInfo-CVjq4h_z.js","assets/appStore-EmstcXXn.js","assets/contact-DP_lx1De.js","assets/content--83YF1gN.js","assets/cosmetics-bnejX6z9.js","assets/dailySchedule-Nt-PpuwX.js","assets/dist-CVPAM7_G.js","assets/instrument-sans-Chlbrycc.css","assets/instrument-sans-D0OXMkCW.js","assets/key-cW5v7nxm.js","assets/keyboard-BAH0rOj1.js","assets/main-B6TLJNcy.css","assets/main-DIo3QrBI.js","assets/matchEar-h3cQfHB5.js","assets/practice-8FL5g0Ag.css","assets/practiceLimit-CKKHhYKZ.js","assets/presets-BhSxaU80.js","assets/price-BhTleGDx.js","assets/purchase-B14IkdjO.js","assets/react-yghMKqPI.js","assets/roadmap-CW38kKWw.js","assets/rolldown-runtime-XKyaHtl9.js","assets/rounds-CwVTinpX.js","assets/schedule-DWclCeEP.js","assets/serverError-BJ9rOwnK.js","assets/settings-CAoHJf1A.js","assets/survival-yyP8BDMp.js","assets/take-52lmhm-l.js","assets/typeInfo-Bi3G-WqT.js","assets/usage-BTBZ0EyO.js"];
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
