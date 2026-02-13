/**
 * Prometheus – Sentry Error Monitoring Integration (SCOUT-008)
 * Works with the Sentry Loader Script pre-loaded in index.html.
 * The loader auto-initializes Sentry with the DSN baked into the script URL.
 * This module provides helper wrappers for capturing errors and context.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Sentry SDK Reference (loaded via index.html)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getSentry() {
    return typeof window !== 'undefined' ? window.Sentry : null;
}

/**
 * Configure Sentry with additional options after loader init.
 * Call this from main.js on app startup.
 * @param {object} [config]
 */
export function configureSentry(config = {}) {
    const Sentry = getSentry();
    if (!Sentry) {
        console.warn('[Sentry] SDK not loaded. Error monitoring disabled.');
        return false;
    }

    // Set default tags
    Sentry.setTag('app', 'prometheus');
    Sentry.setTag('version', '2.0.0');
    Sentry.setTag('locale', document.documentElement.lang || 'es');

    if (config.environment) Sentry.setTag('environment', config.environment);
    if (config.release) Sentry.setTag('release', config.release);

    console.info('[Sentry] ✅ Configured successfully');
    return true;
}

/**
 * Capture an error in Sentry.
 * @param {Error} error
 * @param {object} [context] - { module, action, extra, level }
 */
export function captureError(error, context = {}) {
    const Sentry = getSentry();
    if (!Sentry) {
        console.error('[Sentry:offline]', error);
        return;
    }

    Sentry.withScope((scope) => {
        if (context.module) scope.setTag('module', context.module);
        if (context.action) scope.setTag('action', context.action);
        if (context.extra) scope.setExtras(context.extra);
        if (context.level) scope.setLevel(context.level);
        Sentry.captureException(error);
    });
}

/**
 * Capture a message.
 * @param {string} message
 * @param {'info'|'warning'|'error'} [level='info']
 */
export function captureMessage(message, level = 'info') {
    const Sentry = getSentry();
    if (!Sentry) {
        console.log(`[Sentry:offline][${level}]`, message);
        return;
    }
    Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking.
 * @param {object} user - { id, email, username }
 */
export function setUser(user) {
    const Sentry = getSentry();
    if (Sentry) Sentry.setUser(user);
}

/**
 * Add a breadcrumb for debugging context.
 * @param {string} category
 * @param {string} message
 * @param {object} [data]
 */
export function addBreadcrumb(category, message, data) {
    const Sentry = getSentry();
    if (Sentry) {
        Sentry.addBreadcrumb({ category, message, data, level: 'info' });
    }
}

/**
 * Check if Sentry is active.
 */
export function isSentryActive() {
    return !!getSentry();
}
