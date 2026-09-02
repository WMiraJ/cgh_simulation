// Based off of https://github.com/pwa-builder/PWABuilder/blob/main/docs/service-worker.js

/*
  Welcome to our basic Service Worker! This Service Worker offers a basic offline experience
  while also being easily customizeable. You can add in your own code to implement the capabilities
  listed below, or change anything else you would like.
*/

const PWA_CACHE = "pwa-cache";
const ASSET_CACHE = 'cgh-assets-v1';

const HOSTNAME_WHITELIST = [
    self.location.hostname,
    'aframe.io',
    'unpkg.com',
    'cdn.jsdelivr.net',
    'fonts.gstatic.com',
    'fonts.googleapis.com'
];

const PRECACHE_ASSETS = [
    // --- 3D Models ---
    'assets/elevator.final.glb',
    'assets/main_char.opt.glb',
    'assets/NPCs/NPC_Sophie.opt.glb',
    'assets/NPCs/NPC_Bryce.opt.glb',
    'assets/NPCs/NPC_Jody.opt.glb',
    'assets/NPCs/NPC_Joe.opt.glb',
    'assets/NPCs/NPC_Josh.opt.glb',
    'assets/NPCs/NPC_Louise.opt.glb',
    'assets/NPCs/NPC_Martha.opt.glb',
    'assets/NPCs/NPC_Megan.opt.glb',

    // --- Backgrounds & Textures ---
    'assets/floor-scroll.png',
    'assets/first-floor-lobby.png',
    'assets/lobby-environment.png',
    'assets/hdb-view-lowest.png',
    'assets/hdb-view-lower.png',
    'assets/hdb-view-middle-low.png',
    'assets/hdb-view-middle-up.png',
    'assets/hdb-view-upper.png',
    'assets/hdb-view-uppest.png',
    'assets/hdb-view-fifty.png',
    'assets/poster.jpg',

    // --- Sounds ---
    'assets/sounds/LiftMoving.mp3',
    'assets/sounds/DoorOpen.mp3',
    'assets/sounds/DoorClose.mp3',
    'assets/sounds/Ding.mp3',
    'assets/sounds/Voice_GoingUp.mp3',
    'assets/sounds/Voice_GoingDown.mp3',
    'assets/sounds/Voice_DoorsClosing.mp3',
    
    // --- Icons ---
    'favicon_io/apple-touch-icon.png',
    'favicon_io/favicon-32x32.png',
    'favicon_io/favicon-16x16.png'
];

// The Util Function to hack URLs of intercepted requests
const getFixedUrl = (req) => {
    var now = Date.now()
    var url = new URL(req.url)

    // 1. fixed http URL
    url.protocol = self.location.protocol

    // 2. add query for caching-busting.
    if (url.hostname === self.location.hostname) {
        url.search += (url.search ? '&' : '?') + 'cache-bust=' + now
    }
    return url.href
}

/**
 *  @Lifecycle Install
 *  Precache all core binary assets immediately.
 */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(ASSET_CACHE)
            .then(cache => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

/**
 *  @Lifecycle Activate
 *  New one activated when old isnt being used.
 */
self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

/**
 *  @Functional Fetch
 *  All network requests are being intercepted here.
 */
self.addEventListener('fetch', event => {
    // 0. Cache API only supports GET. Let everything else (HEAD, POST, etc.)
    //    pass straight through — fixes the "'HEAD' is unsupported" crash.
    if (event.request.method !== 'GET') {
        return;
    }

    // 1. Ignore media Range requests entirely.
    if (event.request.headers.has('range')) {
        return; 
    }

    const url = new URL(event.request.url);

    // 2. Binary Assets: Cache-first, no re-fetch race.
    if (url.pathname.includes('/assets/')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                return cached || fetch(event.request).then(resp => {
                    if (resp.ok) {
                        const responseToCache = resp.clone();
                        caches.open(ASSET_CACHE).then(c => c.put(event.request, responseToCache));
                    }
                    return resp;
                });
            })
        );
        return; 
    }

    // 3. App Shell: Stale-while-revalidate
    if (HOSTNAME_WHITELIST.indexOf(url.hostname) > -1) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                const networkFetch = fetch(event.request).then(resp => {
                    // Never cache opaque cross-origin responses: the same URL can be
                    // fetched elsewhere in a different mode (e.g. htmlembed's internal
                    // `fetch()` needs a readable body), and an opaque response cached
                    // under one mode will get wrongly served to the other, which Chrome
                    // hard-rejects. Only cache responses we know are safe to reuse.
                    if (resp.ok) {
                        const responseToCache = resp.clone();
                        caches.open(PWA_CACHE).then(cache => cache.put(event.request, responseToCache));
                    }
                    return resp;
                }).catch(_ => { /* eat any errors, like being offline */ });

                return cached || networkFetch;
            })
        );
    }
});