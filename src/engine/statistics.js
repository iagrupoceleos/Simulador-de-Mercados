/**
 * Prometheus Tech Scout – simple-statistics Integration (SCOUT-006)
 * Lightweight statistical functions that supplement distributions.js.
 * Implemented natively to avoid npm dependency.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Regression
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Simple linear regression.
 * @param {Array<[number, number]>} points - [[x, y], ...]
 * @returns {{ slope: number, intercept: number, r2: number, predict: (x: number) => number }}
 */
export function linearRegression(points) {
    const n = points.length;
    if (n < 2) return { slope: 0, intercept: 0, r2: 0, predict: () => 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (const [x, y] of points) {
        sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; sumY2 += y * y;
    }

    const denom = n * sumX2 - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;

    // R-squared
    const meanY = sumY / n;
    const ssTot = sumY2 - n * meanY * meanY;
    const ssRes = points.reduce((s, [x, y]) => s + (y - (slope * x + intercept)) ** 2, 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { slope, intercept, r2, predict: (x) => slope * x + intercept };
}

/**
 * Polynomial regression (degree 2).
 * @param {Array<[number, number]>} points
 * @returns {{ coefficients: number[], r2: number, predict: (x: number) => number }}
 */
export function polynomialRegression(points) {
    const n = points.length;
    if (n < 3) {
        const lr = linearRegression(points);
        return { coefficients: [lr.intercept, lr.slope, 0], r2: lr.r2, predict: lr.predict };
    }

    // Normal equations for y = a + bx + cx²
    let sx = 0, sx2 = 0, sx3 = 0, sx4 = 0;
    let sy = 0, sxy = 0, sx2y = 0;

    for (const [x, y] of points) {
        const x2 = x * x;
        sx += x; sx2 += x2; sx3 += x * x2; sx4 += x2 * x2;
        sy += y; sxy += x * y; sx2y += x2 * y;
    }

    // Solve 3x3 system using Cramer's rule
    const A = [[n, sx, sx2], [sx, sx2, sx3], [sx2, sx3, sx4]];
    const B = [sy, sxy, sx2y];
    const det = det3(A);

    if (Math.abs(det) < 1e-10) return linearRegression(points);

    const a = det3([B, A[0].slice(1), A[1].slice(1), A[2].slice(1)].map((r, i) => {
        const row = [...A[i]]; row[0] = B[i]; return row;
    })) / det;
    const b = det3(A.map((r, i) => { const row = [...r]; row[1] = B[i]; return row; })) / det;
    const c = det3(A.map((r, i) => { const row = [...r]; row[2] = B[i]; return row; })) / det;

    const predict = (x) => a + b * x + c * x * x;
    const meanY = sy / n;
    const ssTot = points.reduce((s, [, y]) => s + (y - meanY) ** 2, 0);
    const ssRes = points.reduce((s, [x, y]) => s + (y - predict(x)) ** 2, 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { coefficients: [a, b, c], r2, predict };
}

function det3(m) {
    return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
        - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
        + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Descriptive Statistics
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Calculate the interquartile range.
 * @param {number[]} data
 * @returns {number}
 */
export function iqr(data) {
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    return q3 - q1;
}

/**
 * Pearson correlation coefficient.
 * @param {number[]} xs
 * @param {number[]} ys
 * @returns {number}
 */
export function correlation(xs, ys) {
    const n = Math.min(xs.length, ys.length);
    if (n < 2) return 0;

    const meanX = xs.reduce((s, v) => s + v, 0) / n;
    const meanY = ys.reduce((s, v) => s + v, 0) / n;

    let cov = 0, varX = 0, varY = 0;
    for (let i = 0; i < n; i++) {
        const dx = xs[i] - meanX;
        const dy = ys[i] - meanY;
        cov += dx * dy;
        varX += dx * dx;
        varY += dy * dy;
    }

    const denom = Math.sqrt(varX * varY);
    return denom > 0 ? cov / denom : 0;
}

/**
 * Z-score normalization.
 * @param {number[]} data
 * @returns {number[]}
 */
export function zScore(data) {
    const n = data.length;
    const mean = data.reduce((s, v) => s + v, 0) / n;
    const std = Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
    return std > 0 ? data.map(v => (v - mean) / std) : data.map(() => 0);
}

/**
 * Detect outliers using 1.5×IQR rule.
 * @param {number[]} data
 * @returns {{ outliers: number[], lower: number, upper: number }}
 */
export function detectOutliers(data) {
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const interquartile = q3 - q1;
    const lower = q1 - 1.5 * interquartile;
    const upper = q3 + 1.5 * interquartile;

    return {
        outliers: data.filter(v => v < lower || v > upper),
        lower,
        upper,
    };
}

/**
 * Calculate mode (most frequent value, binned for continuous data).
 * @param {number[]} data
 * @param {number} [bins=20]
 * @returns {number}
 */
export function mode(data, bins = 20) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / bins || 1;
    const counts = new Array(bins).fill(0);

    for (const v of data) {
        const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
        counts[idx]++;
    }

    const maxIdx = counts.indexOf(Math.max(...counts));
    return min + (maxIdx + 0.5) * binWidth;
}
