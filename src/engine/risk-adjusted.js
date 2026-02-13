/**
 * Prometheus Engine – Risk-Adjusted Return Metrics (STR-005)
 * Sharpe ratio, Sortino ratio, and related risk-adjusted performance measures.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Risk-Adjusted Returns
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Calculate Sharpe Ratio.
 * Sharpe = (E[R] - Rf) / σ(R)
 * @param {number[]} returns - array of period returns
 * @param {number} [riskFreeRate=0] - risk-free rate per period
 * @returns {number} Sharpe ratio
 */
export function sharpeRatio(returns, riskFreeRate = 0) {
    const n = returns.length;
    if (n < 2) return 0;

    const mean = returns.reduce((s, v) => s + v, 0) / n;
    const std = Math.sqrt(returns.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));

    return std > 0 ? (mean - riskFreeRate) / std : 0;
}

/**
 * Calculate Sortino Ratio (only penalizes downside volatility).
 * Sortino = (E[R] - Rf) / σ_down(R)
 * @param {number[]} returns
 * @param {number} [targetReturn=0]
 * @returns {number}
 */
export function sortinoRatio(returns, targetReturn = 0) {
    const n = returns.length;
    if (n < 2) return 0;

    const mean = returns.reduce((s, v) => s + v, 0) / n;
    const downsideReturns = returns.filter(r => r < targetReturn);

    if (downsideReturns.length === 0) return Infinity; // no downside = infinite Sortino

    const downsideDeviation = Math.sqrt(
        downsideReturns.reduce((s, v) => s + (v - targetReturn) ** 2, 0) / downsideReturns.length
    );

    return downsideDeviation > 0 ? (mean - targetReturn) / downsideDeviation : 0;
}

/**
 * Calculate Maximum Drawdown.
 * @param {number[]} cumulativeValues - array of cumulative portfolio values
 * @returns {object} { maxDrawdown, drawdownPct, peakIdx, troughIdx }
 */
export function maxDrawdown(cumulativeValues) {
    let peak = -Infinity;
    let maxDD = 0;
    let peakIdx = 0;
    let troughIdx = 0;
    let currentPeakIdx = 0;

    for (let i = 0; i < cumulativeValues.length; i++) {
        if (cumulativeValues[i] > peak) {
            peak = cumulativeValues[i];
            currentPeakIdx = i;
        }
        const dd = peak > 0 ? (peak - cumulativeValues[i]) / peak : 0;
        if (dd > maxDD) {
            maxDD = dd;
            peakIdx = currentPeakIdx;
            troughIdx = i;
        }
    }

    return {
        maxDrawdown: maxDD,
        drawdownPct: (maxDD * 100).toFixed(2),
        peakIdx,
        troughIdx,
    };
}

/**
 * Calculate Calmar Ratio (annualized return / max drawdown).
 * @param {number[]} returns
 * @param {number[]} cumulativeValues
 * @param {number} periodsPerYear
 * @returns {number}
 */
export function calmarRatio(returns, cumulativeValues, periodsPerYear = 52) {
    const meanReturn = returns.reduce((s, v) => s + v, 0) / returns.length;
    const annualizedReturn = meanReturn * periodsPerYear;
    const { maxDrawdown: mdd } = maxDrawdown(cumulativeValues);

    return mdd > 0 ? annualizedReturn / mdd : 0;
}

/**
 * Calculate Information Ratio.
 * IR = (R_p - R_b) / tracking_error
 * @param {number[]} portfolioReturns
 * @param {number[]} benchmarkReturns
 * @returns {number}
 */
export function informationRatio(portfolioReturns, benchmarkReturns) {
    const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
    if (n < 2) return 0;

    const activeReturns = portfolioReturns.slice(0, n).map((r, i) => r - benchmarkReturns[i]);
    const mean = activeReturns.reduce((s, v) => s + v, 0) / n;
    const trackingError = Math.sqrt(activeReturns.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));

    return trackingError > 0 ? mean / trackingError : 0;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Full Risk-Adjusted Report
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Generate a comprehensive risk-adjusted return report from MC results.
 * @param {object} mcResults
 * @returns {object}
 */
export function generateRiskAdjustedReport(mcResults) {
    const raw = mcResults?.rawResults;
    if (!raw || raw.length === 0) return null;

    const rois = raw.map(r => r.roi / 100);
    const profits = raw.map(r => r.netProfit);
    const cumulativeProfit = profits.reduce((acc, p, i) => {
        acc.push(i === 0 ? p : acc[i - 1] + p);
        return acc;
    }, []);

    const sharpe = sharpeRatio(rois);
    const sortino = sortinoRatio(rois);
    const dd = maxDrawdown(cumulativeProfit);
    const calmar = calmarRatio(rois, cumulativeProfit);

    // Rating
    let grade;
    if (sharpe > 2 && sortino > 3) grade = 'A+';
    else if (sharpe > 1.5 && sortino > 2) grade = 'A';
    else if (sharpe > 1) grade = 'B';
    else if (sharpe > 0.5) grade = 'C';
    else grade = 'D';

    return {
        sharpe,
        sortino,
        maxDrawdown: dd,
        calmar,
        grade,
        interpretation: grade === 'A+' || grade === 'A'
            ? 'Excelente rendimiento ajustado al riesgo'
            : grade === 'B'
                ? 'Rendimiento aceptable con riesgo moderado'
                : grade === 'C'
                    ? 'Rendimiento marginal, considerar ajustes'
                    : 'Alto riesgo relativo al retorno, reevaluar estrategia',
    };
}
