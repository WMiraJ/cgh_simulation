// Based off of https://github.com/pwa-builder/PWABuilder/blob/main/docs/service-worker.js[cite: 1]

/*
  Welcome to our basic Service Worker! This Service Worker offers a basic offline experience
  while also being easily customizeable. You can add in your own code to implement the capabilities
  listed below, or change anything else you would like.[cite: 1]
*/

const PWA_CACHE = "pwa-cache"; //[cite: 1]
const ASSET_CACHE = 'cgh-assets-v1'; //[cite: 1]

const HOSTNAME_WHITELIST = [
    self.location.hostname, //[cite: 1]
    'aframe.io', //[cite: 1]
    'supereggbert.github.io', // Added third-party script source
    'unpkg.com', //[cite: 1]
    'cdn.jsdelivr.net', //[cite: 1]
    'fonts.gstatic.com', //[cite: 1]
    'fonts.googleapis.com' //[cite: 1]
];

const PRECACHE_ASSETS = [
    // --- 3D Models ---[cite: 1]
    'assets/elevator.final.glb', //[cite: 1]
    'assets/main_char.opt.glb', //[cite: 1]
    'assets/NPCs/NPC_Sophie.opt.glb', //[cite: 1]
    'assets/NPCs/NPC_Bryce.opt.glb', //[cite: 1]
    'assets/NPCs/NPC_Jody.opt.glb', //[cite: 1]
    'assets/NPCs/NPC_Joe.opt.glb', //[cite: 1]
    'assets/NPCs/NPC_Josh.opt.glb', //[cite: 1]
    'assets/NPCs/NPC_Louise.opt.glb', //[cite: 1]
    'assets/NPCs/NPC_Martha.opt.glb', //[cite: 1]
    'assets/NPCs/NPC_Megan.opt.glb', //[cite: 1]

    // --- Backgrounds & Textures ---[cite: 1]
    'assets/floor-scroll.png', //[cite: 1]
    'assets/first-floor-lobby.png', //[cite: 1]
    'assets/lobby-environment.png', //[cite: 1]
    'assets/hdb-view-lowest.png', //[cite: 1]
    'assets/hdb-view-lower.png', //[cite: 1]
    'assets/hdb-view-middle-low.png', //[cite: 1]
    'assets/hdb-view-middle-up.png', //[cite: 1]
    'assets/hdb-view-upper.png', //[cite: 1]
    'assets/hdb-view-uppest.png', //[cite: 1]
    'assets/hdb-view-fifty.png', //[cite: 1]
    'assets/poster.jpg', //[cite: 1]

    // --- Sounds ---[cite: 1]
    'assets/sounds/LiftMoving.mp3', //[cite: 1]
    'assets/sounds/DoorOpen.mp3', //[cite: 1]
    'assets/sounds/DoorClose.mp3', //[cite: 1]
    'assets/sounds/Ding.mp3', //[cite: 1]
    'assets/sounds/Voice_GoingUp.mp3', //[cite: 1]
    'assets/sounds/Voice_GoingDown.mp3', //[cite: 1]
    'assets/sounds/Voice_DoorsClosing.mp3', //[cite: 1]
    
    // --- UI Elements (Added) ---
    'assets/UI/cue-start.png',
    'assets/UI/cue-warning.png',
    
    // --- Icons ---[cite: 1]
    'favicon_io/apple-touch-icon.png', //[cite: 1]
    'favicon_io/favicon-32x32.png', //[cite: 1]
    'favicon_io/favicon-16x16.png' //[cite: 1]
];

// The Util Function to hack URLs of intercepted requests[cite: 1]
const getFixedUrl = (req) => {
    var now = Date.now() //[cite: 1]
    var url = new URL(req.url) //[cite: 1]

    // 1. fixed http URL[cite: 1]
    url.protocol = self.location.protocol //[cite: 1]

    // 2. add query for caching-busting.[cite: 1]
    if (url.hostname === self.location.hostname) {
        url.search += (url.search ? '&' : '?') + 'cache-bust=' + now //[cite: 1]
    }
    return url.href //[cite: 1]
}

/**
 *  @Lifecycle Install
 *  Precache all core binary assets individually to prevent atomic failure.
 */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(ASSET_CACHE)
            .then(cache => {
                // Use Promise.allSettled so one 404 doesn't break the entire cache loop
                return Promise.allSettled(
                    PRECACHE_ASSETS.map(url =>
                        fetch(url).then(response => {
                            if (!response.ok) throw new Error(`HTTP error ${response.status} fetching ${url}`);
                            return cache.put(url, response);
                        }).catch(err => console.warn('[SW] Precache skipped for:', url, err))
                    )
                );
            })
            .then(() => self.skipWaiting()) //[cite: 1]
    );
});

/**
 *  @Lifecycle Activate
 *  New one activated when old isnt being used.[cite: 1]
 */
self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim()); //[cite: 1]
});

/**
 *  @Functional Fetch
 *  All network requests are being intercepted here.[cite: 1]
 */
self.addEventListener('fetch', event => {
    // 0. Intercept HEAD requests (used by A-Frame material loaders)
    if (event.request.method === 'HEAD') {
        event.respondWith(
            caches.match(event.request).then(cached => {
                // Return a dummy 200 OK response if the asset exists in cache
                return cached ? new Response(null, { status: 200, headers: cached.headers }) : fetch(event.request);
            })
        );
        return;
    }

    // Cache API only supports GET. Let everything else pass straight through.[cite: 1]
    if (event.request.method !== 'GET') {
        return; //[cite: 1]
    }

    // 1. Ignore media Range requests entirely.[cite: 1]
    if (event.request.headers.has('range')) {
        return;  //[cite: 1]
    }

    const url = new URL(event.request.url); //[cite: 1]

    // 2. Binary Assets: Cache-first, no re-fetch race.[cite: 1]
    if (url.pathname.includes('/assets/')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                return cached || fetch(event.request).then(resp => { //[cite: 1]
                    if (resp.ok) { //[cite: 1]
                        const responseToCache = resp.clone(); //[cite: 1]
                        caches.open(ASSET_CACHE).then(c => c.put(event.request, responseToCache)); //[cite: 1]
                    }
                    return resp; //[cite: 1]
                });
            })
        );
        return;  //[cite: 1]
    }

    // 3. App Shell: Stale-while-revalidate[cite: 1]
    // Check if the hostname matches exactly OR is a subdomain of a whitelisted host
    const isWhitelisted = HOSTNAME_WHITELIST.some(host => 
        url.hostname === host || url.hostname.endsWith('.' + host)
    );

    if (isWhitelisted) {
        event.respondWith(
            caches.match(event.request).then(cached => { //[cite: 1]
                const networkFetch = fetch(event.request).then(resp => { //[cite: 1]
                    // Never cache opaque cross-origin responses[cite: 1]
                    if (resp.ok) { //[cite: 1]
                        const responseToCache = resp.clone(); //[cite: 1]
                        caches.open(PWA_CACHE).then(cache => cache.put(event.request, responseToCache)); //[cite: 1]
                    }
                    return resp; //[cite: 1]
                }).catch(_ => { /* eat any errors, like being offline */ }); //[cite: 1]

                return cached || networkFetch; //[cite: 1]
            })
        );
    }
});