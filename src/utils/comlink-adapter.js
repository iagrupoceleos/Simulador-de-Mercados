/**
 * Prometheus – Comlink Web Worker Adapter (SCOUT-001)
 * Simplifies Worker communication using Comlink library.
 * Falls back to native postMessage if Comlink fails to load.
 */

let comlinkLoaded = false;
let Comlink = null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Comlink Loader
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Lazy-load Comlink from CDN.
 */
async function loadComlink() {
    if (comlinkLoaded || typeof window.Comlink !== 'undefined') {
        Comlink = window.Comlink;
        return true;
    }

    try {
        const module = await import('https://unpkg.com/comlink@4.4.2/dist/esm/comlink.mjs');
        Comlink = module;
        comlinkLoaded = true;
        return true;
    } catch (err) {
        console.warn('[Comlink] Failed to load, using native postMessage fallback:', err.message);
        return false;
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Comlink Worker Factory
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Create a Comlink-wrapped worker with typed methods.
 * Falls back to native postMessage interface.
 * @param {string} workerUrl - URL to worker script
 * @returns {Promise<{proxy: Proxy, worker: Worker, terminate: Function}>}
 */
export async function createComlinkedWorker(workerUrl) {
    const worker = new Worker(workerUrl, { type: 'module' });
    const loaded = await loadComlink();

    if (loaded && Comlink) {
        const proxy = Comlink.wrap(worker);
        return {
            proxy,
            worker,
            terminate: () => { proxy[Comlink.releaseProxy](); worker.terminate(); },
        };
    }

    // Fallback: native postMessage interface
    return {
        proxy: createNativeProxy(worker),
        worker,
        terminate: () => worker.terminate(),
    };
}

/**
 * Expose functions from inside a worker via Comlink.
 * Call this inside the worker file.
 * @param {object} api - Object with methods to expose
 */
export async function exposeWorkerAPI(api) {
    const loaded = await loadComlink();
    if (loaded && Comlink) {
        Comlink.expose(api);
    } else {
        // Fallback: handle messages natively
        self.addEventListener('message', async (event) => {
            const { method, args, id } = event.data;
            try {
                const result = await api[method](...(args || []));
                self.postMessage({ id, result });
            } catch (error) {
                self.postMessage({ id, error: error.message });
            }
        });
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Native PostMessage Proxy (fallback)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function createNativeProxy(worker) {
    let callId = 0;
    const pending = new Map();

    worker.addEventListener('message', (event) => {
        const { id, result, error } = event.data;
        const resolver = pending.get(id);
        if (resolver) {
            pending.delete(id);
            if (error) resolver.reject(new Error(error));
            else resolver.resolve(result);
        }
    });

    return new Proxy({}, {
        get: (_, method) => {
            return (...args) => new Promise((resolve, reject) => {
                const id = callId++;
                pending.set(id, { resolve, reject });
                worker.postMessage({ method, args, id });
            });
        },
    });
}

/**
 * Check if Comlink is active.
 */
export function isComlinkActive() {
    return comlinkLoaded && !!Comlink;
}
