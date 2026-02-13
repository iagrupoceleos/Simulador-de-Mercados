/**
 * Prometheus – Application Logger (PROD-001)
 * Structured logging with levels, timestamps, and sessionId for debugging.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Logger
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const LEVEL_LABELS = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
const LEVEL_COLORS = ['#666', '#06b6d4', '#f59e0b', '#ef4444'];

let currentLevel = LOG_LEVELS.INFO;
let logBuffer = [];
const MAX_BUFFER = 500;
const SESSION_ID = `S_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

/**
 * Set the minimum log level.
 * @param {'DEBUG'|'INFO'|'WARN'|'ERROR'} level
 */
export function setLogLevel(level) {
    currentLevel = LOG_LEVELS[level] ?? LOG_LEVELS.INFO;
}

/**
 * Get current session ID.
 */
export function getSessionId() { return SESSION_ID; }

/**
 * Core log function.
 * @param {number} level
 * @param {string} module
 * @param {string} message
 * @param {object} [data]
 */
function log(level, module, message, data) {
    if (level < currentLevel) return;

    const entry = {
        timestamp: new Date().toISOString(),
        level: LEVEL_LABELS[level],
        session: SESSION_ID,
        module,
        message,
        ...(data && { data }),
    };

    logBuffer.push(entry);
    if (logBuffer.length > MAX_BUFFER) logBuffer.shift();

    const style = `color:${LEVEL_COLORS[level]}; font-weight:${level >= 2 ? 'bold' : 'normal'}`;
    const prefix = `[${entry.level}][${module}]`;

    if (level >= LOG_LEVELS.ERROR) {
        console.error(`%c${prefix}`, style, message, data || '');
    } else if (level >= LOG_LEVELS.WARN) {
        console.warn(`%c${prefix}`, style, message, data || '');
    } else {
        console.log(`%c${prefix}`, style, message, data || '');
    }
}

/**
 * Create a logger instance scoped to a module.
 * @param {string} moduleName
 * @returns {object} { debug, info, warn, error, time }
 */
export function createLogger(moduleName) {
    return {
        debug: (msg, data) => log(LOG_LEVELS.DEBUG, moduleName, msg, data),
        info: (msg, data) => log(LOG_LEVELS.INFO, moduleName, msg, data),
        warn: (msg, data) => log(LOG_LEVELS.WARN, moduleName, msg, data),
        error: (msg, data) => log(LOG_LEVELS.ERROR, moduleName, msg, data),

        /**
         * Time a function execution.
         * @param {string} label
         * @param {Function} fn
         * @returns {*} result of fn
         */
        time: (label, fn) => {
            const start = performance.now();
            const result = fn();
            const elapsed = performance.now() - start;
            log(LOG_LEVELS.INFO, moduleName, `⏱ ${label}: ${elapsed.toFixed(1)}ms`);
            return result;
        },

        /**
         * Time an async function execution.
         * @param {string} label
         * @param {Function} fn
         * @returns {Promise<*>}
         */
        timeAsync: async (label, fn) => {
            const start = performance.now();
            const result = await fn();
            const elapsed = performance.now() - start;
            log(LOG_LEVELS.INFO, moduleName, `⏱ ${label}: ${elapsed.toFixed(1)}ms`);
            return result;
        },
    };
}

/**
 * Get log buffer for debugging / export.
 * @param {string} [minLevel='DEBUG']
 * @returns {object[]}
 */
export function getLogBuffer(minLevel = 'DEBUG') {
    const min = LOG_LEVELS[minLevel] ?? 0;
    return logBuffer.filter(e => LOG_LEVELS[e.level] >= min);
}

/**
 * Clear log buffer.
 */
export function clearLogBuffer() { logBuffer = []; }

/**
 * Export logs as downloadable JSON.
 */
export function exportLogs() {
    const blob = new Blob([JSON.stringify(logBuffer, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prometheus_logs_${SESSION_ID}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
