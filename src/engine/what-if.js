/**
 * Prometheus Engine – What-If Quick Scenarios (STR-004)
 * Generates ±X% perturbations of key parameters and compares results.
 */
import { MonteCarloEngine } from './montecarlo.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  What-If Presets
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const WHATIF_PRESETS = [
    { id: 'price_up_10', label: 'Precio +10%', param: 'offerConfig.basePrice', factor: 1.10 },
    { id: 'price_down_10', label: 'Precio -10%', param: 'offerConfig.basePrice', factor: 0.90 },
    { id: 'price_up_20', label: 'Precio +20%', param: 'offerConfig.basePrice', factor: 1.20 },
    { id: 'price_down_20', label: 'Precio -20%', param: 'offerConfig.basePrice', factor: 0.80 },
    { id: 'stock_up_20', label: 'Inventario +20%', param: 'initialInventory', factor: 1.20 },
    { id: 'stock_down_20', label: 'Inventario -20%', param: 'initialInventory', factor: 0.80 },
    { id: 'mkt_up_50', label: 'Marketing +50%', param: 'offerConfig.marketingBudget', factor: 1.50 },
    { id: 'mkt_down_50', label: 'Marketing -50%', param: 'offerConfig.marketingBudget', factor: 0.50 },
    { id: 'cogs_up_15', label: 'COGS +15%', param: 'offerConfig.cogs', factor: 1.15 },
    { id: 'quality_up', label: 'Calidad +20%', param: 'offerConfig.qualityIndex', factor: 1.20 },
    { id: 'market_double', label: 'Mercado 2×', param: 'populationConfig.totalCustomers', factor: 2.00 },
    { id: 'market_half', label: 'Mercado ½', param: 'populationConfig.totalCustomers', factor: 0.50 },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getNestedValue(obj, path) {
    return path.split('.').reduce((r, k) => r?.[k], obj);
}

function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let ref = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!ref[keys[i]]) ref[keys[i]] = {};
        ref = ref[keys[i]];
    }
    ref[keys[keys.length - 1]] = value;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  What-If Runner
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Run a single what-if scenario — one parameter perturbed by a factor.
 * @param {object} baseConfig - full MC config
 * @param {object} preset - from WHATIF_PRESETS
 * @param {object} [options]
 * @returns {Promise<{preset: object, result: object, delta: object}>}
 */
export async function runWhatIf(baseConfig, preset, options = {}) {
    const { iterations = 50 } = options;
    const mc = new MonteCarloEngine();

    const variedConfig = JSON.parse(JSON.stringify(baseConfig));
    variedConfig.ngc = baseConfig.ngc;
    variedConfig.iterations = iterations;

    const baseValue = getNestedValue(variedConfig, preset.param);
    const newValue = (baseValue || 0) * preset.factor;
    setNestedValue(variedConfig, preset.param, newValue);

    const result = await mc.run(variedConfig);

    return {
        preset,
        baseValue,
        newValue,
        result: {
            salesMean: result.sales.mean,
            revenueMean: result.revenue.mean,
            netProfitMean: result.netProfit.mean,
            roiMean: result.roi.mean,
            marginMean: result.margin.mean,
        },
    };
}

/**
 * Run all what-if presets and compare to baseline.
 * @param {object} baseConfig
 * @param {object} baselineResults - existing MC results from baseline run
 * @param {object} [options]
 * @returns {Promise<Array>}
 */
export async function runAllWhatIfs(baseConfig, baselineResults, options = {}) {
    const { presets = WHATIF_PRESETS, onProgress } = options;
    const results = [];

    const baseline = {
        salesMean: baselineResults.sales.mean,
        revenueMean: baselineResults.revenue.mean,
        netProfitMean: baselineResults.netProfit.mean,
        roiMean: baselineResults.roi.mean,
        marginMean: baselineResults.margin.mean,
    };

    for (let i = 0; i < presets.length; i++) {
        const whatIf = await runWhatIf(baseConfig, presets[i], options);

        // Add deltas vs baseline
        whatIf.delta = {
            salesPct: ((whatIf.result.salesMean - baseline.salesMean) / Math.abs(baseline.salesMean || 1)) * 100,
            revenuePct: ((whatIf.result.revenueMean - baseline.revenueMean) / Math.abs(baseline.revenueMean || 1)) * 100,
            netProfitPct: ((whatIf.result.netProfitMean - baseline.netProfitMean) / Math.abs(baseline.netProfitMean || 1)) * 100,
            roiDelta: whatIf.result.roiMean - baseline.roiMean,
            marginDelta: whatIf.result.marginMean - baseline.marginMean,
        };

        results.push(whatIf);

        if (onProgress) {
            onProgress({ completed: i + 1, total: presets.length, current: presets[i].label });
        }
    }

    // Sort by net profit impact (largest positive first)
    results.sort((a, b) => b.delta.netProfitPct - a.delta.netProfitPct);
    return results;
}
