// Prometheus PWA – Advanced Service Worker (PWA-002)
// Versioned cache with offline-first for assets, network-first for HTML/API

const CACHE_VERSION = 'prometheus-v2';
const MAX_CACHE_ENTRIES = 100;

// Assets to precache on install
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Install – Precache core assets
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Activate – Purge old caches
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) =>
            Promise.all(
                names
                    .filter((n) => n.startsWith('prometheus-') && n !== CACHE_VERSION)
                    .map((n) => caches.delete(n))
            )
        ).then(() => self.clients.claim())
    );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Fetch – Strategy-based caching
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip API calls (network-only)
    if (url.pathname.startsWith('/api/')) return;

    // Skip WebSocket upgrades
    if (request.headers.get('upgrade') === 'websocket') return;

    // HTML pages → Network-first (always get latest)
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Static assets (JS, CSS, images, fonts) → Cache-first
    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Everything else → Stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Caching Strategies
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Cache-first: Return cached version, fetch only if not cached.
 */
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_VERSION);
            cache.put(request, response.clone());
            await trimCache(cache);
        }
        return response;
    } catch (_) {
        return offlineFallback();
    }
}

/**
 * Network-first: Try network, fall back to cache.
 */
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_VERSION);
            cache.put(request, response.clone());
        }
        return response;
    } catch (_) {
        const cached = await caches.match(request);
        return cached || offlineFallback();
    }
}

/**
 * Stale-while-revalidate: Return cache immediately, update in background.
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
            cache.put(request, response.clone());
            trimCache(cache);
        }
        return response;
    }).catch(() => cached);

    return cached || fetchPromise;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function isStaticAsset(pathname) {
    return /\.(js|css|woff2?|ttf|eot|png|jpg|jpeg|gif|svg|ico|webp)$/i.test(pathname);
}

function offlineFallback() {
    return new Response(
        `<!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Prometheus – Sin conexión</title>
        <style>
            body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
                   background:#0f0f1a; color:#a0aec0; font-family:Inter,system-ui,sans-serif; text-align:center; }
            .offline { padding:2rem; }
            .offline h1 { font-size:3rem; margin:0 0 1rem; }
            .offline p { font-size:1.1rem; opacity:0.7; }
            .offline button { margin-top:1.5rem; padding:10px 24px; border-radius:8px; border:1px solid #06b6d4;
                              background:transparent; color:#06b6d4; cursor:pointer; font-size:1rem; }
            .offline button:hover { background:#06b6d422; }
        </style>
        </head>
        <body>
            <div class="offline">
                <h1>📡</h1>
                <h2>Sin conexión</h2>
                <p>Prometheus necesita conexión para cargar por primera vez.<br/>
                   Una vez cargada, la app funciona offline.</p>
                <button onclick="location.reload()">Reintentar</button>
            </div>
        </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
}

/**
 * Trim cache to MAX_CACHE_ENTRIES using LRU eviction.
 */
async function trimCache(cache) {
    const keys = await cache.keys();
    if (keys.length > MAX_CACHE_ENTRIES) {
        const excess = keys.length - MAX_CACHE_ENTRIES;
        for (let i = 0; i < excess; i++) {
            await cache.delete(keys[i]);
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Background Sync Stub (for future backend)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-scenarios') {
        event.waitUntil(
            // Future: sync local scenarios to cloud
            Promise.resolve()
        );
    }
});
