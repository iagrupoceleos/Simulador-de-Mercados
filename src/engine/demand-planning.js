/**
 * Prometheus Engine – Demand Planning (FORE-002)
 * Seasonal decomposition + demand planning engine for inventory optimization.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Seasonal Decomposition
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Decompose a time series into trend, seasonal, and residual components.
 * Uses moving average for trend extraction (additive model).
 * @param {number[]} data - time series
 * @param {number} seasonLength - period length (e.g., 12 for monthly, 4 for quarterly)
 * @returns {object} { trend, seasonal, residual, data }
 */
export function decompose(data, seasonLength = 12) {
    const n = data.length;
    if (n < seasonLength * 2) {
        return { trend: [...data], seasonal: data.map(() => 0), residual: data.map(() => 0), data };
    }

    // 1. Extract trend via centered moving average
    const half = Math.floor(seasonLength / 2);
    const trend = new Array(n).fill(null);

    for (let i = half; i < n - half; i++) {
        let sum = 0;
        for (let j = i - half; j <= i + half; j++) sum += data[j];
        trend[i] = sum / seasonLength;
    }

    // Fill edges via linear extrapolation
    const firstValid = trend.findIndex(v => v !== null);
    const lastValid = trend.lastIndexOf(trend.filter(v => v !== null).pop());
    for (let i = 0; i < firstValid; i++) {
        trend[i] = trend[firstValid] - (firstValid - i) * (trend[firstValid + 1] - trend[firstValid]);
    }
    for (let i = lastValid + 1; i < n; i++) {
        trend[i] = trend[lastValid] + (i - lastValid) * (trend[lastValid] - trend[lastValid - 1]);
    }

    // 2. Extract seasonal component
    const detrended = data.map((v, i) => v - trend[i]);
    const seasonalAvg = new Array(seasonLength).fill(0);
    const counts = new Array(seasonLength).fill(0);

    for (let i = 0; i < n; i++) {
        seasonalAvg[i % seasonLength] += detrended[i];
        counts[i % seasonLength]++;
    }
    for (let s = 0; s < seasonLength; s++) {
        seasonalAvg[s] = counts[s] > 0 ? seasonalAvg[s] / counts[s] : 0;
    }

    // Center seasonal (zero mean)
    const seasonMean = seasonalAvg.reduce((a, b) => a + b, 0) / seasonLength;
    const seasonal = data.map((_, i) => seasonalAvg[i % seasonLength] - seasonMean);

    // 3. Residual
    const residual = data.map((v, i) => v - trend[i] - seasonal[i]);

    return {
        trend: trend.map(v => Math.round(v)),
        seasonal: seasonal.map(v => Math.round(v * 100) / 100),
        residual: residual.map(v => Math.round(v * 100) / 100),
        data,
        seasonalIndices: seasonalAvg.map(v => Math.round((v - seasonMean) * 100) / 100),
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Demand Planning Engine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Generate a demand plan with safety stock recommendations.
 * @param {object} params
 * @param {number[]} params.historicalDemand - historical demand data
 * @param {number} params.seasonLength - season period
 * @param {number} params.planHorizon - periods to plan
 * @param {number} params.leadTimePeriods - lead time in same units
 * @param {number} [params.serviceLevel=0.95]
 * @param {number} [params.holdingCostPct=0.25] - annual holding cost as % of item value
 * @param {number} [params.unitCost=50]
 * @returns {object} demand plan
 */
export function generateDemandPlan(params) {
    const {
        historicalDemand,
        seasonLength = 12,
        planHorizon = 12,
        leadTimePeriods = 2,
        serviceLevel = 0.95,
        holdingCostPct = 0.25,
        unitCost = 50,
    } = params;

    // Decompose historical
    const decomposed = decompose(historicalDemand, seasonLength);

    // Project trend forward
    const n = historicalDemand.length;
    const trendSlope = n > 2
        ? (decomposed.trend[n - 1] - decomposed.trend[0]) / (n - 1)
        : 0;
    const lastTrend = decomposed.trend[n - 1];

    // Z-score for service level
    const zScoreMap = { 0.90: 1.28, 0.95: 1.65, 0.99: 2.33, 0.999: 3.09 };
    const z = zScoreMap[serviceLevel] || 1.65;

    // Demand variability
    const residualStd = std(decomposed.residual);

    const plan = [];
    let totalPlannedDemand = 0;
    let totalSafetyStock = 0;

    for (let p = 1; p <= planHorizon; p++) {
        const trendForecast = lastTrend + trendSlope * p;
        const seasonalEffect = decomposed.seasonalIndices[(n + p - 1) % seasonLength] || 0;
        const forecastDemand = Math.max(0, Math.round(trendForecast + seasonalEffect));

        const safetyStock = Math.ceil(z * residualStd * Math.sqrt(leadTimePeriods));
        const reorderPoint = Math.ceil(forecastDemand * leadTimePeriods / seasonLength + safetyStock);
        const holdingCost = Math.round(safetyStock * unitCost * holdingCostPct / seasonLength);

        totalPlannedDemand += forecastDemand;
        totalSafetyStock += safetyStock;

        plan.push({
            period: p,
            forecastDemand,
            trendComponent: Math.round(trendForecast),
            seasonalComponent: Math.round(seasonalEffect),
            safetyStock,
            reorderPoint,
            holdingCost,
        });
    }

    return {
        plan,
        decomposition: {
            trendSlope: Math.round(trendSlope * 100) / 100,
            residualStd: Math.round(residualStd * 100) / 100,
            seasonalIndices: decomposed.seasonalIndices,
        },
        summary: {
            totalPlannedDemand,
            avgPeriodDemand: Math.round(totalPlannedDemand / planHorizon),
            avgSafetyStock: Math.round(totalSafetyStock / planHorizon),
            serviceLevel,
        },
    };
}

// ━━━━━━━━━━ Helpers ━━━━━━━━━━
function std(arr) {
    const n = arr.length;
    if (n < 2) return 0;
    const m = arr.reduce((a, b) => a + b, 0) / n;
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1));
}
