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
    'assets/elevator.glb',
    'assets/main_char.glb',
    'assets/NPCs/NPC_Sophie.glb',
    'assets/NPCs/NPC_Bryce.glb',
    'assets/NPCs/NPC_Jody.glb',
    'assets/NPCs/NPC_Joe.glb',
    'assets/NPCs/NPC_Josh.glb',
    'assets/NPCs/NPC_Louise.glb',
    'assets/NPCs/NPC_Martha.glb',
    'assets/NPCs/NPC_Megan.glb'
    // + Add backgrounds, posters, sounds here
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
    // 1. Ignore media Range requests entirely. 
    // Caching partial media chunks causes cache poisoning and clone errors.
    if (event.request.headers.has('range')) {
        return; 
    }

    const url = new URL(event.request.url);

    // 2. Binary Assets: Cache-first, no re-fetch race.
    if (url.pathname.includes('/assets/')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                return cached || fetch(event.request).then(resp => {
                    // Clone sequentially BEFORE returning the response
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
                // Fetch from network to revalidate the cache
                const networkFetch = fetch(event.request).then(resp => {
                    // Clone sequentially BEFORE returning
                    const responseToCache = resp.clone();
                    
                    caches.open(PWA_CACHE).then(cache => {
                        if (resp.ok || resp.type === 'opaque') {
                            cache.put(event.request, responseToCache);
                        }
                    });
                    
                    return resp;
                }).catch(_ => { /* eat any errors, like being offline */ });

                // Return the cached response immediately if we have it, 
                // otherwise wait for the network fetch to complete.
                return cached || networkFetch;
            })
        );
    }
});