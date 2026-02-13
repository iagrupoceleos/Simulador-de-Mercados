/**
 * Prometheus Engine – Supply Chain Delay Modeling (SIM-007)
 * Models variable lead times with uncertainty for supply chain simulation.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Lead Time Models
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Lead time distribution models.
 */
export const LEAD_TIME_MODELS = {
    /** Fixed deterministic lead time */
    fixed: (mean) => () => mean,

    /** Uniform distribution lead time */
    uniform: (min, max) => () => min + Math.random() * (max - min),

    /** Triangular distribution lead time */
    triangular: (min, mode, max) => () => {
        const u = Math.random();
        const fc = (mode - min) / (max - min);
        if (u < fc) return min + Math.sqrt(u * (max - min) * (mode - min));
        return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    },

    /** Log-normal distribution (realistic for supply chains) */
    lognormal: (meanDays, stdDays) => () => {
        const mu = Math.log(meanDays * meanDays / Math.sqrt(stdDays * stdDays + meanDays * meanDays));
        const sigma = Math.sqrt(Math.log(1 + (stdDays * stdDays) / (meanDays * meanDays)));
        const z = boxMullerZ();
        return Math.max(1, Math.round(Math.exp(mu + sigma * z)));
    },
};

/**
 * Box-Muller transform for standard normal variate.
 */
function boxMullerZ() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Supply Chain Simulator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * @typedef {object} SupplyChainConfig
 * @property {number} initialInventory
 * @property {number} avgWeeklyDemand
 * @property {number} demandStdDev
 * @property {number} reorderPoint
 * @property {number} orderQuantity
 * @property {string} leadTimeModel - 'fixed'|'uniform'|'triangular'|'lognormal'
 * @property {number[]} leadTimeParams - model-specific params
 * @property {number} [weeks=52]
 * @property {number} [expediteCost=0] - extra cost for rushed orders
 * @property {number} [expediteThreshold=0] - stock level that triggers expedite
 */

/**
 * Simulate supply chain with variable lead times.
 * @param {SupplyChainConfig} config
 * @returns {object} simulation results
 */
export function simulateSupplyChain(config) {
    const {
        initialInventory = 1000,
        avgWeeklyDemand = 100,
        demandStdDev = 20,
        reorderPoint = 300,
        orderQuantity = 500,
        leadTimeModel = 'lognormal',
        leadTimeParams = [14, 5],
        weeks = 52,
        expediteCost = 200,
        expediteThreshold = 100,
    } = config;

    const ltGenerator = LEAD_TIME_MODELS[leadTimeModel]
        ? LEAD_TIME_MODELS[leadTimeModel](...leadTimeParams)
        : LEAD_TIME_MODELS.fixed(leadTimeParams[0] || 14);

    let inventory = initialInventory;
    const pendingOrders = [];
    const log = [];
    let totalStockouts = 0;
    let totalExpedites = 0;
    let totalLeadTime = 0;
    let ordersPlaced = 0;

    for (let w = 1; w <= weeks; w++) {
        // Receive arrivals
        const arrivals = pendingOrders.filter(o => o.arrivalWeek <= w && !o.received);
        for (const o of arrivals) {
            inventory += o.quantity;
            o.received = true;
        }

        // Demand (normal with clamp)
        const demand = Math.max(0, Math.round(avgWeeklyDemand + boxMullerZ() * demandStdDev));
        const sold = Math.min(demand, Math.max(0, inventory));
        const unmet = demand - sold;
        inventory -= sold;
        if (unmet > 0) totalStockouts++;

        // Check reorder
        let ordered = false;
        let expedited = false;
        const hasPending = pendingOrders.some(o => !o.received);

        if (inventory <= reorderPoint && !hasPending) {
            let lt = Math.round(ltGenerator() / 7); // convert to weeks
            lt = Math.max(1, lt);

            // Expedite if critically low
            if (inventory <= expediteThreshold && lt > 1) {
                lt = Math.max(1, Math.round(lt / 2));
                expedited = true;
                totalExpedites++;
            }

            pendingOrders.push({
                orderWeek: w,
                arrivalWeek: w + lt,
                quantity: orderQuantity,
                leadTimeWeeks: lt,
                expedited,
                received: false,
            });
            ordersPlaced++;
            totalLeadTime += lt;
            ordered = true;
        }

        log.push({
            week: w,
            demand,
            sold,
            unmetDemand: unmet,
            inventory: Math.max(0, inventory),
            ordered,
            expedited,
        });
    }

    const avgLeadTime = ordersPlaced > 0 ? totalLeadTime / ordersPlaced : 0;
    const fillRate = weeks > 0 ? 1 - totalStockouts / weeks : 1;

    return {
        finalInventory: Math.max(0, inventory),
        totalStockoutWeeks: totalStockouts,
        fillRate,
        ordersPlaced,
        totalExpedites,
        avgLeadTimeWeeks: Math.round(avgLeadTime * 10) / 10,
        estimatedExpediteCost: totalExpedites * expediteCost,
        log,
        orders: pendingOrders,
    };
}
