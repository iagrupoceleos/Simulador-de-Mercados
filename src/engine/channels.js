/**
 * Prometheus Engine – Channel Fees & Margin Calculator (ECO-003)
 * Models marketplace fees, payment processing, shipping, and net margins per channel.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Channel Fee Structures
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const CHANNEL_FEES = {
    /** Direct-to-consumer website */
    online: {
        label: 'DTC Website',
        commissionPct: 0.0,       // no marketplace commission
        paymentProcessingPct: 0.029, // Stripe/PayPal ~2.9%
        paymentFixedFee: 0.30,    // per-transaction fixed fee
        shippingCostPerUnit: 8.50,
        returnProcessingFee: 5.00,
        marketingAllocationPct: 0.12, // 12% of revenue goes to acquisition
    },
    /** Amazon marketplace */
    amazon: {
        label: 'Amazon',
        commissionPct: 0.15,      // 15% referral fee
        paymentProcessingPct: 0.0, // included in commission
        paymentFixedFee: 0.0,
        shippingCostPerUnit: 0.0,  // FBA included
        fbaFeePerUnit: 5.50,       // FBA pick & pack
        returnProcessingFee: 3.00,
        marketingAllocationPct: 0.08,
    },
    /** Mercado Libre */
    mercadolibre: {
        label: 'Mercado Libre',
        commissionPct: 0.13,
        paymentProcessingPct: 0.045, // Mercado Pago
        paymentFixedFee: 0.0,
        shippingCostPerUnit: 6.00,
        returnProcessingFee: 4.00,
        marketingAllocationPct: 0.10,
    },
    /** Retail / physical stores */
    retail: {
        label: 'Retail',
        commissionPct: 0.30,      // retail margin
        paymentProcessingPct: 0.02,
        paymentFixedFee: 0.0,
        shippingCostPerUnit: 3.00,  // wholesale shipping
        returnProcessingFee: 2.00,
        marketingAllocationPct: 0.05,
    },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Margin Calculator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Calculate net margin breakdown for a single sale on a given channel.
 * @param {number} salePrice - final sale price
 * @param {number} cogs - cost of goods sold
 * @param {string} channel - channel key
 * @param {object} [overrides] - override specific fee values
 * @returns {object} detailed margin breakdown
 */
export function calculateChannelMargin(salePrice, cogs, channel, overrides = {}) {
    const fees = { ...(CHANNEL_FEES[channel] || CHANNEL_FEES.online), ...overrides };

    const commission = salePrice * fees.commissionPct;
    const paymentFee = salePrice * fees.paymentProcessingPct + (fees.paymentFixedFee || 0);
    const shipping = fees.shippingCostPerUnit || 0;
    const fba = fees.fbaFeePerUnit || 0;
    const marketingAllocation = salePrice * fees.marketingAllocationPct;

    const totalFees = commission + paymentFee + shipping + fba + marketingAllocation;
    const grossProfit = salePrice - cogs;
    const netProfit = grossProfit - totalFees;
    const netMarginPct = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;

    return {
        channel: fees.label,
        salePrice,
        cogs,
        grossProfit,
        commission,
        paymentFee,
        shipping,
        fba,
        marketingAllocation,
        totalFees,
        netProfit,
        netMarginPct,
        breakEvenPrice: cogs + totalFees > 0 ? cogs + totalFees : cogs,
    };
}

/**
 * Compare margins across all channels for a given product.
 * @param {number} salePrice
 * @param {number} cogs
 * @returns {Array} sorted by netMarginPct (best channel first)
 */
export function compareChannels(salePrice, cogs) {
    return Object.keys(CHANNEL_FEES)
        .map(ch => calculateChannelMargin(salePrice, cogs, ch))
        .sort((a, b) => b.netMarginPct - a.netMarginPct);
}

/**
 * Calculate blended margin for a multi-channel mix.
 * @param {number} salePrice
 * @param {number} cogs
 * @param {Object<string, number>} channelMix - { channel: proportion } (must sum to 1)
 * @returns {object} blended margin summary
 */
export function calculateBlendedMargin(salePrice, cogs, channelMix) {
    let blendedNet = 0;
    let blendedFees = 0;
    const breakdown = [];

    for (const [channel, weight] of Object.entries(channelMix)) {
        const margin = calculateChannelMargin(salePrice, cogs, channel);
        blendedNet += margin.netProfit * weight;
        blendedFees += margin.totalFees * weight;
        breakdown.push({ ...margin, weight });
    }

    return {
        salePrice,
        cogs,
        blendedNetProfit: blendedNet,
        blendedNetMarginPct: salePrice > 0 ? (blendedNet / salePrice) * 100 : 0,
        blendedTotalFees: blendedFees,
        channelBreakdown: breakdown,
    };
}
