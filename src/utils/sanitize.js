/**
 * Prometheus – Security Utilities
 * HTML sanitization and input validation.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HTML Escaping
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
};

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str – raw string (potentially user-supplied)
 * @returns {string} safe HTML string
 */
export function escapeHTML(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, ch => ESCAPE_MAP[ch]);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Numeric Sanitization
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Sanitize a numeric input: parse, clamp to [min, max], fallback if NaN.
 * @param {*} value - raw input
 * @param {object} opts
 * @param {number} [opts.min=-Infinity]
 * @param {number} [opts.max=Infinity]
 * @param {number} [opts.fallback=0]
 * @param {boolean} [opts.integer=false] – if true, round to integer
 * @returns {number}
 */
export function sanitizeNumber(value, { min = -Infinity, max = Infinity, fallback = 0, integer = false } = {}) {
    let n = parseFloat(value);
    if (isNaN(n) || !isFinite(n)) return fallback;
    n = Math.max(min, Math.min(max, n));
    return integer ? Math.round(n) : n;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Simulation Limits
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Hard limits to prevent CPU/memory abuse */
export const LIMITS = {
    MAX_ITERATIONS: 10000,
    MAX_POPULATION: 50000,
    MAX_TIME_HORIZON: 104,   // 2 years max
    MAX_COMPETITORS: 20,
    MIN_PRICE: 0.01,
    MAX_PRICE: 1_000_000,
    MIN_INVENTORY: 1,
    MAX_INVENTORY: 10_000_000,
};

/**
 * Enforce simulation config limits.
 * @param {object} config – raw config from UI
 * @returns {object} sanitized config
 */
export function sanitizeSimConfig(config) {
    return {
        iterations: sanitizeNumber(config.iterations, { min: 1, max: LIMITS.MAX_ITERATIONS, fallback: 500, integer: true }),
        agentCount: sanitizeNumber(config.agentCount, { min: 10, max: LIMITS.MAX_POPULATION, fallback: 5000, integer: true }),
        timeHorizonWeeks: sanitizeNumber(config.timeHorizonWeeks, { min: 1, max: LIMITS.MAX_TIME_HORIZON, fallback: 26, integer: true }),
        initialInventory: sanitizeNumber(config.initialInventory, { min: LIMITS.MIN_INVENTORY, max: LIMITS.MAX_INVENTORY, fallback: 45000, integer: true }),
        seed: sanitizeNumber(config.seed, { min: 0, max: 2147483647, fallback: 42, integer: true }),
    };
}

/**
 * Sanitize offer config values.
 * @param {object} offer
 * @returns {object}
 */
export function sanitizeOfferConfig(offer) {
    return {
        ...offer,
        basePrice: sanitizeNumber(offer.basePrice, { min: LIMITS.MIN_PRICE, max: LIMITS.MAX_PRICE, fallback: 100 }),
        cogs: sanitizeNumber(offer.cogs, { min: 0, max: LIMITS.MAX_PRICE, fallback: 50 }),
        marketingBudget: sanitizeNumber(offer.marketingBudget, { min: 0, max: 100_000_000, fallback: 100000 }),
        qualityIndex: sanitizeNumber(offer.qualityIndex, { min: 0, max: 1, fallback: 0.7 }),
    };
}
