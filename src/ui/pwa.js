/**
 * Prometheus – PWA Support (DEV-005)
 * Service worker registration and install prompt handling.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Service Worker Registration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let deferredPrompt = null;
let registration = null;

/**
 * Register the service worker and handle install prompt.
 * @param {string} [swPath='/sw.js']
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function initPWA(swPath = '/sw.js') {
    if (!('serviceWorker' in navigator)) {
        console.warn('PWA: Service Workers not supported');
        return null;
    }

    try {
        registration = await navigator.serviceWorker.register(swPath, { scope: '/' });
        console.log('[PWA] Service Worker registered:', registration.scope);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'activated') {
                        console.log('[PWA] New version available');
                        dispatchEvent(new CustomEvent('pwa:update-available'));
                    }
                });
            }
        });
    } catch (err) {
        console.warn('[PWA] SW registration failed:', err);
    }

    // Capture install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        dispatchEvent(new CustomEvent('pwa:install-available'));
    });

    return registration;
}

/**
 * Trigger the install prompt.
 * @returns {Promise<boolean>} true if accepted
 */
export async function promptInstall() {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return outcome === 'accepted';
}

/**
 * Check if app is installed (standalone mode).
 */
export function isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
}

/**
 * Get PWA status.
 */
export function getPWAStatus() {
    return {
        swSupported: 'serviceWorker' in navigator,
        registered: registration !== null,
        installAvailable: deferredPrompt !== null,
        installed: isInstalled(),
    };
}
