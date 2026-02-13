/**
 * Prometheus Engine – Inventory Holding Cost Accrual (ECO-004)
 * Models the cost of holding inventory over time: warehousing, capital, depreciation, insurance.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Holding Cost Components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Default holding cost profiles by vertical (as % of inventory value per year).
 * Total annual holding cost typically ranges 15-30% of inventory value.
 */
export const HOLDING_COST_PROFILES = {
    electronics: {
        warehousing: 0.04,      // 4% – warehouse rent, utilities
        capitalCost: 0.08,      // 8% – opportunity cost of capital
        depreciation: 0.10,     // 10% – tech items lose value fast
        insurance: 0.02,        // 2% – electronics insurance
        shrinkage: 0.02,        // 2% – theft, damage
        totalAnnual: 0.26,      // 26% total
    },
    fashion: {
        warehousing: 0.05,
        capitalCost: 0.08,
        depreciation: 0.15,     // Fashion depreciates fast (seasons)
        insurance: 0.01,
        shrinkage: 0.03,
        totalAnnual: 0.32,
    },
    food: {
        warehousing: 0.08,      // Cold storage costs more
        capitalCost: 0.06,
        depreciation: 0.20,     // Perishability
        insurance: 0.02,
        shrinkage: 0.05,        // Spoilage
        totalAnnual: 0.41,
    },
    default: {
        warehousing: 0.04,
        capitalCost: 0.08,
        depreciation: 0.05,
        insurance: 0.02,
        shrinkage: 0.02,
        totalAnnual: 0.21,
    },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Holding Cost Calculator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Calculate weekly holding cost for current inventory level.
 * @param {number} inventoryUnits - current inventory quantity
 * @param {number} unitCost - COGS per unit
 * @param {string} vertical - product vertical
 * @param {object} [overrides] - override specific cost components
 * @returns {{ weeklyTotal: number, breakdown: object }}
 */
export function calculateWeeklyHoldingCost(inventoryUnits, unitCost, vertical, overrides = {}) {
    const profile = { ...(HOLDING_COST_PROFILES[vertical] || HOLDING_COST_PROFILES.default), ...overrides };
    const inventoryValue = inventoryUnits * unitCost;
    const weeklyFactor = 1 / 52; // convert annual rate to weekly

    const breakdown = {
        warehousing: inventoryValue * profile.warehousing * weeklyFactor,
        capitalCost: inventoryValue * profile.capitalCost * weeklyFactor,
        depreciation: inventoryValue * profile.depreciation * weeklyFactor,
        insurance: inventoryValue * profile.insurance * weeklyFactor,
        shrinkage: inventoryValue * profile.shrinkage * weeklyFactor,
    };

    const weeklyTotal = Object.values(breakdown).reduce((s, v) => s + v, 0);
    return { weeklyTotal, breakdown, inventoryValue };
}

/**
 * Compute cumulative holding costs over an entire simulation horizon.
 * @param {Array<{inventory: number}>} weeklyMetrics - array with weekly inventory levels
 * @param {number} unitCost
 * @param {string} vertical
 * @returns {{ totalHoldingCost: number, weeklyBreakdown: Array, avgWeeklyCost: number }}
 */
export function computeCumulativeHoldingCost(weeklyMetrics, unitCost, vertical) {
    let totalHoldingCost = 0;
    const weeklyBreakdown = [];

    for (const week of weeklyMetrics) {
        const inv = week.inventory ?? 0;
        const cost = calculateWeeklyHoldingCost(inv, unitCost, vertical);
        totalHoldingCost += cost.weeklyTotal;
        weeklyBreakdown.push({
            inventory: inv,
            holdingCost: cost.weeklyTotal,
            cumulative: totalHoldingCost,
            breakdown: cost.breakdown,
        });
    }

    return {
        totalHoldingCost,
        weeklyBreakdown,
        avgWeeklyCost: weeklyBreakdown.length > 0 ? totalHoldingCost / weeklyBreakdown.length : 0,
        holdingCostPerUnit: weeklyMetrics.length > 0
            ? totalHoldingCost / Math.max(1, weeklyMetrics[0].inventory ?? 1)
            : 0,
    };
}
