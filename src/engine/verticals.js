/**
 * Prometheus Engine – Vertical Packs
 * Industry-specific model adjustments for different e-commerce verticals.
 */

export const VERTICALS = {
    electronics: {
        id: 'electronics',
        name: 'Electrónica de Consumo',
        icon: '📱',
        description: 'Gadgets, smart home, dispositivos electrónicos. Ciclos de innovación rápidos.',
        color: '#00e5ff',
        // Agent behavior modifiers
        customerModifiers: {
            priceSensitivityMult: 1.1,      // electronics buyers are somewhat price-sensitive
            brandLoyaltyMult: 1.2,           // brand matters in electronics
            innovationAdoptionMult: 1.4,     // high innovation preference
            purchaseProbMult: 0.8,           // lower base frequency (big-ticket items)
        },
        competitorModifiers: {
            aggressivenessMult: 1.3,         // tech competitors are aggressive
            priceWarProbability: 0.25,       // price wars common in electronics
            reactionSpeed: 1,                // weeks to react
        },
        demandModel: {
            seasonalityAmplitude: 0.3,       // Q4 holiday spike
            productLifecycleWeeks: 52,       // ~1 year product cycle
            obsolescenceRate: 0.02,          // 2% per week demand decay late in lifecycle
            viralCoefficient: 0.15,          // moderate word-of-mouth
        },
        riskFactors: {
            supplyChainDisruption: 0.12,     // probability
            newCompetitorEntry: 0.08,
            regulatoryChange: 0.05,
            technologyShift: 0.10,
        },
        segments: [
            { name: 'tech_enthusiasts', weight: 0.15, priceSens: [0.2, 0.4], brandLoyalty: [0.6, 0.9], quality: [0.7, 0.95], budget: [500, 2000], innovation: [0.8, 0.98], purchaseProb: [0.02, 0.05] },
            { name: 'mainstream_users', weight: 0.35, priceSens: [0.4, 0.7], brandLoyalty: [0.3, 0.6], quality: [0.4, 0.7], budget: [300, 800], innovation: [0.3, 0.6], purchaseProb: [0.01, 0.03] },
            { name: 'budget_buyers', weight: 0.25, priceSens: [0.7, 0.95], brandLoyalty: [0.1, 0.3], quality: [0.2, 0.5], budget: [100, 500], innovation: [0.2, 0.4], purchaseProb: [0.008, 0.02] },
            { name: 'smart_home_adopters', weight: 0.15, priceSens: [0.3, 0.6], brandLoyalty: [0.4, 0.7], quality: [0.6, 0.9], budget: [400, 1200], innovation: [0.6, 0.9], purchaseProb: [0.015, 0.04] },
            { name: 'corporate_buyers', weight: 0.10, priceSens: [0.3, 0.5], brandLoyalty: [0.5, 0.8], quality: [0.7, 0.95], budget: [1000, 5000], innovation: [0.4, 0.7], purchaseProb: [0.005, 0.015] },
        ],
    },

    fashion: {
        id: 'fashion',
        name: 'Moda y Accesorios',
        icon: '👗',
        description: 'Ropa, calzado, accesorios. Ciclos cortos, alta influencia de tendencias.',
        color: '#b388ff',
        customerModifiers: {
            priceSensitivityMult: 0.9,
            brandLoyaltyMult: 1.4,
            innovationAdoptionMult: 1.2,
            purchaseProbMult: 1.3,
        },
        competitorModifiers: {
            aggressivenessMult: 1.1,
            priceWarProbability: 0.15,
            reactionSpeed: 1,
        },
        demandModel: {
            seasonalityAmplitude: 0.5,
            productLifecycleWeeks: 16,
            obsolescenceRate: 0.05,
            viralCoefficient: 0.3,
        },
        riskFactors: {
            supplyChainDisruption: 0.08,
            newCompetitorEntry: 0.15,
            regulatoryChange: 0.02,
            trendShift: 0.20,
        },
        segments: [
            { name: 'fashion_forward', weight: 0.20, priceSens: [0.1, 0.3], brandLoyalty: [0.7, 0.95], quality: [0.7, 0.9], budget: [500, 2000], innovation: [0.8, 0.98], purchaseProb: [0.03, 0.06] },
            { name: 'value_shoppers', weight: 0.30, priceSens: [0.6, 0.9], brandLoyalty: [0.2, 0.5], quality: [0.3, 0.6], budget: [100, 400], innovation: [0.3, 0.6], purchaseProb: [0.02, 0.04] },
            { name: 'brand_devotees', weight: 0.20, priceSens: [0.2, 0.4], brandLoyalty: [0.8, 0.98], quality: [0.5, 0.8], budget: [300, 1000], innovation: [0.4, 0.7], purchaseProb: [0.025, 0.05] },
            { name: 'impulse_buyers', weight: 0.15, priceSens: [0.4, 0.7], brandLoyalty: [0.2, 0.5], quality: [0.3, 0.6], budget: [200, 600], innovation: [0.5, 0.8], purchaseProb: [0.04, 0.08] },
            { name: 'basic_needs', weight: 0.15, priceSens: [0.7, 0.95], brandLoyalty: [0.1, 0.3], quality: [0.4, 0.7], budget: [50, 300], innovation: [0.1, 0.3], purchaseProb: [0.015, 0.03] },
        ],
    },

    food: {
        id: 'food',
        name: 'Alimentación y Bebidas',
        icon: '🍎',
        description: 'Productos de alimentación perecederos y no perecederos. Demanda recurrente.',
        color: '#69f0ae',
        customerModifiers: {
            priceSensitivityMult: 1.3,
            brandLoyaltyMult: 0.8,
            innovationAdoptionMult: 0.7,
            purchaseProbMult: 2.0,
        },
        competitorModifiers: {
            aggressivenessMult: 1.0,
            priceWarProbability: 0.30,
            reactionSpeed: 1,
        },
        demandModel: {
            seasonalityAmplitude: 0.2,
            productLifecycleWeeks: 104,
            obsolescenceRate: 0.001,
            viralCoefficient: 0.1,
        },
        riskFactors: {
            supplyChainDisruption: 0.10,
            newCompetitorEntry: 0.12,
            regulatoryChange: 0.08,
            expirationWaste: 0.15,
        },
        segments: [
            { name: 'health_conscious', weight: 0.25, priceSens: [0.2, 0.5], brandLoyalty: [0.4, 0.7], quality: [0.7, 0.95], budget: [200, 600], innovation: [0.4, 0.7], purchaseProb: [0.05, 0.1] },
            { name: 'price_driven', weight: 0.35, priceSens: [0.7, 0.95], brandLoyalty: [0.1, 0.3], quality: [0.2, 0.5], budget: [100, 300], innovation: [0.1, 0.3], purchaseProb: [0.04, 0.08] },
            { name: 'convenience', weight: 0.20, priceSens: [0.3, 0.6], brandLoyalty: [0.3, 0.6], quality: [0.4, 0.7], budget: [150, 500], innovation: [0.3, 0.5], purchaseProb: [0.06, 0.12] },
            { name: 'gourmet', weight: 0.10, priceSens: [0.1, 0.3], brandLoyalty: [0.6, 0.9], quality: [0.8, 0.98], budget: [300, 1000], innovation: [0.5, 0.8], purchaseProb: [0.03, 0.06] },
            { name: 'bulk_buyers', weight: 0.10, priceSens: [0.8, 0.98], brandLoyalty: [0.1, 0.3], quality: [0.3, 0.6], budget: [200, 800], innovation: [0.1, 0.3], purchaseProb: [0.02, 0.04] },
        ],
    },
};

