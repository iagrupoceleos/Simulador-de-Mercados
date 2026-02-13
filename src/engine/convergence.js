/**
 * Prometheus Engine – Convergence Diagnostic (DS-002)
 * Detects when Monte Carlo results have converged, tracks running statistics.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Running Statistics (Welford's Online Algorithm)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Welford's online algorithm for computing running mean and variance.
 */
export class RunningStats {
    constructor() {
        this.n = 0;
        this.mean = 0;
        this.M2 = 0;
        this.min = Infinity;
        this.max = -Infinity;
    }

    /** Add a new observation. */
    push(x) {
        this.n++;
        const delta = x - this.mean;
        this.mean += delta / this.n;
        const delta2 = x - this.mean;
        this.M2 += delta * delta2;
        this.min = Math.min(this.min, x);
        this.max = Math.max(this.max, x);
    }

    /** Population variance. */
    get variance() {
        return this.n > 1 ? this.M2 / this.n : 0;
    }

    /** Standard deviation. */
    get std() {
        return Math.sqrt(this.variance);
    }

    /** Standard error of the mean. */
    get sem() {
        return this.n > 1 ? this.std / Math.sqrt(this.n) : Infinity;
    }

    /** Coefficient of variation of the mean estimate (convergence metric). */
    get cvMean() {
        return Math.abs(this.mean) > 1e-10 ? (this.sem / Math.abs(this.mean)) * 100 : Infinity;
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Convergence Tracker
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Tracks convergence of multiple KPIs during simulation.
 */
export class ConvergenceTracker {
    /**
     * @param {string[]} kpiNames - KPIs to track
     * @param {number} [checkInterval=10] - check convergence every N iterations
     * @param {number} [threshold=1.0] - convergence threshold (% CV of mean)
     */
    constructor(kpiNames = ['netProfit', 'roi', 'unitsSold'], checkInterval = 10, threshold = 1.0) {
        this.kpiNames = kpiNames;
        this.checkInterval = checkInterval;
        this.threshold = threshold;
        this.stats = {};
        this.history = [];
        this.converged = false;
        this.convergedAt = null;

        for (const kpi of kpiNames) {
            this.stats[kpi] = new RunningStats();
        }
    }

    /**
     * Record a single simulation result.
     * @param {object} result - raw single-run result
     * @returns {{ converged: boolean, snapshot: object }|null}
     */
    record(result) {
        for (const kpi of this.kpiNames) {
            const value = result[kpi];
            if (value != null) {
                this.stats[kpi].push(value);
            }
        }

        const n = this.stats[this.kpiNames[0]].n;

        // Check convergence at intervals
        if (n % this.checkInterval === 0) {
            const snapshot = this._createSnapshot(n);
            this.history.push(snapshot);

            // Check if ALL KPIs have converged
            if (!this.converged && snapshot.allConverged) {
                this.converged = true;
                this.convergedAt = n;
            }

            return snapshot;
        }
        return null;
    }

    _createSnapshot(iteration) {
        const kpis = {};
        let allConverged = true;

        for (const kpi of this.kpiNames) {
            const s = this.stats[kpi];
            const isConverged = s.cvMean <= this.threshold && s.n >= 20;
            kpis[kpi] = {
                mean: s.mean,
                std: s.std,
                sem: s.sem,
                cvMean: s.cvMean,
                n: s.n,
                converged: isConverged,
            };
            if (!isConverged) allConverged = false;
        }

        return {
            iteration,
            kpis,
            allConverged,
        };
    }

    /**
     * Get chart-ready convergence data.
     * @returns {{ iterations: number[], series: Object<string, {mean: number[], upperCI: number[], lowerCI: number[]}> }}
     */
    getChartData() {
        const iterations = this.history.map(h => h.iteration);
        const series = {};

        for (const kpi of this.kpiNames) {
            series[kpi] = {
                mean: this.history.map(h => h.kpis[kpi].mean),
                upperCI: this.history.map(h => h.kpis[kpi].mean + 1.96 * h.kpis[kpi].sem),
                lowerCI: this.history.map(h => h.kpis[kpi].mean - 1.96 * h.kpis[kpi].sem),
                cvMean: this.history.map(h => h.kpis[kpi].cvMean),
            };
        }

        return { iterations, series, convergedAt: this.convergedAt };
    }
}
