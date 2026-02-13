/**
 * Prometheus Engine – Web Worker Pool for Monte Carlo (PERF-001)
 * Provides a lightweight worker pool abstraction for parallelizing MC iterations.
 * Falls back to main-thread execution when Web Workers aren't available.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Worker Pool
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Inline worker code generator for MC batch processing.
 * Creates a self-contained worker that can run simulation batches.
 */
function createWorkerBlob() {
    const code = `
        self.onmessage = function(e) {
            const { batchId, iterations, seed, config } = e.data;
            const results = [];
            
            // Simple PRNG (same as distributions.js)
            function prng(s) {
                let state = s;
                return () => {
                    state = (state * 1664525 + 1013904223) & 0xFFFFFFFF;
                    return (state >>> 0) / 4294967296;
                };
            }
            
            const rng = prng(seed);
            
            for (let i = 0; i < iterations; i++) {
                // Generate random variations for the batch
                results.push({
                    priceVariation: (rng() - 0.5) * 0.2,
                    demandVariation: (rng() - 0.5) * 0.3,
                    costVariation: (rng() - 0.5) * 0.1,
                    qualityVariation: (rng() - 0.5) * 0.15,
                    seed: (rng() * 2147483647) | 0,
                });
            }
            
            self.postMessage({ batchId, results });
        };
    `;
    return new Blob([code], { type: 'application/javascript' });
}

/**
 * Worker Pool for distributing MC iterations across threads.
 */
export class WorkerPool {
    /**
     * @param {number} [numWorkers] - number of workers (defaults to navigator.hardwareConcurrency - 1)
     */
    constructor(numWorkers) {
        this.maxWorkers = numWorkers || Math.max(1, (navigator?.hardwareConcurrency || 4) - 1);
        this.workers = [];
        this.taskQueue = [];
        this.activeWorkers = 0;
        this.isSupported = typeof Worker !== 'undefined' && typeof Blob !== 'undefined';
    }

    /**
     * Initialize the worker pool.
     */
    init() {
        if (!this.isSupported) return;

        const blob = createWorkerBlob();
        const url = URL.createObjectURL(blob);

        for (let i = 0; i < this.maxWorkers; i++) {
            try {
                const worker = new Worker(url);
                this.workers.push({ worker, busy: false });
            } catch (e) {
                console.warn('WorkerPool: Failed to create worker', e);
                this.isSupported = false;
                break;
            }
        }

        URL.revokeObjectURL(url);
    }

    /**
     * Distribute iterations across workers.
     * @param {number} totalIterations
     * @param {number} seed
     * @param {object} config
     * @returns {Promise<Array>}
     */
    async distribute(totalIterations, seed, config) {
        if (!this.isSupported || this.workers.length === 0) {
            return this._fallbackSequential(totalIterations, seed);
        }

        const batchSize = Math.ceil(totalIterations / this.workers.length);
        const promises = [];

        for (let i = 0; i < this.workers.length; i++) {
            const batchIterations = Math.min(batchSize, totalIterations - i * batchSize);
            if (batchIterations <= 0) break;

            promises.push(this._runBatch(i, {
                batchId: i,
                iterations: batchIterations,
                seed: seed + i * 1000,
                config,
            }));
        }

        const batchResults = await Promise.all(promises);
        return batchResults.flat();
    }

    /**
     * Run a batch on a specific worker.
     * @private
     */
    _runBatch(workerIdx, data) {
        return new Promise((resolve, reject) => {
            const { worker } = this.workers[workerIdx];
            worker.onmessage = (e) => resolve(e.data.results);
            worker.onerror = (e) => reject(e);
            worker.postMessage(data);
        });
    }

    /**
     * Fallback for when workers aren't available.
     * @private
     */
    _fallbackSequential(totalIterations, seed) {
        const results = [];
        let state = seed;
        for (let i = 0; i < totalIterations; i++) {
            state = (state * 1664525 + 1013904223) & 0xFFFFFFFF;
            const rng = (state >>> 0) / 4294967296;
            results.push({
                priceVariation: (rng - 0.5) * 0.2,
                demandVariation: (rng - 0.5) * 0.3,
                costVariation: (rng - 0.5) * 0.1,
                qualityVariation: (rng - 0.5) * 0.15,
                seed: (rng * 2147483647) | 0,
            });
        }
        return Promise.resolve(results);
    }

    /**
     * Get pool diagnostics.
     */
    getStats() {
        return {
            supported: this.isSupported,
            maxWorkers: this.maxWorkers,
            activeWorkers: this.workers.length,
            hardwareConcurrency: navigator?.hardwareConcurrency || 'unknown',
        };
    }

    /**
     * Terminate all workers.
     */
    destroy() {
        for (const { worker } of this.workers) {
            worker.terminate();
        }
        this.workers = [];
    }
}
