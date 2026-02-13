/**
 * Prometheus Engine – Tornado Chart Data Generator (DS-003)
 * Computes parameter importance rankings for tornado/sensitivity visualizations.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Tornado Chart Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Format sensitivity analysis results into tornado chart data.
 * @param {Array} sensitivityResults - result from runSensitivityAnalysis
 * @param {string} [targetKPI='netProfit']
 * @returns {{ bars: Array, baseline: number }}
 */
export function generateTornadoData(sensitivityResults, targetKPI = 'netProfit') {
    if (!sensitivityResults || sensitivityResults.length === 0) return { bars: [], baseline: 0 };

    const baseline = sensitivityResults[0]?.variations?.find(v => v.pctChange === 0)?.kpiValue || 0;

    const bars = sensitivityResults.map(param => {
        const minVar = param.variations.reduce((min, v) => v.kpiValue < min.kpiValue ? v : min, param.variations[0]);
        const maxVar = param.variations.reduce((max, v) => v.kpiValue > max.kpiValue ? v : max, param.variations[0]);

        return {
            param: param.label,
            key: param.key,
            unit: param.unit,
            baseValue: param.baseValue,
            low: minVar.kpiValue,
            high: maxVar.kpiValue,
            lowPct: minVar.kpiChangePct,
            highPct: maxVar.kpiChangePct,
            swing: param.swing,
            elasticity: param.elasticity,
            // For rendering: normalized bar widths
            lowDelta: minVar.kpiValue - baseline,
            highDelta: maxVar.kpiValue - baseline,
        };
    });

    // Already sorted by swing from sensitivity analysis
    return { bars, baseline, targetKPI };
}

/**
 * Render a simple ASCII tornado chart for debugging/reporting.
 * @param {object} tornadoData - from generateTornadoData
 * @returns {string}
 */
export function renderASCIITornado(tornadoData) {
    const { bars, baseline } = tornadoData;
    const maxSwing = Math.max(...bars.map(b => Math.max(Math.abs(b.lowDelta), Math.abs(b.highDelta))));
    const width = 30; // chars per side

    const lines = [`Tornado Chart (baseline: ${baseline.toLocaleString()})`, ''];

    for (const bar of bars) {
        const leftLen = Math.round((Math.abs(bar.lowDelta) / maxSwing) * width);
        const rightLen = Math.round((Math.abs(bar.highDelta) / maxSwing) * width);
        const leftBar = bar.lowDelta < 0 ? '◄' + '█'.repeat(leftLen) : ' '.repeat(leftLen + 1);
        const rightBar = bar.highDelta > 0 ? '█'.repeat(rightLen) + '►' : ' '.repeat(rightLen + 1);
        const label = bar.param.padEnd(20);
        lines.push(`${label} ${leftBar}|${rightBar}  (${bar.lowPct.toFixed(1)}% to ${bar.highPct.toFixed(1)}%)`);
    }

    return lines.join('\n');
}