/**
 * Apply vertical pack modifiers to a population configuration.
 */
export function applyVerticalPack(verticalId, basePopConfig = {}) {
    const vertical = VERTICALS[verticalId];
    if (!vertical) return basePopConfig;

    return {
        ...basePopConfig,
        totalCustomers: basePopConfig.totalCustomers ?? 5000,
        segments: vertical.segments,
        verticalModifiers: vertical.customerModifiers,
        demandModel: vertical.demandModel,
        riskFactors: vertical.riskFactors,
    };
}

/**
 * Get vertical-specific risk events as ExpertBelief configs.
 */
export function getVerticalRiskEvents(verticalId) {
    const vertical = VERTICALS[verticalId];
    if (!vertical) return [];

    const events = [];
    const rf = vertical.riskFactors;

    if (rf.supplyChainDisruption) {
        events.push({
            id: `${verticalId}_supply_disruption`,
            description: `Disrupción en cadena de suministro (${vertical.name})`,
            probability: rf.supplyChainDisruption,
            category: 'supply_chain',
        });
    }
    if (rf.newCompetitorEntry) {
        events.push({
            id: `${verticalId}_new_competitor`,
            description: `Entrada de nuevo competidor significativo (${vertical.name})`,
            probability: rf.newCompetitorEntry,
            category: 'competition',
        });
    }
    if (rf.regulatoryChange) {
        events.push({
            id: `${verticalId}_regulatory`,
            description: `Cambio regulatorio impactante (${vertical.name})`,
            probability: rf.regulatoryChange,
            category: 'regulatory',
        });
    }

    return events;
}
