/**
 * Prometheus Engine – Error Tracking Module (ERR-001)
 * Lightweight Sentry-style error capture without external deps.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Error Tracker
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MAX_ERRORS = 100;
const errors = [];
let isInitialized = false;

/**
 * @typedef {object} CapturedError
 * @property {string} message
 * @property {string} [stack]
 * @property {string} type
 * @property {string} timestamp
 * @property {string} [source]
 * @property {number} [line]
 * @property {number} [col]
 * @property {object} [context]
 */

/**
 * Initialize global error tracking.
 * @param {object} [options]
 * @param {Function} [options.onError] - callback on each error
 * @param {boolean} [options.captureConsole=false] - capture console.error
 * @param {number} [options.maxErrors=100]
 */
export function initErrorTracking(options = {}) {
    if (isInitialized) return;
    isInitialized = true;

    const { onError, captureConsole = false } = options;

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
        const entry = {
            message: event.message || 'Unknown error',
            stack: event.error?.stack || '',
            type: 'runtime',
            timestamp: new Date().toISOString(),
            source: event.filename || '',
            line: event.lineno || 0,
            col: event.colno || 0,
        };
        addError(entry, onError);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        const entry = {
            message: event.reason?.message || String(event.reason),
            stack: event.reason?.stack || '',
            type: 'promise',
            timestamp: new Date().toISOString(),
        };
        addError(entry, onError);
    });

    // Optionally capture console.error
    if (captureConsole) {
        const originalError = console.error;
        console.error = (...args) => {
            const entry = {
                message: args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '),
                type: 'console',
                timestamp: new Date().toISOString(),
            };
            addError(entry, onError);
            originalError.apply(console, args);
        };
    }

    console.log('[ErrorTracker] Initialized — capturing runtime + promise errors');
}

function addError(entry, callback) {
    // Deduplicate by message
    if (errors.length > 0 && errors[errors.length - 1].message === entry.message) {
        errors[errors.length - 1].count = (errors[errors.length - 1].count || 1) + 1;
        return;
    }

    errors.push({ ...entry, count: 1 });
    if (errors.length > MAX_ERRORS) errors.shift();

    if (callback) callback(entry);
}

/**
 * Manually capture an error.
 * @param {Error|string} error
 * @param {object} [context]
 */
export function captureError(error, context) {
    const entry = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : '',
        type: 'manual',
        timestamp: new Date().toISOString(),
        context,
    };
    addError(entry);
}

/**
 * Get all captured errors.
 * @returns {CapturedError[]}
 */
export function getErrors() {
    return [...errors];
}

/**
 * Get error summary for reporting.
 */
export function getErrorSummary() {
    const byType = {};
    for (const err of errors) {
        byType[err.type] = (byType[err.type] || 0) + (err.count || 1);
    }

    return {
        total: errors.reduce((s, e) => s + (e.count || 1), 0),
        unique: errors.length,
        byType,
        recent: errors.slice(-5).map(e => ({ message: e.message, type: e.type, timestamp: e.timestamp })),
        firstError: errors[0] || null,
        lastError: errors[errors.length - 1] || null,
    };
}

/**
 * Clear captured errors.
 */
export function clearErrors() {
    errors.length = 0;
}

/**
 * Generate error report as downloadable text.
 */
export function downloadErrorReport() {
    const report = [
        `Prometheus Error Report`,
        `Generated: ${new Date().toISOString()}`,
        `Total errors: ${errors.length}`,
        '',
        ...errors.map((e, i) => [
            `#${i + 1} [${e.type}] ${e.timestamp}`,
            `  Message: ${e.message}`,
            e.source ? `  Source: ${e.source}:${e.line}:${e.col}` : '',
            e.stack ? `  Stack: ${e.stack.split('\n').slice(0, 3).join('\n    ')}` : '',
            e.count > 1 ? `  Occurrences: ${e.count}` : '',
            '',
        ].filter(Boolean).join('\n')),
    ].join('\n');

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prometheus-errors-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}
