/**
 * Prometheus Engine – Customer Lifetime Value with Churn (ECO-006)
 * Subscription/repeat-purchase LTV model with retention decay.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LTV with Churn Model
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Model customer cohort with retention decay.
 * @param {object} params
 * @param {number} params.initialCohort - starting customers
 * @param {number} params.avgOrderValue - average order in MXN
 * @param {number} params.ordersPerYear - purchase frequency
 * @param {number} params.grossMarginPct - gross margin (0-100)
 * @param {number} [params.monthlyChurnRate=0.05] - monthly churn (0-1)
 * @param {number} [params.horizonMonths=36] - forecast horizon
 * @param {number} [params.discountRateAnnual=0.10] - discount rate
 * @returns {object} LTV cohort analysis
 */
export function modelCohortLTV(params) {
    const {
        initialCohort,
        avgOrderValue,
        ordersPerYear,
        grossMarginPct,
        monthlyChurnRate = 0.05,
        horizonMonths = 36,
        discountRateAnnual = 0.10,
    } = params;

    const monthlyDiscount = discountRateAnnual / 12;
    const monthlyRevPerCustomer = (avgOrderValue * ordersPerYear) / 12;
    const monthlyMarginPerCustomer = monthlyRevPerCustomer * (grossMarginPct / 100);

    let activeCustomers = initialCohort;
    let totalRevenue = 0;
    let totalMargin = 0;
    let discountedMargin = 0;
    let totalChurned = 0;

    const monthlyData = [];

    for (let m = 1; m <= horizonMonths; m++) {
        // Apply churn
        const churned = Math.round(activeCustomers * monthlyChurnRate);
        activeCustomers = Math.max(0, activeCustomers - churned);
        totalChurned += churned;

        // Revenue & margin
        const monthRev = activeCustomers * monthlyRevPerCustomer;
        const monthMargin = activeCustomers * monthlyMarginPerCustomer;
        const discountFactor = 1 / Math.pow(1 + monthlyDiscount, m);
        const discountedMonthMargin = monthMargin * discountFactor;

        totalRevenue += monthRev;
        totalMargin += monthMargin;
        discountedMargin += discountedMonthMargin;

        monthlyData.push({
            month: m,
            activeCustomers,
            churned,
            retention: initialCohort > 0 ? activeCustomers / initialCohort : 0,
            revenue: Math.round(monthRev),
            margin: Math.round(monthMargin),
            discountedMargin: Math.round(discountedMonthMargin),
            cumulativeMargin: Math.round(totalMargin),
        });
    }

    const ltvPerCustomer = initialCohort > 0 ? discountedMargin / initialCohort : 0;

    return {
        ltvPerCustomer: Math.round(ltvPerCustomer),
        totalRevenue: Math.round(totalRevenue),
        totalMargin: Math.round(totalMargin),
        discountedMargin: Math.round(discountedMargin),
        initialCohort,
        finalActive: activeCustomers,
        totalChurned,
        overallRetention: initialCohort > 0 ? activeCustomers / initialCohort : 0,
        avgLifetimeMonths: monthlyChurnRate > 0 ? 1 / monthlyChurnRate : horizonMonths,
        monthlyData,
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Churn Prediction
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Churn risk scoring based on behavioral signals.
 * @param {object} customer
 * @param {number} customer.daysSinceLastPurchase
 * @param {number} customer.totalOrders
 * @param {number} customer.avgOrderValue
 * @param {number} customer.returnsCount
 * @param {number} customer.supportTickets
 * @returns {object} churn risk assessment
 */
export function assessChurnRisk(customer) {
    const {
        daysSinceLastPurchase = 0,
        totalOrders = 0,
        avgOrderValue = 0,
        returnsCount = 0,
        supportTickets = 0,
    } = customer;

    // Recency score (0-100, lower = more recent = better)
    const recencyScore = Math.min(100, daysSinceLastPurchase / 3.65);

    // Frequency score (0-100, higher = more orders = better)
    const frequencyScore = Math.min(100, totalOrders * 10);

    // Monetary score (0-100)
    const monetaryScore = Math.min(100, avgOrderValue / 10);

    // Negative signals
    const returnPenalty = returnsCount * 15;
    const supportPenalty = supportTickets * 10;

    // Churn risk (0-100, higher = more likely to churn)
    const churnRisk = Math.max(0, Math.min(100,
        recencyScore * 0.4 +
        (100 - frequencyScore) * 0.3 +
        (100 - monetaryScore) * 0.1 +
        returnPenalty * 0.1 +
        supportPenalty * 0.1
    ));

    const riskLevel = churnRisk > 70 ? 'alto' : churnRisk > 40 ? 'medio' : 'bajo';

    return {
        churnRisk: Math.round(churnRisk),
        riskLevel,
        scores: {
            recency: Math.round(recencyScore),
            frequency: Math.round(frequencyScore),
            monetary: Math.round(monetaryScore),
        },
        penalties: { returns: returnPenalty, support: supportPenalty },
        recommendation: riskLevel === 'alto'
            ? 'Enviar oferta de retención personalizada'
            : riskLevel === 'medio'
                ? 'Incluir en campaña de re-engagement'
                : 'Cliente saludable, mantener comunicación regular',
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Retention Curves
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Common retention curve models.
 */
export const RETENTION_MODELS = {
    /** Exponential decay: R(t) = e^(-λt) */
    exponential: (churnRate, month) => Math.exp(-churnRate * month),
    /** Power law: R(t) = (1+t)^(-α) — typical for subscription */
    power: (alpha, month) => Math.pow(1 + month, -alpha),
    /** BG/NBD inspired shifted beta geometric */
    shifted: (a, b, month) => (b + month > 0) ? b / (a + b + month) : 1,
};
