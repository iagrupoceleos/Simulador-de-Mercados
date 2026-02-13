/**
 * Prometheus Engine – CAC/LTV Tracking (MKT-002)
 * Customer Acquisition Cost and Lifetime Value per channel.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CAC Calculator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Calculate CAC from marketing spend and acquisitions.
 * @param {number} totalSpend - total marketing spend
 * @param {number} acquisitions - new customers acquired
 * @returns {number} CAC
 */
export function calculateCAC(totalSpend, acquisitions) {
    return acquisitions > 0 ? totalSpend / acquisitions : Infinity;
}

/**
 * Calculate CAC by channel from funnel results.
 * @param {object} funnelResults - from simulateFunnel
 * @returns {Object<string, {cac: number, acquisitions: number, spend: number}>}
 */
export function calculateCACByChannel(funnelResults) {
    const result = {};
    if (!funnelResults?.channelResults) return result;

    for (const [key, ch] of Object.entries(funnelResults.channelResults)) {
        result[key] = {
            label: ch.label,
            cac: ch.costPerPurchase,
            acquisitions: ch.funnel?.purchase ?? 0,
            spend: ch.budget,
        };
    }
    return result;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LTV Calculator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Estimate Customer Lifetime Value.
 * LTV = (Avg Order Value × Purchase Frequency × Customer Lifespan) × Gross Margin %
 * @param {object} params
 * @returns {{ ltv: number, breakdown: object }}
 */
export function calculateLTV(params) {
    const {
        avgOrderValue = 100,
        purchaseFrequencyPerYear = 2,
        customerLifespanYears = 3,
        grossMarginPct = 40,
        discountRate = 0.10,     // annual discount rate for NPV
        retentionRate = 0.70,    // annual retention rate
    } = params;

    // Simple LTV
    const simpleLTV = avgOrderValue * purchaseFrequencyPerYear * customerLifespanYears * (grossMarginPct / 100);

    // Discounted LTV with retention
    let discountedLTV = 0;
    for (let year = 0; year < customerLifespanYears; year++) {
        const yearRevenue = avgOrderValue * purchaseFrequencyPerYear * Math.pow(retentionRate, year);
        const yearProfit = yearRevenue * (grossMarginPct / 100);
        const discountFactor = Math.pow(1 + discountRate, year);
        discountedLTV += yearProfit / discountFactor;
    }

    return {
        simpleLTV,
        discountedLTV,
        breakdown: {
            avgOrderValue,
            purchaseFrequencyPerYear,
            customerLifespanYears,
            grossMarginPct,
            retentionRate,
            discountRate,
        },
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LTV:CAC Ratio Analysis
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Analyze LTV:CAC ratio and provide assessment.
 * @param {number} ltv
 * @param {number} cac
 * @returns {{ ratio: number, assessment: string, paybackMonths: number }}
 */
export function analyzeLTVCAC(ltv, cac) {
    if (cac <= 0 || !isFinite(cac)) {
        return { ratio: Infinity, assessment: 'Sin costo de adquisición', paybackMonths: 0 };
    }

    const ratio = ltv / cac;
    const paybackMonths = (cac / (ltv / 12)) || Infinity;

    let assessment;
    if (ratio >= 5) assessment = '🟢 Excelente – alta eficiencia de adquisición. Considerar escalar inversión.';
    else if (ratio >= 3) assessment = '🟢 Saludable – buen equilibrio LTV/CAC. Negocio sostenible.';
    else if (ratio >= 2) assessment = '🟡 Aceptable – margen estrecho. Optimizar retención.';
    else if (ratio >= 1) assessment = '🟠 Bajo – CAC alto relativo a LTV. Revisar canales de adquisición.';
    else assessment = '🔴 Insostenible – LTV no cubre CAC. Cambio urgente necesario.';

    return { ratio, assessment, paybackMonths };
}
