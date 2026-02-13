/**
 * Prometheus Engine - Sensitivity Analysis Module (DS-001)
 * One-at-a-time (OAT) sensitivity analysis for simulation parameters.
 */
import { MonteCarloEngine } from './montecarlo.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Parameters available for sensitivity analysis.
 * Each defines the path in config, label, and variation range.
 */
export const SENSITIVITY_PARAMS = [
    { key: 'basePrice', label: 'Precio Base', path: 'offerConfig.basePrice', pctRange: 0.20, unit: '$' },
    { key: 'cogs', label: 'COGS', path: 'offerConfig.cogs', pctRange: 0.20, unit: '$' },
    { key: 'marketingBudget', label: 'Presupuesto MKT', path: 'offerConfig.marketingBudget', pctRange: 0.30, unit: '$' },
    { key: 'qualityIndex', label: 'Calidad Producto', path: 'offerConfig.qualityIndex', pctRange: 0.30, unit: '' },
    { key: 'initialInventory', label: 'Inventario Inicial', path: 'initialInventory', pctRange: 0.30, unit: 'u' },
    { key: 'totalCustomers', label: 'Tam. Mercado', path: 'populationConfig.totalCustomers', pctRange: 0.30, unit: '' },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Sensitivity Analysis
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Set a nested property from a dot-path string.
 * @param {object} obj
 * @param {string} path - dot-separated path
 * @param {*} value
 */
function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let ref = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!ref[keys[i]]) ref[keys[i]] = {};
        ref = ref[keys[i]];
    }
    ref[keys[keys.length - 1]] = value;
}

/**
 * Get a nested property from a dot-path string.
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((r, k) => r?.[k], obj);
}

/**
 * Run one-at-a-time sensitivity analysis.
 * Varies each parameter ±X% from baseline and measures impact on target KPI.
 *
 * @param {object} baseConfig - the full MC config (ngc, offerConfig, populationConfig, etc.)
 * @param {object} [options]
 * @param {string[]} [options.params] - keys from SENSITIVITY_PARAMS to include (default: all)
 * @param {string} [options.targetKPI='netProfit'] - which KPI to measure
 * @param {number} [options.steps=5] - number of variation steps per side
 * @param {number} [options.iterationsPerRun=30] - MC iterations per sensitivity run
 * @param {Function} [options.onProgress] - progress callback
 * @returns {Promise<SensitivityResult[]>}
 */
export async function runSensitivityAnalysis(baseConfig, options = {}) {
    const {
        params = SENSITIVITY_PARAMS.map(p => p.key),
        targetKPI = 'netProfit',
        steps = 5,
        iterationsPerRun = 30,
        onProgress,
    } = options;

    const selectedParams = SENSITIVITY_PARAMS.filter(p => params.includes(p.key));
    const results = [];
    const totalRuns = selectedParams.length * (steps * 2 + 1);
    let completed = 0;

    for (const param of selectedParams) {
        const baseValue = getNestedValue(baseConfig, param.path);
        if (baseValue == null || baseValue === 0) continue;

        const variations = [];
        const mc = new MonteCarloEngine();

        // Generate variation values: -pctRange to +pctRange
        for (let s = -steps; s <= steps; s++) {
            const pctChange = (s / steps) * param.pctRange;
            const variedValue = baseValue * (1 + pctChange);

            // Clone config and set the varied parameter
            const variedConfig = JSON.parse(JSON.stringify(baseConfig));
            // Re-attach ngc (not JSON-cloneable)
            variedConfig.ngc = baseConfig.ngc;
            variedConfig.iterations = iterationsPerRun;
            setNestedValue(variedConfig, param.path, variedValue);

            const mcResult = await mc.run(variedConfig);
            const kpiValue = mcResult?.[targetKPI]?.mean ?? 0;

            variations.push({
                pctChange,
                value: variedValue,
                kpiValue,
            });

            completed++;
            if (onProgress) {
                onProgress({ completed, total: totalRuns, param: param.label });
            }
        }

        // Compute elasticity: % change in KPI / % change in parameter
        const baseKPI = variations[steps]?.kpiValue || 1;
        const elasticities = variations.map(v => ({
            ...v,
            kpiChangePct: ((v.kpiValue - baseKPI) / Math.abs(baseKPI)) * 100,
        }));

        // Sensitivity magnitude: max swing range
        const kpiValues = elasticities.map(e => e.kpiChangePct);
        const swing = Math.max(...kpiValues) - Math.min(...kpiValues);

        results.push({
            param: param.key,
            label: param.label,
            unit: param.unit,
            baseValue,
            pctRange: param.pctRange,
            variations: elasticities,
            swing,
            elasticity: swing / (param.pctRange * 2 * 100), // normalized
        });
    }

    // Sort by swing (most sensitive first) — good for tornado chart
    results.sort((a, b) => b.swing - a.swing);

    return results;
}
