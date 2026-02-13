/**
 * Prometheus Engine - Return Rate Modeling (ECO-001)
 * Models product return rates by vertical, reason, and time.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Return Rate Profiles by Vertical
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Return rate profiles per vertical.
 * Each vertical has a base return rate and a breakdown by reason.
 */
export const RETURN_PROFILES = {
    electronics: {
        baseRate: 0.08,       // 8% base return rate
        windowWeeks: 4,       // return window (30 days)
        reasons: {
            defective: 0.25,   // 25% of returns = defective
            notAsExpected: 0.35,   // 35% = not as expected / wrong item
            buyerRemorse: 0.20,   // 20% = changed mind
            betterPrice: 0.10,   // 10% = found cheaper elsewhere
            other: 0.10,
        },
        refurbRate: 0.60,      // 60% of returns can be resold (refurb)
        refurbDiscount: 0.30,  // sold at 30% discount
    },
    fashion: {
        baseRate: 0.25,       // 25% - highest return rate
        windowWeeks: 4,
        reasons: {
            sizeFit: 0.45,   // 45% = wrong size/fit
            notAsExpected: 0.25,   // 25% = color/style differs
            buyerRemorse: 0.15,
            defective: 0.05,
            other: 0.10,
        },
        refurbRate: 0.80,      // 80% resellable
        refurbDiscount: 0.20,  // 20% discount
    },
    food: {
        baseRate: 0.03,       // 3% - lowest rate
        windowWeeks: 1,       // very short window
        reasons: {
            damaged: 0.40,
            expired: 0.25,
            notAsExpected: 0.20,
            allergen: 0.10,
            other: 0.05,
        },
        refurbRate: 0.0,       // cannot resell food returns
        refurbDiscount: 0,
    },
    default: {
        baseRate: 0.10,
        windowWeeks: 4,
        reasons: {
            notAsExpected: 0.30,
            defective: 0.25,
            buyerRemorse: 0.25,
            other: 0.20,
        },
        refurbRate: 0.50,
        refurbDiscount: 0.25,
    },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Return Rate Calculator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get the return profile for a given vertical.
 * @param {string} vertical - product vertical ('electronics', 'fashion', 'food')
 * @returns {object} return profile
 */
export function getReturnProfile(vertical) {
    return RETURN_PROFILES[vertical] || RETURN_PROFILES.default;
}

/**
 * Simulate returns for units sold in a given week.
 * Returns are stochastic: each sale has a probability of being returned.
 *
 * @param {number} unitsSold - units sold this week
 * @param {string} vertical - product vertical
 * @param {number} qualityIndex - product quality (0-1), higher = fewer defect returns
 * @param {import('./distributions.js').PRNG} rng - random generator
 * @returns {{ returns: number, refurbished: number, lost: number, costImpact: number, reasons: object }}
 */
export function simulateReturns(unitsSold, vertical, qualityIndex, rng) {
    const profile = getReturnProfile(vertical);

    // Quality reduces defect-based returns
    const qualityAdjustment = 1 - (qualityIndex - 0.5) * 0.3; // 0.85 to 1.15
    const effectiveRate = profile.baseRate * Math.max(0.5, qualityAdjustment);

    let totalReturns = 0;
    const reasonCounts = {};
    for (const reason of Object.keys(profile.reasons)) {
        reasonCounts[reason] = 0;
    }

    // Stochastic: each unit has a chance of being returned
    for (let i = 0; i < unitsSold; i++) {
        if (rng.next() < effectiveRate) {
            totalReturns++;
            // Determine reason
            const r = rng.next();
            let cumProb = 0;
            for (const [reason, prob] of Object.entries(profile.reasons)) {
                cumProb += prob;
                if (r < cumProb) {
                    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
                    break;
                }
            }
        }
    }

    // Refurbishment: some returns can be resold
    const refurbished = Math.round(totalReturns * profile.refurbRate);
    const lost = totalReturns - refurbished;

    return {
        returns: totalReturns,
        refurbished,
        lost,
        reasons: reasonCounts,
    };
}

/**
 * Calculate financial impact of returns for a simulation result.
 * @param {number} totalReturns
 * @param {number} refurbished
 * @param {number} lost
 * @param {number} price - original sale price
 * @param {number} cogs - cost of goods sold
 * @param {string} vertical
 * @returns {{ refundCost: number, refurbRevenue: number, netReturnCost: number, processingCost: number }}
 */
export function calculateReturnImpact(totalReturns, refurbished, lost, price, cogs, vertical) {
    const profile = getReturnProfile(vertical);

    const refundCost = totalReturns * price;                                // full refund
    const refurbRevenue = refurbished * price * (1 - profile.refurbDiscount); // resale at discount
    const lostGoodsCost = lost * cogs;                                       // total write-off
    const processingCost = totalReturns * (cogs * 0.05);                     // 5% of COGS handling fee

    return {
        refundCost,
        refurbRevenue,
        netReturnCost: refundCost - refurbRevenue + processingCost,
        processingCost,
        lostGoodsCost,
    };
}
