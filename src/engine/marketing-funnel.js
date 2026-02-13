/**
 * Prometheus Engine – Multi-Channel Marketing Funnel (MKT-001)
 * Models the marketing funnel: Awareness → Interest → Consideration → Intent → Purchase
 * with channel-specific conversion rates and budget allocation.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Funnel Stage Definitions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const FUNNEL_STAGES = ['awareness', 'interest', 'consideration', 'intent', 'purchase'];

/**
 * Channel definitions with funnel conversion rates.
 * Each channel has different effectiveness at each funnel stage.
 */
export const MARKETING_CHANNELS = {
    social_media: {
        label: 'Redes Sociales',
        cpm: 8.00,          // cost per 1000 impressions
        cpc: 0.50,          // cost per click
        conversionRates: {
            awareness: 0.15,      // 15% of budget spending generates awareness
            interest: 0.08,       // 8% move to interest
            consideration: 0.04,  // 4% consider
            intent: 0.02,        // 2% have intent
            purchase: 0.01,      // 1% convert
        },
        bestFor: 'awareness',
    },
    search_ads: {
        label: 'Búsqueda (SEM)',
        cpm: 25.00,
        cpc: 2.50,
        conversionRates: {
            awareness: 0.05,
            interest: 0.12,
            consideration: 0.10,
            intent: 0.08,
            purchase: 0.04,
        },
        bestFor: 'intent',
    },
    email: {
        label: 'Email Marketing',
        cpm: 1.00,
        cpc: 0.10,
        conversionRates: {
            awareness: 0.02,
            interest: 0.06,
            consideration: 0.08,
            intent: 0.10,
            purchase: 0.05,
        },
        bestFor: 'consideration',
    },
    influencer: {
        label: 'Influencers',
        cpm: 15.00,
        cpc: 1.20,
        conversionRates: {
            awareness: 0.20,
            interest: 0.12,
            consideration: 0.06,
            intent: 0.03,
            purchase: 0.015,
        },
        bestFor: 'awareness',
    },
    retail_display: {
        label: 'Exhibición Retail',
        cpm: 5.00,
        cpc: 0.80,
        conversionRates: {
            awareness: 0.08,
            interest: 0.10,
            consideration: 0.12,
            intent: 0.15,
            purchase: 0.08,
        },
        bestFor: 'purchase',
    },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Funnel Simulator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Simulate marketing funnel for a given budget allocation.
 * @param {number} totalBudget - total marketing budget
 * @param {Object<string, number>} allocation - { channelKey: proportion } (sums to 1)
 * @param {number} targetMarket - total addressable market size
 * @param {object} [opts]
 * @returns {object} funnel results
 */
export function simulateFunnel(totalBudget, allocation, targetMarket, opts = {}) {
    const { qualityMultiplier = 1.0, brandMultiplier = 1.0 } = opts;

    const channelResults = {};
    const aggregateFunnel = {};

    for (const stage of FUNNEL_STAGES) {
        aggregateFunnel[stage] = 0;
    }

    for (const [channelKey, proportion] of Object.entries(allocation)) {
        const channel = MARKETING_CHANNELS[channelKey];
        if (!channel) continue;

        const channelBudget = totalBudget * proportion;
        const impressions = (channelBudget / channel.cpm) * 1000;

        const funnel = {};
        let audiencePool = impressions;

        for (const stage of FUNNEL_STAGES) {
            const rate = channel.conversionRates[stage] * qualityMultiplier * brandMultiplier;
            const converted = Math.round(audiencePool * rate);
            funnel[stage] = converted;
            aggregateFunnel[stage] += converted;
            audiencePool = converted; // each stage feeds into the next
        }

        channelResults[channelKey] = {
            label: channel.label,
            budget: channelBudget,
            impressions,
            funnel,
            costPerPurchase: funnel.purchase > 0 ? channelBudget / funnel.purchase : Infinity,
            roas: funnel.purchase > 0 ? (funnel.purchase * (opts.avgOrderValue || 100)) / channelBudget : 0,
        };
    }

    // Cap aggregate purchases at target market
    const totalPurchases = Math.min(aggregateFunnel.purchase, targetMarket);

    return {
        totalBudget,
        totalPurchases,
        costPerAcquisition: totalPurchases > 0 ? totalBudget / totalPurchases : Infinity,
        overallROAS: totalPurchases > 0 ? (totalPurchases * (opts.avgOrderValue || 100)) / totalBudget : 0,
        aggregateFunnel,
        channelResults,
    };
}

/**
 * Recommend budget allocation based on funnel stage priority.
 * @param {'awareness'|'conversion'|'balanced'} strategy
 * @returns {Object<string, number>}
 */
export function recommendAllocation(strategy = 'balanced') {
    const allocations = {
        awareness: {
            social_media: 0.35,
            influencer: 0.30,
            search_ads: 0.15,
            email: 0.10,
            retail_display: 0.10,
        },
        conversion: {
            search_ads: 0.35,
            retail_display: 0.25,
            email: 0.20,
            social_media: 0.10,
            influencer: 0.10,
        },
        balanced: {
            social_media: 0.25,
            search_ads: 0.25,
            email: 0.15,
            influencer: 0.15,
            retail_display: 0.20,
        },
    };
    return allocations[strategy] || allocations.balanced;
}
