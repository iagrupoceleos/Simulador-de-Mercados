/**
 * Prometheus Engine – Promotion Calendar Planner (ECO-008)
 * Plans promotional events with ROI estimation across calendar periods.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Promotion Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const PROMO_TYPES = {
    FLASH_SALE: { name: 'Venta Flash', icon: '⚡', durationDays: 1, discountPct: 25, liftMultiplier: 4.0, costBase: 500 },
    WEEKEND_DEAL: { name: 'Oferta Fin de Semana', icon: '🏷️', durationDays: 3, discountPct: 15, liftMultiplier: 2.0, costBase: 1500 },
    HOLIDAY_PROMO: { name: 'Promo Festiva', icon: '🎉', durationDays: 7, discountPct: 20, liftMultiplier: 2.5, costBase: 5000 },
    BOGO: { name: '2x1', icon: '🔄', durationDays: 5, discountPct: 50, liftMultiplier: 3.0, costBase: 3000 },
    FREE_SHIPPING: { name: 'Envío Gratis', icon: '📦', durationDays: 7, discountPct: 0, liftMultiplier: 1.5, costBase: 2000 },
    BUNDLE: { name: 'Pack Combo', icon: '📦', durationDays: 14, discountPct: 10, liftMultiplier: 1.8, costBase: 1000 },
    LOYALTY_BONUS: { name: 'Bonus Lealtad', icon: '💛', durationDays: 3, discountPct: 10, liftMultiplier: 1.3, costBase: 800 },
};

/**
 * Create a promotion event.
 * @param {object} params
 * @param {string} params.type - key from PROMO_TYPES
 * @param {number} params.weekStart - week number to start
 * @param {number} [params.discountOverride] - override default discount %
 * @param {number} [params.budgetOverride] - override marketing cost
 * @returns {object} promotion event
 */
export function createPromotion({ type, weekStart, discountOverride, budgetOverride }) {
    const template = PROMO_TYPES[type] || PROMO_TYPES.FLASH_SALE;
    return {
        type,
        name: template.name,
        icon: template.icon,
        weekStart,
        weekEnd: weekStart + Math.ceil(template.durationDays / 7),
        discountPct: discountOverride || template.discountPct,
        liftMultiplier: template.liftMultiplier,
        marketingCost: budgetOverride || template.costBase,
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Calendar Planner
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Generate a promotion calendar and estimate ROI.
 * @param {object} params
 * @param {object[]} params.promotions - from createPromotion()
 * @param {number} params.baseWeeklySales - units without promotion
 * @param {number} params.basePrice
 * @param {number} params.cogs - cost of goods per unit
 * @param {number} [params.weeks=52]
 * @returns {object} calendar with ROI per promotion
 */
export function planPromotionCalendar(params) {
    const { promotions, baseWeeklySales, basePrice, cogs, weeks = 52 } = params;

    const weeklyPlan = [];
    let totalIncrementalRevenue = 0;
    let totalPromoCost = 0;
    let totalLostMargin = 0;

    for (let w = 1; w <= weeks; w++) {
        const activePromos = promotions.filter(p => w >= p.weekStart && w <= p.weekEnd);
        const hasPromo = activePromos.length > 0;

        let weekSales = baseWeeklySales;
        let effectivePrice = basePrice;
        let promoCost = 0;

        if (hasPromo) {
            // Stack promo effects (multiplicative lift, max discount)
            let combinedLift = 1;
            let maxDiscount = 0;

            for (const promo of activePromos) {
                combinedLift *= promo.liftMultiplier;
                maxDiscount = Math.max(maxDiscount, promo.discountPct);
                promoCost += promo.marketingCost / Math.max(1, promo.weekEnd - promo.weekStart + 1);
            }

            weekSales = Math.round(baseWeeklySales * combinedLift);
            effectivePrice = basePrice * (1 - maxDiscount / 100);
        }

        const revenue = Math.round(weekSales * effectivePrice);
        const grossProfit = Math.round(weekSales * (effectivePrice - cogs));
        const baseRevenue = Math.round(baseWeeklySales * basePrice);
        const incrementalRevenue = revenue - baseRevenue;
        const lostMargin = hasPromo ? Math.round(weekSales * (basePrice - effectivePrice)) : 0;

        totalIncrementalRevenue += incrementalRevenue;
        totalPromoCost += promoCost;
        totalLostMargin += lostMargin;

        weeklyPlan.push({
            week: w,
            promos: activePromos.map(p => p.name),
            sales: weekSales,
            effectivePrice: Math.round(effectivePrice),
            revenue,
            grossProfit,
            promoCost: Math.round(promoCost),
            isPromoWeek: hasPromo,
        });
    }

    // ROI per promotion
    const promoROI = promotions.map(promo => {
        const promoWeeks = weeklyPlan.filter(wp => wp.week >= promo.weekStart && wp.week <= promo.weekEnd);
        const incrementalSales = promoWeeks.reduce((s, w) => s + w.sales, 0) - baseWeeklySales * promoWeeks.length;
        const incrementalRevenue = incrementalSales * basePrice * (1 - promo.discountPct / 100);
        const totalCost = promo.marketingCost;

        return {
            name: promo.name,
            icon: promo.icon,
            weeks: `${promo.weekStart}-${promo.weekEnd}`,
            incrementalSales,
            investedCost: totalCost,
            roi: totalCost > 0 ? Math.round((incrementalRevenue - totalCost) / totalCost * 100) : 0,
        };
    });

    return {
        weeklyPlan,
        promoROI,
        summary: {
            totalIncrementalRevenue: Math.round(totalIncrementalRevenue),
            totalPromoCost: Math.round(totalPromoCost),
            totalLostMargin: Math.round(totalLostMargin),
            netImpact: Math.round(totalIncrementalRevenue - totalPromoCost - totalLostMargin),
            promoWeeks: weeklyPlan.filter(w => w.isPromoWeek).length,
        },
    };
}
