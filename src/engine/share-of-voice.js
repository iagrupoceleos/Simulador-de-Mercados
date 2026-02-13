/**
 * Prometheus Engine – Competitive Share of Voice Analysis (MKT-005)
 * Analyze marketing presence relative to competitors.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Share of Voice
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Calculate Share of Voice (SOV) across channels.
 * @param {Array<{ brand: string, spend: Object<string,number> }>} competitorSpends
 *   Each entry: { brand: "BrandX", spend: { social: 5000, search: 3000, display: 2000 } }
 * @returns {object} SOV analysis
 */
export function calculateSOV(competitorSpends) {
    if (!competitorSpends || competitorSpends.length === 0) return null;

    // Aggregate by channel
    const channelTotals = {};
    const brandTotals = {};

    for (const entry of competitorSpends) {
        brandTotals[entry.brand] = 0;
        for (const [channel, amount] of Object.entries(entry.spend)) {
            channelTotals[channel] = (channelTotals[channel] || 0) + amount;
            brandTotals[entry.brand] += amount;
        }
    }

    const totalMarketSpend = Object.values(brandTotals).reduce((s, v) => s + v, 0);

    // Per-brand SOV
    const brandSOV = competitorSpends.map(entry => {
        const channelSOV = {};
        for (const [channel, amount] of Object.entries(entry.spend)) {
            channelSOV[channel] = channelTotals[channel] > 0
                ? amount / channelTotals[channel] : 0;
        }

        return {
            brand: entry.brand,
            totalSpend: brandTotals[entry.brand],
            overallSOV: totalMarketSpend > 0 ? brandTotals[entry.brand] / totalMarketSpend : 0,
            channelSOV,
        };
    });

    // Sort by SOV
    brandSOV.sort((a, b) => b.overallSOV - a.overallSOV);

    return {
        totalMarketSpend,
        channels: Object.keys(channelTotals),
        channelTotals,
        brandSOV,
        leader: brandSOV[0]?.brand || null,
        herfindahlIndex: brandSOV.reduce((s, b) => s + b.overallSOV ** 2, 0),
    };
}

/**
 * Analyze SOV vs Share of Market (SOM) — Excess SOV model.
 * Brands with SOV > SOM tend to gain market share.
 * @param {Array<{ brand: string, sov: number, som: number }>} data
 * @returns {Array}
 */
export function analyzeSOVvsSOM(data) {
    return data.map(({ brand, sov, som }) => {
        const excessSOV = sov - som;
        const expectedGrowth = excessSOV * 0.5; // Rule of thumb: 10% excess SOV → 5% SOM growth

        return {
            brand,
            sov: (sov * 100).toFixed(1),
            som: (som * 100).toFixed(1),
            excessSOV: (excessSOV * 100).toFixed(1),
            expectedGrowth: (expectedGrowth * 100).toFixed(1),
            position: excessSOV > 0.05 ? 'en_crecimiento' :
                excessSOV < -0.05 ? 'en_retroceso' : 'estable',
            recommendation: excessSOV > 0.1
                ? 'Mantener inversión — ganando participación'
                : excessSOV < -0.1
                    ? 'Incrementar inversión o perder participación'
                    : 'Equilibrio competitivo — monitorear',
        };
    });
}

/**
 * Generate SOV report for the player's brand.
 * @param {object} params
 * @param {string} params.playerBrand
 * @param {number} params.playerSpend
 * @param {number} params.playerMarketShare
 * @param {Array<{ brand: string, spend: number, marketShare: number }>} params.competitors
 * @returns {object}
 */
export function generateSOVReport(params) {
    const { playerBrand, playerSpend, playerMarketShare, competitors = [] } = params;

    const allBrands = [
        { brand: playerBrand, spend: playerSpend, marketShare: playerMarketShare },
        ...competitors,
    ];

    const totalSpend = allBrands.reduce((s, b) => s + b.spend, 0);

    const analysis = allBrands.map(b => ({
        brand: b.brand,
        sov: totalSpend > 0 ? b.spend / totalSpend : 0,
        som: b.marketShare,
    }));

    const sovSom = analyzeSOVvsSOM(analysis);
    const playerAnalysis = sovSom.find(a => a.brand === playerBrand);

    return {
        playerBrand,
        playerSOV: playerAnalysis?.sov,
        playerSOM: playerAnalysis?.som,
        excessSOV: playerAnalysis?.excessSOV,
        position: playerAnalysis?.position,
        recommendation: playerAnalysis?.recommendation,
        competitiveLandscape: sovSom,
        totalMarketSpend: totalSpend,
    };
}
