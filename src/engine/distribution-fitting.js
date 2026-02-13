/**
 * Prometheus Engine – Distribution Fitting from CSV (DS-006)
 * Parse CSV data and fit to known distribution types.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CSV Parser
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Parse CSV text into an array of row objects.
 * @param {string} csvText
 * @param {string} [delimiter=',']
 * @returns {{ headers: string[], rows: object[], numericColumns: string[] }}
 */
export function parseCSV(csvText, delimiter = ',') {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return { headers: [], rows: [], numericColumns: [] };

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((h, idx) => {
            const num = parseFloat(values[idx]);
            row[h] = isNaN(num) ? values[idx] : num;
        });
        rows.push(row);
    }

    // Identify numeric columns
    const numericColumns = headers.filter(h =>
        rows.every(r => typeof r[h] === 'number' && !isNaN(r[h]))
    );

    return { headers, rows, numericColumns };
}

/**
 * Extract a numeric column as an array.
 * @param {object[]} rows
 * @param {string} columnName
 * @returns {number[]}
 */
export function extractColumn(rows, columnName) {
    return rows.map(r => r[columnName]).filter(v => typeof v === 'number' && !isNaN(v));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Distribution Fitting
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Compute descriptive statistics.
 * @param {number[]} data
 * @returns {object}
 */
export function descriptiveStats(data) {
    const n = data.length;
    if (n === 0) return null;

    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((s, v) => s + v, 0) / n;
    const variance = data.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
    const std = Math.sqrt(variance);

    // Skewness
    const skewness = n > 2
        ? (n / ((n - 1) * (n - 2))) * data.reduce((s, v) => s + ((v - mean) / std) ** 3, 0)
        : 0;

    // Kurtosis (excess)
    const kurtosis = n > 3
        ? ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * data.reduce((s, v) => s + ((v - mean) / std) ** 4, 0)
        - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3))
        : 0;

    const pct = (p) => sorted[Math.min(Math.floor(p * n), n - 1)];

    return {
        n, mean, std, variance, skewness, kurtosis,
        min: sorted[0],
        max: sorted[n - 1],
        median: pct(0.5),
        p5: pct(0.05),
        p25: pct(0.25),
        p75: pct(0.75),
        p95: pct(0.95),
    };
}

/**
 * Fit data to candidate distributions and rank by goodness of fit.
 * Uses method of moments estimation.
 * @param {number[]} data
 * @returns {Array<{ distribution: string, params: object, goodnessOfFit: number }>}
 */
export function fitDistributions(data) {
    const stats = descriptiveStats(data);
    if (!stats || stats.n < 5) return [];

    const candidates = [];

    // 1. Normal
    candidates.push({
        distribution: 'normal',
        params: { mean: stats.mean, std: stats.std },
        goodnessOfFit: kolmogorovSmirnovTest(data, (x) => normalCDF(x, stats.mean, stats.std)),
    });

    // 2. Log-Normal (if all positive)
    if (stats.min > 0) {
        const logData = data.map(Math.log);
        const logStats = descriptiveStats(logData);
        candidates.push({
            distribution: 'lognormal',
            params: { mu: logStats.mean, sigma: logStats.std },
            goodnessOfFit: kolmogorovSmirnovTest(data, (x) =>
                x > 0 ? normalCDF(Math.log(x), logStats.mean, logStats.std) : 0),
        });
    }

    // 3. Uniform
    candidates.push({
        distribution: 'uniform',
        params: { min: stats.min, max: stats.max },
        goodnessOfFit: kolmogorovSmirnovTest(data, (x) =>
            Math.max(0, Math.min(1, (x - stats.min) / (stats.max - stats.min || 1)))),
    });

    // 4. Triangular (mode = most frequent bucket)
    const buckets = 20;
    const range = stats.max - stats.min || 1;
    const bucketWidth = range / buckets;
    const histogram = new Array(buckets).fill(0);
    data.forEach(v => {
        const idx = Math.min(Math.floor((v - stats.min) / bucketWidth), buckets - 1);
        histogram[idx]++;
    });
    const modeIdx = histogram.indexOf(Math.max(...histogram));
    const mode = stats.min + (modeIdx + 0.5) * bucketWidth;

    candidates.push({
        distribution: 'triangular',
        params: { min: stats.min, mode, max: stats.max },
        goodnessOfFit: kolmogorovSmirnovTest(data, (x) =>
            triangularCDF(x, stats.min, mode, stats.max)),
    });

    // Sort by goodness of fit (lower KS = better)
    candidates.sort((a, b) => a.goodnessOfFit - b.goodnessOfFit);

    return candidates;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Statistical Tests & CDFs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function kolmogorovSmirnovTest(data, cdfFn) {
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    let maxD = 0;

    for (let i = 0; i < n; i++) {
        const empirical = (i + 1) / n;
        const theoretical = cdfFn(sorted[i]);
        maxD = Math.max(maxD, Math.abs(empirical - theoretical));
    }

    return maxD; // KS statistic
}

function normalCDF(x, mean, std) {
    if (std <= 0) return x >= mean ? 1 : 0;
    const z = (x - mean) / std;
    return 0.5 * (1 + erf(z / Math.SQRT2));
}

function erf(x) {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
    const result = 1 - poly * Math.exp(-x * x);
    return x >= 0 ? result : -result;
}

function triangularCDF(x, min, mode, max) {
    if (x <= min) return 0;
    if (x >= max) return 1;
    const range = max - min || 1;
    if (x <= mode) {
        return ((x - min) ** 2) / (range * (mode - min || 1));
    }
    return 1 - ((max - x) ** 2) / (range * (max - mode || 1));
}
