/**
 * Prometheus Engine – Scenario Comparison (DS-004)
 * Save scenario snapshots (A, B) and generate side-by-side diff of results.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Scenario Snapshot
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Create a lightweight snapshot of key MC results for comparison.
 * @param {string} label - scenario label
 * @param {object} config - MC config used
 * @param {object} mcResults - aggregated MC results
 * @returns {object} snapshot
 */
export function createSnapshot(label, config, mcResults) {
    if (!mcResults) return null;

    return {
        label,
        timestamp: new Date().toISOString(),
        config: {
            basePrice: config.offerConfig?.basePrice,
            cogs: config.offerConfig?.cogs,
            marketingBudget: config.offerConfig?.marketingBudget,
            qualityIndex: config.offerConfig?.qualityIndex,
            initialInventory: config.initialInventory,
            totalCustomers: config.populationConfig?.totalCustomers,
            iterations: config.iterations,
            timeHorizonWeeks: config.timeHorizonWeeks,
        },
        kpis: {
            salesMean: mcResults.sales?.mean,
            salesP5: mcResults.sales?.p5,
            salesP95: mcResults.sales?.p95,
            revenueMean: mcResults.revenue?.mean,
            netProfitMean: mcResults.netProfit?.mean,
            netProfitP5: mcResults.netProfit?.p5,
            netProfitP95: mcResults.netProfit?.p95,
            roiMean: mcResults.roi?.mean,
            marginMean: mcResults.margin?.mean,
            unsoldPctMean: mcResults.unsoldPct?.mean,
            breakEvenWeek: mcResults.breakEvenWeek?.mean ?? null,
        },
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Comparison Engine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Compare two scenario snapshots and produce a diff.
 * @param {object} snapshotA
 * @param {object} snapshotB
 * @returns {object} comparison
 */
export function compareSnapshots(snapshotA, snapshotB) {
    if (!snapshotA || !snapshotB) return null;

    const configDiff = diffObjects(snapshotA.config, snapshotB.config);
    const kpiDiff = diffObjects(snapshotA.kpis, snapshotB.kpis);

    // Determine winner for each KPI
    const winners = {};
    for (const key of Object.keys(kpiDiff)) {
        const d = kpiDiff[key];
        if (key === 'unsoldPctMean') {
            // Lower is better for unsold %
            winners[key] = d.delta < 0 ? snapshotB.label : snapshotA.label;
        } else {
            // Higher is better for most KPIs
            winners[key] = d.delta > 0 ? snapshotB.label : snapshotA.label;
        }
    }

    return {
        labelA: snapshotA.label,
        labelB: snapshotB.label,
        configDiff,
        kpiDiff,
        winners,
        recommendation: generateRecommendation(kpiDiff, winners, snapshotA, snapshotB),
    };
}

function diffObjects(objA, objB) {
    const diff = {};
    for (const key of Object.keys(objA)) {
        const a = objA[key];
        const b = objB[key];
        if (a == null || b == null) {
            diff[key] = { a, b, delta: null, pctChange: null };
            continue;
        }
        const delta = b - a;
        const pctChange = a !== 0 ? (delta / Math.abs(a)) * 100 : (b === 0 ? 0 : Infinity);
        diff[key] = { a, b, delta, pctChange };
    }
    return diff;
}

function generateRecommendation(kpiDiff, winners, snapA, snapB) {
    const profitDelta = kpiDiff.netProfitMean?.pctChange ?? 0;
    const roiDelta = kpiDiff.roiMean?.pctChange ?? 0;
    const riskDelta = kpiDiff.netProfitP5?.pctChange ?? 0;

    if (profitDelta > 5 && roiDelta > 5) {
        return `${snapB.label} es claramente superior: +${profitDelta.toFixed(1)}% beneficio, +${roiDelta.toFixed(1)}% ROI`;
    }
    if (profitDelta < -5 && roiDelta < -5) {
        return `${snapA.label} es claramente superior: mejor beneficio y ROI`;
    }
    if (Math.abs(profitDelta) < 3) {
        return `Escenarios similares en rentabilidad (diferencia <3%). Revisar factores de riesgo.`;
    }
    if (profitDelta > 0 && riskDelta < 0) {
        return `${snapB.label} tiene mejor beneficio medio, pero ${snapA.label} tiene menor riesgo. Decidir según tolerancia al riesgo.`;
    }
    return `${snapB.label} muestra ${profitDelta > 0 ? 'mejor' : 'peor'} rentabilidad (${profitDelta.toFixed(1)}%). Analizar trade-offs.`;
}
