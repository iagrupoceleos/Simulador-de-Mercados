/**
 * Prometheus Engine – Reorder/Replenishment Logic (ECO-005)
 * Models inventory replenishment policies for e-commerce.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Replenishment Policies
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Available replenishment policies.
 */
export const POLICIES = {
    /** Reorder when inventory drops below reorder point */
    REORDER_POINT: 'reorder_point',
    /** Fixed periodic review and reorder */
    PERIODIC_REVIEW: 'periodic_review',
    /** Just-in-time: small frequent orders */
    JIT: 'jit',
    /** Economic Order Quantity */
    EOQ: 'eoq',
};

/**
 * Calculate Economic Order Quantity (EOQ).
 * @param {number} annualDemand - expected yearly demand
 * @param {number} orderCost - fixed cost per order
 * @param {number} holdingCostPerUnit - annual holding cost per unit
 * @returns {object} EOQ result
 */
export function calculateEOQ(annualDemand, orderCost, holdingCostPerUnit) {
    if (holdingCostPerUnit <= 0 || annualDemand <= 0) {
        return { eoq: 0, numOrders: 0, totalCost: 0 };
    }

    const eoq = Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnit);
    const numOrders = annualDemand / eoq;
    const totalOrderCost = numOrders * orderCost;
    const totalHoldingCost = (eoq / 2) * holdingCostPerUnit;

    return {
        eoq: Math.round(eoq),
        numOrders: Math.round(numOrders),
        totalOrderCost: Math.round(totalOrderCost),
        totalHoldingCost: Math.round(totalHoldingCost),
        totalCost: Math.round(totalOrderCost + totalHoldingCost),
    };
}

/**
 * Calculate reorder point.
 * @param {number} avgDailyDemand
 * @param {number} leadTimeDays
 * @param {number} safetyStock
 * @returns {number}
 */
export function calculateReorderPoint(avgDailyDemand, leadTimeDays, safetyStock = 0) {
    return Math.ceil(avgDailyDemand * leadTimeDays + safetyStock);
}

/**
 * Calculate safety stock using demand variability.
 * @param {number} zScore - service level Z-score (1.65=95%, 2.33=99%)
 * @param {number} demandStdDev - standard deviation of daily demand
 * @param {number} leadTimeDays
 * @returns {number}
 */
export function calculateSafetyStock(zScore, demandStdDev, leadTimeDays) {
    return Math.ceil(zScore * demandStdDev * Math.sqrt(leadTimeDays));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Replenishment Simulator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Simulate replenishment over a time horizon.
 * @param {object} params
 * @param {number} params.initialInventory
 * @param {number} params.avgWeeklyDemand
 * @param {number} params.demandStdDev
 * @param {number} params.leadTimeWeeks
 * @param {number} params.orderCost - fixed cost per order
 * @param {number} params.holdingCostPerUnit - weekly holding cost
 * @param {number} params.cogs - cost per unit
 * @param {string} [params.policy='reorder_point']
 * @param {number} [params.weeks=26]
 * @param {number} [params.serviceLevel=0.95]
 * @returns {object} replenishment simulation results
 */
export function simulateReplenishment(params) {
    const {
        initialInventory,
        avgWeeklyDemand,
        demandStdDev = avgWeeklyDemand * 0.2,
        leadTimeWeeks = 2,
        orderCost = 500,
        holdingCostPerUnit = 1,
        cogs = 50,
        policy = POLICIES.REORDER_POINT,
        weeks = 26,
        serviceLevel = 0.95,
    } = params;

    // Z-score map for common service levels
    const zScoreMap = { 0.9: 1.28, 0.95: 1.65, 0.99: 2.33 };
    const zScore = zScoreMap[serviceLevel] || 1.65;

    const safetyStock = calculateSafetyStock(zScore, demandStdDev, leadTimeWeeks);
    const reorderPoint = calculateReorderPoint(avgWeeklyDemand, leadTimeWeeks, safetyStock);
    const eoqResult = calculateEOQ(avgWeeklyDemand * 52, orderCost, holdingCostPerUnit * 52);

    let inventory = initialInventory;
    let totalOrdered = 0;
    let totalOrderCost = 0;
    let totalHoldingCost = 0;
    let stockoutWeeks = 0;
    let ordersPlaced = 0;
    const pendingOrders = []; // { deliveryWeek, quantity }
    const weeklyLog = [];

    for (let w = 1; w <= weeks; w++) {
        // Receive pending orders
        const arrivals = pendingOrders.filter(o => o.deliveryWeek === w);
        for (const order of arrivals) {
            inventory += order.quantity;
        }

        // Demand (with randomness using simple sine variation)
        const variation = 1 + 0.15 * Math.sin(w * 0.5);
        const demand = Math.round(avgWeeklyDemand * variation);
        const sold = Math.min(demand, Math.max(0, inventory));
        inventory -= sold;

        // Track stockouts
        if (sold < demand) stockoutWeeks++;

        // Holding cost
        const weekHolding = Math.max(0, inventory) * holdingCostPerUnit;
        totalHoldingCost += weekHolding;

        // Check reorder
        let ordered = 0;
        if (policy === POLICIES.REORDER_POINT && inventory <= reorderPoint) {
            ordered = eoqResult.eoq || Math.round(avgWeeklyDemand * leadTimeWeeks * 2);
            pendingOrders.push({ deliveryWeek: w + leadTimeWeeks, quantity: ordered });
            ordersPlaced++;
            totalOrderCost += orderCost;
            totalOrdered += ordered;
        } else if (policy === POLICIES.PERIODIC_REVIEW && w % Math.max(1, Math.round(52 / (eoqResult.numOrders || 12))) === 0) {
            const target = avgWeeklyDemand * (leadTimeWeeks + Math.round(52 / (eoqResult.numOrders || 12))) + safetyStock;
            ordered = Math.max(0, Math.round(target - inventory));
            if (ordered > 0) {
                pendingOrders.push({ deliveryWeek: w + leadTimeWeeks, quantity: ordered });
                ordersPlaced++;
                totalOrderCost += orderCost;
                totalOrdered += ordered;
            }
        } else if (policy === POLICIES.JIT) {
            ordered = Math.round(avgWeeklyDemand * 1.1);
            pendingOrders.push({ deliveryWeek: w + 1, quantity: ordered });
            ordersPlaced++;
            totalOrderCost += orderCost * 0.3; // lower JIT order cost
            totalOrdered += ordered;
        }

        weeklyLog.push({
            week: w,
            demand,
            sold,
            inventory: Math.max(0, inventory),
            ordered,
            holdingCost: weekHolding,
        });
    }

    const fillRate = weeks > 0 ? (1 - stockoutWeeks / weeks) : 0;

    return {
        policy,
        initialInventory,
        finalInventory: Math.max(0, inventory),
        totalOrdered,
        ordersPlaced,
        totalOrderCost: Math.round(totalOrderCost),
        totalHoldingCost: Math.round(totalHoldingCost),
        totalReplenishmentCost: Math.round(totalOrderCost + totalHoldingCost),
        stockoutWeeks,
        fillRate,
        serviceLevel,
        safetyStock,
        reorderPoint,
        eoq: eoqResult.eoq,
        weeklyLog,
    };
}
