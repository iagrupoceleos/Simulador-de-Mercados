/**
 * Prometheus Engine – Object Allocation Optimization (PERF-002)
 * Pre-allocated object pools and struct-of-arrays patterns
 * to reduce GC pressure during Monte Carlo iterations.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Object Pool
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Generic object pool to reuse objects instead of allocating new ones.
 * @template T
 */
export class ObjectPool {
    /**
     * @param {() => T} factory - creates a new object
     * @param {(obj: T) => void} reset - resets an object for reuse
     * @param {number} [initialSize=100]
     */
    constructor(factory, reset, initialSize = 100) {
        this.factory = factory;
        this.resetFn = reset;
        this.pool = [];
        this.activeCount = 0;

        // Pre-allocate
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(factory());
        }
    }

    /** Acquire an object from the pool. */
    acquire() {
        this.activeCount++;
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return this.factory();
    }

    /** Release an object back to the pool. */
    release(obj) {
        this.activeCount--;
        this.resetFn(obj);
        this.pool.push(obj);
    }

    /** Release all objects. */
    releaseAll(objects) {
        for (const obj of objects) {
            this.release(obj);
        }
    }

    /** Get pool stats. */
    get stats() {
        return {
            available: this.pool.length,
            active: this.activeCount,
            total: this.pool.length + this.activeCount,
        };
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Struct-of-Arrays for MC Results
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Pre-allocated typed arrays for Monte Carlo iteration results.
 * Much more memory-efficient than arrays of objects.
 */
export class MCResultBuffer {
    /**
     * @param {number} capacity - max iterations
     */
    constructor(capacity) {
        this.capacity = capacity;
        this.length = 0;

        // Core KPIs as typed arrays
        this.totalSales = new Float64Array(capacity);
        this.revenue = new Float64Array(capacity);
        this.grossProfit = new Float64Array(capacity);
        this.netProfit = new Float64Array(capacity);
        this.roi = new Float64Array(capacity);
        this.marginPct = new Float64Array(capacity);
        this.inventoryRemaining = new Float64Array(capacity);
        this.unsoldPct = new Float64Array(capacity);
        this.breakEvenWeek = new Int16Array(capacity);
    }

    /**
     * Push a result into the buffer.
     * @param {object} result - simulation result object
     */
    push(result) {
        if (this.length >= this.capacity) return;
        const i = this.length++;

        this.totalSales[i] = result.totalUnitsSold ?? 0;
        this.revenue[i] = result.revenue ?? 0;
        this.grossProfit[i] = result.grossProfit ?? 0;
        this.netProfit[i] = result.netProfit ?? 0;
        this.roi[i] = result.roi ?? 0;
        this.marginPct[i] = result.marginPct ?? 0;
        this.inventoryRemaining[i] = result.inventoryRemaining ?? 0;
        this.unsoldPct[i] = result.unsoldPct ?? 0;
        this.breakEvenWeek[i] = result.breakEvenWeek ?? -1;
    }

    /**
     * Get array slice for a specific KPI (for stats computation).
     * @param {string} kpi
     * @returns {Float64Array}
     */
    getKPI(kpi) {
        const arr = this[kpi];
        if (!arr) return new Float64Array(0);
        return arr.subarray(0, this.length);
    }

    /** Reset buffer for reuse. */
    reset() {
        this.length = 0;
        // No need to zero arrays — push() overwrites
    }

    /** Get memory usage estimate in bytes. */
    get memoryUsage() {
        return this.capacity * 8 * 8 + this.capacity * 2; // 8 Float64 + 1 Int16
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Reusable Accumulator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Running accumulator for online stats (avoids storing all values).
 * Uses Welford's algorithm.
 */
export class OnlineAccumulator {
    constructor() {
        this.n = 0;
        this.mean = 0;
        this.m2 = 0;
        this.min = Infinity;
        this.max = -Infinity;
    }

    push(value) {
        this.n++;
        const delta = value - this.mean;
        this.mean += delta / this.n;
        const delta2 = value - this.mean;
        this.m2 += delta * delta2;
        this.min = Math.min(this.min, value);
        this.max = Math.max(this.max, value);
    }

    get variance() {
        return this.n > 1 ? this.m2 / (this.n - 1) : 0;
    }

    get std() {
        return Math.sqrt(this.variance);
    }

    get stats() {
        return {
            n: this.n,
            mean: this.mean,
            std: this.std,
            min: this.min,
            max: this.max,
        };
    }

    reset() {
        this.n = 0;
        this.mean = 0;
        this.m2 = 0;
        this.min = Infinity;
        this.max = -Infinity;
    }
}
