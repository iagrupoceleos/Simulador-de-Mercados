/**
 * Prometheus Engine – Time Series Forecasting (FORE-001)
 * Exponential smoothing methods: Simple, Double (Holt), Triple (Holt-Winters).
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Simple Exponential Smoothing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Simple Exponential Smoothing for stationary data.
 * @param {number[]} data - time series
 * @param {number} alpha - smoothing factor (0-1)
 * @param {number} forecastPeriods - periods to forecast ahead
 * @returns {object} { fitted, forecast, alpha }
 */
export function simpleExponentialSmoothing(data, alpha = 0.3, forecastPeriods = 6) {
    if (!data || data.length < 2) return { fitted: [], forecast: [], alpha };

    const fitted = [data[0]];
    for (let t = 1; t < data.length; t++) {
        fitted.push(alpha * data[t] + (1 - alpha) * fitted[t - 1]);
    }

    const lastFitted = fitted[fitted.length - 1];
    const forecast = Array.from({ length: forecastPeriods }, () => Math.round(lastFitted));

    return { fitted: fitted.map(Math.round), forecast, alpha };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Double Exponential (Holt)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Holt's Double Exponential Smoothing for trending data.
 * @param {number[]} data
 * @param {number} alpha - level smoothing (0-1)
 * @param {number} beta - trend smoothing (0-1)
 * @param {number} forecastPeriods
 * @returns {object}
 */
export function holtSmoothing(data, alpha = 0.3, beta = 0.1, forecastPeriods = 6) {
    if (!data || data.length < 3) return { fitted: [], forecast: [], alpha, beta };

    let level = data[0];
    let trend = data[1] - data[0];
    const fitted = [level];

    for (let t = 1; t < data.length; t++) {
        const prevLevel = level;
        level = alpha * data[t] + (1 - alpha) * (prevLevel + trend);
        trend = beta * (level - prevLevel) + (1 - beta) * trend;
        fitted.push(level + trend);
    }

    const forecast = [];
    for (let h = 1; h <= forecastPeriods; h++) {
        forecast.push(Math.round(level + h * trend));
    }

    return { fitted: fitted.map(Math.round), forecast, alpha, beta, finalLevel: level, finalTrend: trend };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Triple Exponential (Holt-Winters)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Holt-Winters Triple Exponential Smoothing for seasonal + trending data.
 * Additive model.
 * @param {number[]} data
 * @param {number} seasonLength - e.g., 12 for monthly data with yearly seasonality
 * @param {number} alpha - level smoothing
 * @param {number} beta - trend smoothing
 * @param {number} gamma - seasonal smoothing
 * @param {number} forecastPeriods
 * @returns {object}
 */
export function holtWinters(data, seasonLength = 12, alpha = 0.3, beta = 0.1, gamma = 0.3, forecastPeriods = 6) {
    if (!data || data.length < seasonLength * 2) {
        return { fitted: [], forecast: [], error: 'Need at least 2 full seasons of data' };
    }

    // Initialize seasonal indices from first season
    const seasonal = [];
    const firstSeasonMean = data.slice(0, seasonLength).reduce((a, b) => a + b, 0) / seasonLength;
    for (let i = 0; i < seasonLength; i++) {
        seasonal.push(data[i] - firstSeasonMean);
    }

    let level = firstSeasonMean;
    let trend = (data[seasonLength] - data[0]) / seasonLength;
    const fitted = [];

    for (let t = 0; t < data.length; t++) {
        const sIdx = t % seasonLength;
        if (t === 0) {
            fitted.push(level + seasonal[sIdx]);
            continue;
        }

        const prevLevel = level;
        level = alpha * (data[t] - seasonal[sIdx]) + (1 - alpha) * (prevLevel + trend);
        trend = beta * (level - prevLevel) + (1 - beta) * trend;
        seasonal[sIdx] = gamma * (data[t] - level) + (1 - gamma) * seasonal[sIdx];
        fitted.push(level + trend + seasonal[sIdx]);
    }

    const forecast = [];
    for (let h = 1; h <= forecastPeriods; h++) {
        const sIdx = (data.length + h - 1) % seasonLength;
        forecast.push(Math.round(level + h * trend + seasonal[sIdx]));
    }

    return {
        fitted: fitted.map(Math.round),
        forecast,
        seasonal: [...seasonal],
        alpha, beta, gamma,
        finalLevel: level,
        finalTrend: trend,
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Auto-select best method
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Auto-select the best exponential smoothing method based on data characteristics.
 * @param {number[]} data
 * @param {number} forecastPeriods
 * @param {number} [seasonLength=12]
 * @returns {object} best model results + method label
 */
export function autoForecast(data, forecastPeriods = 6, seasonLength = 12) {
    const candidates = [];

    // Try simple
    const ses = simpleExponentialSmoothing(data, 0.3, forecastPeriods);
    candidates.push({ method: 'SES', ...ses, mape: calcMAPE(data, ses.fitted) });

    // Try Holt (if data has enough points)
    if (data.length >= 6) {
        for (const a of [0.2, 0.5, 0.8]) {
            const h = holtSmoothing(data, a, 0.1, forecastPeriods);
            candidates.push({ method: 'Holt', ...h, mape: calcMAPE(data, h.fitted) });
        }
    }

    // Try Holt-Winters (if enough data)
    if (data.length >= seasonLength * 2) {
        const hw = holtWinters(data, seasonLength, 0.3, 0.1, 0.3, forecastPeriods);
        if (!hw.error) {
            candidates.push({ method: 'Holt-Winters', ...hw, mape: calcMAPE(data, hw.fitted) });
        }
    }

    // Pick best by MAPE
    candidates.sort((a, b) => a.mape - b.mape);
    const best = candidates[0];

    return {
        method: best.method,
        fitted: best.fitted,
        forecast: best.forecast,
        mape: Math.round(best.mape * 1000) / 10, // as percentage
        allModels: candidates.map(c => ({ method: c.method, mape: Math.round(c.mape * 1000) / 10 })),
    };
}

/**
 * Mean Absolute Percentage Error.
 */
function calcMAPE(actual, fitted) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < Math.min(actual.length, fitted.length); i++) {
        if (actual[i] !== 0) {
            sum += Math.abs((actual[i] - fitted[i]) / actual[i]);
            count++;
        }
    }
    return count > 0 ? sum / count : 1;
}
