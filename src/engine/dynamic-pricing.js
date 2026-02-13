/**
 * Prometheus Engine – Dynamic Pricing Engine (ECO-007)
 * Automated repricing rules based on demand, competition, and inventory signals.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Pricing Rules
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const PRICING_RULES = {
    /** Demand-based: raise price when demand is high, lower when low */
    DEMAND_RESPONSIVE: 'demand_responsive',
    /** Competition-based: match or undercut competitor price */
    COMPETITIVE: 'competitive',
    /** Inventory-based: markdown when excess, premium when scarce */
    INVENTORY_BASED: 'inventory_based',
    /** Time-based: surge pricing during peak hours/seasons */
    TIME_BASED: 'time_based',
    /** Combined: blend of all signals */
    COMBINED: 'combined',
};

/**
 * Calculate dynamic price adjustment.
 * @param {object} signals
 * @param {number} signals.basePrice
 * @param {number} [signals.demandIndex] - 1.0=normal, >1 high, <1 low
 * @param {number} [signals.competitorPrice]
 * @param {number} [signals.inventoryLevel] - 0-1 (0=empty, 1=full)
 * @param {number} [signals.weekOfYear]
 * @param {string} [signals.rule='combined']
 * @param {object} [signals.bounds] - { floor, ceiling } price bounds
 * @returns {object} { adjustedPrice, adjustment, reasoning }
 */
export function calculateDynamicPrice(signals) {
    const {
        basePrice,
        demandIndex = 1.0,
        competitorPrice,
        inventoryLevel = 0.5,
        weekOfYear = 1,
        rule = PRICING_RULES.COMBINED,
        bounds = {},
    } = signals;

    const floor = bounds.floor || basePrice * 0.7;
    const ceiling = bounds.ceiling || basePrice * 1.5;
    let adjustment = 0;
    const reasons = [];

    if (rule === PRICING_RULES.DEMAND_RESPONSIVE || rule === PRICING_RULES.COMBINED) {
        const demandAdj = (demandIndex - 1) * 0.15;
        adjustment += demandAdj;
        if (Math.abs(demandAdj) > 0.01) {
            reasons.push(demandIndex > 1 ? `Alta demanda (+${(demandAdj * 100).toFixed(1)}%)` : `Baja demanda (${(demandAdj * 100).toFixed(1)}%)`);
        }
    }

    if ((rule === PRICING_RULES.COMPETITIVE || rule === PRICING_RULES.COMBINED) && competitorPrice) {
        const gap = (competitorPrice - basePrice) / basePrice;
        const compAdj = gap * 0.3; // move 30% toward competitor price
        adjustment += compAdj;
        if (Math.abs(compAdj) > 0.01) {
            reasons.push(gap > 0 ? `Competidor más caro (+${(compAdj * 100).toFixed(1)}%)` : `Competidor más barato (${(compAdj * 100).toFixed(1)}%)`);
        }
    }

    if (rule === PRICING_RULES.INVENTORY_BASED || rule === PRICING_RULES.COMBINED) {
        const invAdj = inventoryLevel > 0.8 ? -0.1 * (inventoryLevel - 0.8) / 0.2
            : inventoryLevel < 0.2 ? 0.15 * (0.2 - inventoryLevel) / 0.2
                : 0;
        adjustment += invAdj;
        if (Math.abs(invAdj) > 0.01) {
            reasons.push(invAdj < 0 ? `Exceso inventario (${(invAdj * 100).toFixed(1)}%)` : `Escasez (+${(invAdj * 100).toFixed(1)}%)`);
        }
    }

    if (rule === PRICING_RULES.TIME_BASED || rule === PRICING_RULES.COMBINED) {
        const peakWeeks = [11, 12, 46, 47, 48, 49, 50, 51]; // holiday seasons (March=Semana Santa, Nov-Dec)
        if (peakWeeks.includes(weekOfYear)) {
            adjustment += 0.08;
            reasons.push('Temporada alta (+8%)');
        }
    }

    const adjustedPrice = Math.round(Math.max(floor, Math.min(ceiling, basePrice * (1 + adjustment))));

    return {
        basePrice,
        adjustedPrice,
        adjustmentPct: Math.round(adjustment * 1000) / 10,
        reasoning: reasons.length > 0 ? reasons : ['Sin ajustes'],
        floor,
        ceiling,
        rule,
    };
}

/**
 * Simulate dynamic pricing over a period.
 * @param {object} config
 * @param {number} config.basePrice
 * @param {number} config.weeks
 * @param {Function} config.demandFn - (week) => demand index
 * @param {Function} [config.competitorFn] - (week) => competitor price
 * @param {string} [config.rule='combined']
 * @returns {object[]} weekly price adjustments
 */
export function simulateDynamicPricing(config) {
    const { basePrice, weeks = 26, demandFn, competitorFn, rule = 'combined' } = config;
    const results = [];

    for (let w = 1; w <= weeks; w++) {
        const result = calculateDynamicPrice({
            basePrice,
            demandIndex: demandFn ? demandFn(w) : 1 + 0.3 * Math.sin(w * Math.PI / 13),
            competitorPrice: competitorFn ? competitorFn(w) : undefined,
            inventoryLevel: 0.3 + 0.4 * Math.cos(w * 0.3),
            weekOfYear: w,
            rule,
        });
        results.push({ week: w, ...result });
    }

    const avgPrice = results.reduce((s, r) => s + r.adjustedPrice, 0) / results.length;
    const maxAdj = Math.max(...results.map(r => r.adjustmentPct));
    const minAdj = Math.min(...results.map(r => r.adjustmentPct));

    return { results, avgPrice: Math.round(avgPrice), maxAdjustment: maxAdj, minAdjustment: minAdj };
}
