/**
 * Prometheus Engine - Promotional Pricing Strategies (ECO-002)
 * Models markdown events, flash sales, multi-buy, and dynamic discounts.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Pricing Strategy Definitions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * @typedef {Object} PricingRule
 * @property {string} type - discount type
 * @property {string} name - human-readable label
 * @property {Function} apply - (basePrice, context) => adjustedPrice
 * @property {Function} isActive - (week, context) => boolean
 */

/**
 * Built-in pricing strategies by vertical.
 */
export const PRICING_STRATEGIES = {
    /** Electronics: Early-bird launch → clearance markdown curve */
    electronics: [
        {
            type: 'early_bird',
            name: 'Precio de lanzamiento -10%',
            discount: 0.10,
            isActive: (week, totalWeeks) => week < Math.ceil(totalWeeks * 0.12),
            applyFactor: () => 0.90,
        },
        {
            type: 'clearance',
            name: 'Liquidación progresiva',
            discount: 0.30,
            isActive: (week, totalWeeks) => week >= Math.ceil(totalWeeks * 0.85),
            applyFactor: (week, totalWeeks) => {
                const pct = (week - totalWeeks * 0.85) / (totalWeeks * 0.15);
                return 1 - (0.15 + 0.15 * pct); // 15% → 30%
            },
        },
    ],
    /** Fashion: Flash sales + end-of-season markdown */
    fashion: [
        {
            type: 'flash_sale',
            name: 'Flash Sale -20% (1 semana)',
            discount: 0.20,
            isActive: (week) => week === 6 || week === 14 || week === 22,
            applyFactor: () => 0.80,
        },
        {
            type: 'end_season',
            name: 'Fin de temporada -40%',
            discount: 0.40,
            isActive: (week, totalWeeks) => week >= Math.ceil(totalWeeks * 0.90),
            applyFactor: () => 0.60,
        },
    ],
    /** Food: Bundle / multi-buy deals */
    food: [
        {
            type: 'multi_buy',
            name: 'Lleva 3 paga 2',
            discount: 0.33,
            isActive: () => true, // always active
            applyFactor: () => 0.85, // effective ~15% average discount
        },
    ],
    /** Default: simple markdown */
    default: [
        {
            type: 'markdown',
            name: 'Markdown -15%',
            discount: 0.15,
            isActive: (week, totalWeeks) => week >= Math.ceil(totalWeeks * 0.75),
            applyFactor: () => 0.85,
        },
    ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Pricing Engine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get all pricing strategies for a vertical.
 * @param {string} vertical
 * @returns {Array}
 */
export function getStrategies(vertical) {
    return PRICING_STRATEGIES[vertical] || PRICING_STRATEGIES.default;
}

/**
 * Calculate the effective price for a given week after applying all active strategies.
 * Multiple active strategies stack multiplicatively.
 *
 * @param {number} basePrice - original price
 * @param {string} vertical - product vertical
 * @param {number} week - current simulation week
 * @param {number} totalWeeks - total horizon
 * @param {object} [overrides] - optional strategy overrides
 * @returns {{ effectivePrice: number, activeStrategies: string[], totalDiscount: number }}
 */
export function calculateEffectivePrice(basePrice, vertical, week, totalWeeks, overrides = {}) {
    const strategies = overrides.strategies || getStrategies(vertical);
    let factor = 1.0;
    const activeStrategies = [];

    for (const strat of strategies) {
        if (strat.isActive(week, totalWeeks)) {
            const stratFactor = strat.applyFactor(week, totalWeeks);
            factor *= stratFactor;
            activeStrategies.push(strat.name);
        }
    }

    // Don't let price go below COGS safety floor (if provided)
    const floor = overrides.minPrice ?? basePrice * 0.3;
    const effectivePrice = Math.max(basePrice * factor, floor);

    return {
        effectivePrice,
        activeStrategies,
        totalDiscount: 1 - (effectivePrice / basePrice),
    };
}

/**
 * Generate a weekly pricing schedule for the entire simulation.
 * @param {number} basePrice
 * @param {string} vertical
 * @param {number} totalWeeks
 * @returns {Array<{week: number, price: number, strategies: string[]}>}
 */
export function generatePricingSchedule(basePrice, vertical, totalWeeks) {
    const schedule = [];
    for (let w = 0; w < totalWeeks; w++) {
        const result = calculateEffectivePrice(basePrice, vertical, w, totalWeeks);
        schedule.push({
            week: w,
            price: result.effectivePrice,
            strategies: result.activeStrategies,
            discount: result.totalDiscount,
        });
    }
    return schedule;
}
