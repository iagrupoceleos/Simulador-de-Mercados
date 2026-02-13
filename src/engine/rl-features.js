/**
 * Prometheus Engine – Enhanced RL Agent State (AI-001)
 * Richer state representation for the RL competitor agent.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Feature Engineering for RL State
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Extract a rich feature vector from the simulation context for the RL agent.
 * V1 used only: [relative_price, own_share, period_pct]
 * V2 adds: momentum, lifecycle, inventory pressure, brand strength, macro signals
 *
 * @param {object} context - simulation context for current week
 * @returns {number[]} normalized feature vector (0-1 range)
 */
export function extractRLState(context) {
    const {
        week = 0,
        totalWeeks = 26,
        ownPrice = 100,
        competitorPrices = [],
        ownMarketShare = 0.2,
        ownInventory = 0,
        initialInventory = 1000,
        salesHistory = [],     // last N weeks of own sales
        priceHistory = [],     // last N weeks of own prices
        lifecycle = {},        // { stage, noveltyFactor }
        macroSentiment = 0,    // -1 to 1
        brandStrength = 0.5,   // 0-1
        competitorAggression = 0.5,
        demandTrend = 0,       // -1 to 1
    } = context;

    // 1. Relative price position
    const avgCompPrice = competitorPrices.length > 0
        ? competitorPrices.reduce((s, p) => s + p, 0) / competitorPrices.length
        : ownPrice;
    const relativePrice = clamp(ownPrice / Math.max(1, avgCompPrice), 0, 2) / 2;

    // 2. Market share
    const shareNorm = clamp(ownMarketShare, 0, 1);

    // 3. Time position
    const timePct = clamp(week / Math.max(1, totalWeeks), 0, 1);

    // 4. Inventory pressure (how much stock remains as % of initial)
    const inventoryPressure = clamp(ownInventory / Math.max(1, initialInventory), 0, 1);

    // 5. Sales momentum (recent trend)
    const momentum = computeMomentum(salesHistory);

    // 6. Price momentum (are we raising or lowering prices?)
    const priceMomentum = computeMomentum(priceHistory);

    // 7. Lifecycle stage (encoded numerically)
    const lifecycleEncoding = encodeLifecycle(lifecycle.stage || 'maturity');

    // 8. Novelty factor
    const novelty = clamp(lifecycle.noveltyFactor || 1.0, 0, 2) / 2;

    // 9. Macro sentiment
    const macroNorm = (clamp(macroSentiment, -1, 1) + 1) / 2;

    // 10. Brand strength
    const brand = clamp(brandStrength, 0, 1);

    // 11. Competitor aggression
    const aggression = clamp(competitorAggression, 0, 1);

    // 12. Demand trend
    const demand = (clamp(demandTrend, -1, 1) + 1) / 2;

    return [
        relativePrice,      // 0: price position
        shareNorm,           // 1: market share
        timePct,             // 2: time in simulation
        inventoryPressure,   // 3: remaining stock
        momentum,            // 4: sales trend
        priceMomentum,       // 5: price trend
        lifecycleEncoding,   // 6: lifecycle stage
        novelty,             // 7: novelty factor
        macroNorm,           // 8: macro sentiment
        brand,               // 9: brand strength
        aggression,          // 10: competitor aggression
        demand,              // 11: demand trend
    ];
}

/** Feature names for debugging/display. */
export const RL_FEATURE_NAMES = [
    'Precio Relativo',
    'Cuota de Mercado',
    'Progreso Temporal',
    'Presión Inventario',
    'Momentum Ventas',
    'Momentum Precio',
    'Etapa Ciclo Vida',
    'Factor Novedad',
    'Sentimiento Macro',
    'Fortaleza Marca',
    'Agresividad Competencia',
    'Tendencia Demanda',
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

/**
 * Compute momentum from a time series (last 4 values).
 * Returns normalized -1 to 1 mapped to 0-1.
 */
function computeMomentum(series) {
    if (!series || series.length < 2) return 0.5; // neutral
    const recent = series.slice(-4);
    const prev = recent.slice(0, -1);
    const last = recent[recent.length - 1];
    const avgPrev = prev.reduce((s, v) => s + v, 0) / prev.length;
    if (avgPrev === 0) return 0.5;
    const change = (last - avgPrev) / Math.abs(avgPrev);
    return (clamp(change, -1, 1) + 1) / 2;
}

function encodeLifecycle(stage) {
    const map = { launch: 0.0, growth: 0.33, maturity: 0.66, decline: 1.0 };
    return map[stage] ?? 0.5;
}
