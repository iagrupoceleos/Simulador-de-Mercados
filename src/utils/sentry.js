/**
 * Prometheus – Sentry Error Monitoring Integration (SCOUT-008)
 * CDN-based lazy loading of Sentry SDK with configurable DSN.
 */

let sentryLoaded = false;
let SentrySDK = null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Sentry SDK Loader
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Lazy-load Sentry from CDN.
 */
async function loadSentrySDK() {
    if (sentryLoaded || typeof window.Sentry !== 'undefined') {
        SentrySDK = window.Sentry;
        return;
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://browser.sentry-cdn.com/8.48.0/bundle.min.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => {
            sentryLoaded = true;
            SentrySDK = window.Sentry;
            resolve();
        };
        script.onerror = () => reject(new Error('Failed to load Sentry SDK'));
        document.head.appendChild(script);
    });
}

/**
 * Initialize Sentry error monitoring.
 * @param {object} config
 * @param {string} config.dsn - Sentry DSN (get from sentry.io project settings)
 * @param {string} [config.environment='production']
 * @param {number} [config.sampleRate=1.0] - Error sample rate (0-1)
 * @param {string} [config.release] - App version
 */
export async function initSentry(config = {}) {
    try {
        await loadSentrySDK();

        if (!SentrySDK || !config.dsn) {
            console.warn('[Sentry] No DSN provided. Error monitoring disabled.');
            return false;
        }

        SentrySDK.init({
            dsn: config.dsn,
            environment: config.environment || (location.hostname === 'localhost' ? 'development' : 'production'),
            release: config.release || `prometheus@${getAppVersion()}`,
            sampleRate: config.sampleRate ?? 1.0,
            integrations: [
                SentrySDK.browserTracingIntegration?.() || null,
            ].filter(Boolean),
            tracesSampleRate: 0.2,
            beforeSend(event) {
                // Scrub sensitive data
                if (event.request?.cookies) delete event.request.cookies;
                return event;
            },
        });

        // Set default tags
        SentrySDK.setTag('app', 'prometheus');
        SentrySDK.setTag('locale', document.documentElement.lang || 'es');

        console.info('[Sentry] ✅ Initialized successfully');
        return true;
    } catch (err) {
        console.warn('[Sentry] Init failed:', err.message);
        return false;
    }
}

/**
 * Capture an error in Sentry.
 * @param {Error} error
 * @param {object} [context] - Additional context
 */
export function captureError(error, context = {}) {
    if (!SentrySDK) {
        console.error('[Sentry:offline]', error);
        return;
    }

    SentrySDK.withScope((scope) => {
        if (context.module) scope.setTag('module', context.module);
        if (context.action) scope.setTag('action', context.action);
        if (context.extra) scope.setExtras(context.extra);
        if (context.level) scope.setLevel(context.level);
        SentrySDK.captureException(error);
    });
}

/**
 * Capture a message.
 * @param {string} message
 * @param {'info'|'warning'|'error'} [level='info']
 */
export function captureMessage(message, level = 'info') {
    if (!SentrySDK) {
        console.log(`[Sentry:offline][${level}]`, message);
        return;
    }
    SentrySDK.captureMessage(message, level);
}

/**
 * Set user context for error tracking.
 * @param {object} user - { id, email, username }
 */
export function setUser(user) {
    if (SentrySDK) SentrySDK.setUser(user);
}

/**
 * Add a breadcrumb for debugging context.
 * @param {string} category
 * @param {string} message
 * @param {object} [data]
 */
export function addBreadcrumb(category, message, data) {
    if (SentrySDK) {
        SentrySDK.addBreadcrumb({ category, message, data, level: 'info' });
    }
}

/**
 * Check if Sentry is active.
 */
export function isSentryActive() {
    return sentryLoaded && !!SentrySDK;
}

function getAppVersion() {
    return '2.0.0'; // Sync with package.json
}
