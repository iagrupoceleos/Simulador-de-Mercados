/**
 * Prometheus Engine – Strategic Positioning Radar Chart Data (STR-003)
 * Computes normalized scores for multi-dimensional strategy assessment.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Radar Dimensions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const RADAR_DIMENSIONS = [
    { key: 'profitability', label: 'Rentabilidad', icon: '💰' },
    { key: 'risk', label: 'Control de Riesgo', icon: '🛡️' },
    { key: 'marketShare', label: 'Penetración', icon: '📈' },
    { key: 'inventory', label: 'Eficiencia Inventario', icon: '📦' },
    { key: 'resilience', label: 'Resiliencia', icon: '🔄' },
    { key: 'competitiveness', label: 'Competitividad', icon: '⚔️' },
];

/**
 * Compute radar chart scores from MC results (all scores 0-100).
 * @param {object} mcResults
 * @param {object} [riskResults]
 * @returns {{ dimensions: Array<{key, label, score, icon}>, overallScore: number }}
 */
export function computeRadarScores(mcResults, riskResults = null) {
    if (!mcResults) return { dimensions: [], overallScore: 0 };

    const scores = {};

    // 1. Profitability: ROI (0% → 0, 100%+ → 100)
    const roi = mcResults.roi?.mean ?? 0;
    scores.profitability = clamp(roi, 0, 100);

    // 2. Risk Control: inverse of loss probability (1 - P(loss))
    const margin = mcResults.margin?.mean ?? 0;
    const probLoss = riskResults?.probROIBelow0 ?? (roi < 0 ? 0.8 : roi < 20 ? 0.3 : 0.05);
    scores.risk = clamp((1 - probLoss) * 100, 0, 100);

    // 3. Market Share / Penetration: % of inventory sold
    const unsold = mcResults.unsoldPct?.mean ?? 50;
    scores.marketShare = clamp(100 - unsold, 0, 100);

    // 4. Inventory Efficiency: inverse of unsold %
    scores.inventory = clamp(100 - unsold * 1.5, 0, 100);

    // 5. Resilience: how tight is the P5-P95 band relative to mean
    const netProfitMean = mcResults.netProfit?.mean ?? 1;
    const netProfitP5 = mcResults.netProfit?.p5 ?? 0;
    const spread = Math.abs(netProfitMean) > 0
        ? (1 - Math.abs(netProfitP5 - netProfitMean) / Math.abs(netProfitMean)) * 100
        : 50;
    scores.resilience = clamp(spread, 0, 100);

    // 6. Competitiveness: margin above 0 indicates competitive pricing
    scores.competitiveness = clamp(margin * 2.5, 0, 100);

    const dimensions = RADAR_DIMENSIONS.map(d => ({
        key: d.key,
        label: d.label,
        icon: d.icon,
        score: Math.round(scores[d.key] ?? 0),
    }));

    const overallScore = Math.round(
        dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length,
    );

    return { dimensions, overallScore };
}

/**
 * Get a strategic grade based on overall score.
 * @param {number} overallScore
 * @returns {{ grade: string, label: string, color: string }}
 */
export function getStrategicGrade(overallScore) {
    if (overallScore >= 85) return { grade: 'A+', label: 'Excelente', color: 'var(--accent-emerald)' };
    if (overallScore >= 70) return { grade: 'A', label: 'Muy Bueno', color: 'var(--accent-cyan)' };
    if (overallScore >= 55) return { grade: 'B', label: 'Bueno', color: 'var(--accent-amber)' };
    if (overallScore >= 40) return { grade: 'C', label: 'Regular', color: 'var(--accent-amber)' };
    return { grade: 'D', label: 'Necesita Mejora', color: 'var(--accent-rose)' };
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}
