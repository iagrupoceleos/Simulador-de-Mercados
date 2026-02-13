/**
 * Prometheus Engine – Attribution Modeling (MKT-006)
 * Multi-touch marketing attribution: first-touch, last-touch, linear, time-decay, position-based.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Attribution Models
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ATTRIBUTION_MODELS = {
    FIRST_TOUCH: 'first_touch',
    LAST_TOUCH: 'last_touch',
    LINEAR: 'linear',
    TIME_DECAY: 'time_decay',
    POSITION_BASED: 'position_based',
};

/**
 * @typedef {object} Touchpoint
 * @property {string} channel - e.g. 'paid_search', 'social', 'email', 'organic'
 * @property {number} timestamp - unix timestamp
 * @property {number} [cost] - spend on this touchpoint
 */

/**
 * @typedef {object} Conversion
 * @property {string} id
 * @property {number} revenue
 * @property {Touchpoint[]} touchpoints - journey before conversion
 */

/**
 * Run attribution on a set of conversions.
 * @param {Conversion[]} conversions
 * @param {string} model - key from ATTRIBUTION_MODELS
 * @returns {object} attribution results per channel
 */
export function runAttribution(conversions, model = ATTRIBUTION_MODELS.LINEAR) {
    const channelCredit = {};

    for (const conv of conversions) {
        if (!conv.touchpoints || conv.touchpoints.length === 0) continue;
        const credits = allocateCredit(conv.touchpoints, conv.revenue, model);
        for (const [channel, credit] of Object.entries(credits)) {
            if (!channelCredit[channel]) {
                channelCredit[channel] = { revenue: 0, conversions: 0, cost: 0, touchpoints: 0 };
            }
            channelCredit[channel].revenue += credit;
            channelCredit[channel].conversions += 1 / conv.touchpoints.length;
            channelCredit[channel].touchpoints++;

            const tp = conv.touchpoints.find(t => t.channel === channel);
            if (tp?.cost) channelCredit[channel].cost += tp.cost;
        }
    }

    // Calculate ROAS per channel
    const results = Object.entries(channelCredit).map(([channel, data]) => ({
        channel,
        attributedRevenue: Math.round(data.revenue),
        attributedConversions: Math.round(data.conversions * 10) / 10,
        totalCost: Math.round(data.cost),
        roas: data.cost > 0 ? Math.round(data.revenue / data.cost * 100) / 100 : Infinity,
        cpa: data.conversions > 0 ? Math.round(data.cost / data.conversions) : 0,
        touchpoints: data.touchpoints,
    }));

    results.sort((a, b) => b.attributedRevenue - a.attributedRevenue);
    return { model, channels: results, totalConversions: conversions.length };
}

/**
 * Allocate credit to channels for a single conversion.
 */
function allocateCredit(touchpoints, revenue, model) {
    const n = touchpoints.length;
    const credits = {};

    switch (model) {
        case ATTRIBUTION_MODELS.FIRST_TOUCH:
            credits[touchpoints[0].channel] = revenue;
            break;

        case ATTRIBUTION_MODELS.LAST_TOUCH:
            credits[touchpoints[n - 1].channel] = revenue;
            break;

        case ATTRIBUTION_MODELS.LINEAR:
            for (const tp of touchpoints) {
                credits[tp.channel] = (credits[tp.channel] || 0) + revenue / n;
            }
            break;

        case ATTRIBUTION_MODELS.TIME_DECAY: {
            const halfLife = 7 * 24 * 60 * 60 * 1000; // 7 days
            const lastTime = touchpoints[n - 1].timestamp;
            const weights = touchpoints.map(tp => Math.pow(0.5, (lastTime - tp.timestamp) / halfLife));
            const totalWeight = weights.reduce((a, b) => a + b, 0);
            touchpoints.forEach((tp, i) => {
                credits[tp.channel] = (credits[tp.channel] || 0) + revenue * (weights[i] / totalWeight);
            });
            break;
        }

        case ATTRIBUTION_MODELS.POSITION_BASED: {
            // 40% first, 40% last, 20% distributed across middle
            if (n === 1) {
                credits[touchpoints[0].channel] = revenue;
            } else if (n === 2) {
                credits[touchpoints[0].channel] = (credits[touchpoints[0].channel] || 0) + revenue * 0.5;
                credits[touchpoints[1].channel] = (credits[touchpoints[1].channel] || 0) + revenue * 0.5;
            } else {
                credits[touchpoints[0].channel] = (credits[touchpoints[0].channel] || 0) + revenue * 0.4;
                credits[touchpoints[n - 1].channel] = (credits[touchpoints[n - 1].channel] || 0) + revenue * 0.4;
                const middleShare = revenue * 0.2 / (n - 2);
                for (let i = 1; i < n - 1; i++) {
                    credits[touchpoints[i].channel] = (credits[touchpoints[i].channel] || 0) + middleShare;
                }
            }
            break;
        }

        default: // fallback to linear
            for (const tp of touchpoints) {
                credits[tp.channel] = (credits[tp.channel] || 0) + revenue / n;
            }
    }

    return credits;
}

/**
 * Compare all attribution models on the same data.
 * @param {Conversion[]} conversions
 * @returns {object} comparison across all models
 */
export function compareAttributionModels(conversions) {
    const models = Object.values(ATTRIBUTION_MODELS);
    const comparison = {};

    for (const model of models) {
        const result = runAttribution(conversions, model);
        comparison[model] = result.channels;
    }

    return { models, comparison, totalConversions: conversions.length };
}
