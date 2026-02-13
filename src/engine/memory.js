/**
 * Prometheus Engine – Memory Cleanup Utilities (PERF-003)
 * Explicit cleanup routines for MC results and large allocations.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Memory Manager
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Track and manage memory-intensive resources.
 */
export class MemoryManager {
    constructor() {
        this.tracked = new Map();
        this.peakMemory = 0;
    }

    /**
     * Track a disposable resource.
     * @param {string} key
     * @param {object} resource
     * @param {number} [estimatedBytes]
     */
    track(key, resource, estimatedBytes = 0) {
        // Dispose old resource if same key
        if (this.tracked.has(key)) {
            this.dispose(key);
        }
        this.tracked.set(key, { resource, bytes: estimatedBytes, created: Date.now() });
        this._updatePeak();
    }

    /**
     * Dispose a tracked resource.
     * @param {string} key
     */
    dispose(key) {
        const entry = this.tracked.get(key);
        if (!entry) return;

        const { resource } = entry;

        // Typed arrays
        if (resource instanceof ArrayBuffer || ArrayBuffer.isView(resource)) {
            // Can't explicitly free, but nullify reference
        }

        // Objects with cleanup methods
        if (typeof resource.destroy === 'function') resource.destroy();
        if (typeof resource.clear === 'function') resource.clear();

        // Arrays — truncate
        if (Array.isArray(resource)) resource.length = 0;

        this.tracked.delete(key);
    }

    /**
     * Dispose all tracked resources.
     */
    disposeAll() {
        for (const key of [...this.tracked.keys()]) {
            this.dispose(key);
        }
    }

    /**
     * Clean up Monte Carlo results, keeping only aggregated data.
     * Drops rawResults (the heaviest part) and distributions.
     * @param {object} mcResults
     * @returns {object} lightweight results
     */
    static compactMCResults(mcResults) {
        if (!mcResults) return mcResults;

        const {
            rawResults,
            distributions,
            ...compact
        } = mcResults;

        // Clear raw arrays to free memory
        if (rawResults) rawResults.length = 0;
        if (distributions) {
            for (const key of Object.keys(distributions)) {
                if (Array.isArray(distributions[key])) {
                    distributions[key].length = 0;
                }
            }
        }

        return compact;
    }

    /**
     * Estimate memory usage of an object (rough).
     * @param {any} obj
     * @returns {number} estimated bytes
     */
    static estimateSize(obj) {
        if (obj === null || obj === undefined) return 0;
        if (typeof obj === 'number') return 8;
        if (typeof obj === 'string') return obj.length * 2;
        if (typeof obj === 'boolean') return 4;
        if (ArrayBuffer.isView(obj)) return obj.byteLength;
        if (Array.isArray(obj)) {
            return 64 + obj.length * 8 + obj.reduce((s, v) => s + MemoryManager.estimateSize(v), 0);
        }
        if (typeof obj === 'object') {
            return 64 + Object.entries(obj).reduce((s, [k, v]) =>
                s + k.length * 2 + MemoryManager.estimateSize(v), 0);
        }
        return 8;
    }

    /**
     * Get memory diagnostics.
     */
    getStats() {
        const entries = [...this.tracked.entries()].map(([key, val]) => ({
            key,
            bytes: val.bytes,
            age: Date.now() - val.created,
        }));

        const totalBytes = entries.reduce((s, e) => s + e.bytes, 0);

        return {
            trackedCount: this.tracked.size,
            totalBytes,
            totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
            peakMB: (this.peakMemory / (1024 * 1024)).toFixed(2),
            entries,
        };
    }

    _updatePeak() {
        const totalBytes = [...this.tracked.values()].reduce((s, e) => s + e.bytes, 0);
        this.peakMemory = Math.max(this.peakMemory, totalBytes);
    }
}

/**
 * Cleanup helper: null-out large properties of a simulation run.
 * @param {object} simRun
 */
export function cleanupSimRun(simRun) {
    if (!simRun) return;
    if (simRun.weeklyResults) simRun.weeklyResults.length = 0;
    if (simRun.population) {
        simRun.population = null;
    }
}
