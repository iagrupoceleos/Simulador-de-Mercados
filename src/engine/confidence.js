/**
 * Prometheus Engine – Confidence Intervals for KPI Displays (DS-005)
 * Adds CI bands and uncertainty visualization helpers.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Confidence Interval Calculator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Z-values for common confidence levels */
const Z_VALUES = {
    0.80: 1.282,
    0.90: 1.645,
    0.95: 1.960,
    0.99: 2.576,
};

/**
 * Compute confidence interval from distribution stats.
 * @param {object} stats - from computeStats() (mean, std, n)
 * @param {number} [level=0.95] - confidence level
 * @returns {{ lower: number, upper: number, width: number, level: number }}
 */
export function confidenceInterval(stats, level = 0.95) {
    const z = Z_VALUES[level] || 1.960;
    const se = stats.std / Math.sqrt(stats.n || 1);
    const margin = z * se;

    return {
        lower: stats.mean - margin,
        upper: stats.mean + margin,
        width: margin * 2,
        level,
        margin,
        se,
    };
}

/**
 * Add confidence intervals to all KPI stats in MC results.
 * @param {object} mcResults - Monte Carlo aggregated results
 * @param {number} [level=0.95]
 * @returns {object} enriched results with `.ci` on each stat
 */
export function enrichWithCI(mcResults, level = 0.95) {
    if (!mcResults) return mcResults;

    const kpiKeys = ['sales', 'revenue', 'grossProfit', 'netProfit', 'roi', 'margin', 'inventoryRemaining', 'inventoryValue', 'unsoldPct'];

    const enriched = { ...mcResults };

    for (const key of kpiKeys) {
        if (enriched[key] && enriched[key].mean != null) {
            enriched[key] = {
                ...enriched[key],
                ci: confidenceInterval({
                    mean: enriched[key].mean,
                    std: enriched[key].std,
                    n: mcResults.iterations,
                }, level),
            };
        }
    }

    return enriched;
}

/**
 * Format a KPI value with its CI for display.
 * @param {number} value
 * @param {object} ci - from confidenceInterval
 * @param {object} [opts]
 * @returns {string} e.g. "$45,000 [±$2,100]" or "$45,000 ($42,900 – $47,100)"
 */
export function formatWithCI(value, ci, opts = {}) {
    const { format = 'short', locale = 'es-MX', currency = true } = opts;
    const fmt = (v) => currency
        ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)
        : new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v);

    if (format === 'short') {
        return `${fmt(value)} [±${fmt(Math.abs(ci.margin))}]`;
    }
    return `${fmt(value)} (${fmt(ci.lower)} – ${fmt(ci.upper)})`;
}
