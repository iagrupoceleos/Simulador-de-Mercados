/**
 * Prometheus Engine – Experience Replay for RL Agent (AI-002)
 * Stores (state, action, reward, next_state) transitions for batch learning.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Replay Buffer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Circular replay buffer for storing transitions.
 * Supports uniform and prioritized sampling.
 */
export class ReplayBuffer {
    /**
     * @param {number} capacity - max number of transitions
     * @param {boolean} [prioritized=false] - use prioritized experience replay
     */
    constructor(capacity = 10000, prioritized = false) {
        this.capacity = capacity;
        this.prioritized = prioritized;
        this.buffer = [];
        this.position = 0;
        this.priorities = [];
        this.maxPriority = 1.0;
    }

    /** Number of stored transitions. */
    get size() {
        return this.buffer.length;
    }

    /**
     * Store a transition.
     * @param {number[]} state
     * @param {number} action
     * @param {number} reward
     * @param {number[]} nextState
     * @param {boolean} done
     */
    push(state, action, reward, nextState, done = false) {
        const transition = { state, action, reward, nextState, done };

        if (this.buffer.length < this.capacity) {
            this.buffer.push(transition);
            this.priorities.push(this.maxPriority);
        } else {
            this.buffer[this.position] = transition;
            this.priorities[this.position] = this.maxPriority;
        }

        this.position = (this.position + 1) % this.capacity;
    }

    /**
     * Sample a mini-batch of transitions.
     * @param {number} batchSize
     * @param {object} [rng] - PRNG for reproducibility
     * @returns {{ batch: Array, indices: number[] }}
     */
    sample(batchSize, rng = null) {
        const n = this.buffer.length;
        if (n === 0 || batchSize === 0) return { batch: [], indices: [] };

        const size = Math.min(batchSize, n);
        const indices = [];
        const batch = [];

        if (this.prioritized) {
            // Prioritized sampling (proportional)
            const totalPriority = this.priorities.slice(0, n).reduce((s, p) => s + p, 0);
            for (let i = 0; i < size; i++) {
                let target = (rng ? rng.next() : Math.random()) * totalPriority;
                let cumulative = 0;
                for (let j = 0; j < n; j++) {
                    cumulative += this.priorities[j];
                    if (cumulative >= target) {
                        indices.push(j);
                        batch.push(this.buffer[j]);
                        break;
                    }
                }
            }
        } else {
            // Uniform random sampling
            const selected = new Set();
            while (selected.size < size) {
                const idx = Math.floor((rng ? rng.next() : Math.random()) * n);
                if (!selected.has(idx)) {
                    selected.add(idx);
                    indices.push(idx);
                    batch.push(this.buffer[idx]);
                }
            }
        }

        return { batch, indices };
    }

    /**
     * Update priorities for prioritized replay.
     * @param {number[]} indices
     * @param {number[]} tdErrors - temporal difference errors
     * @param {number} [alpha=0.6] - prioritization exponent
     */
    updatePriorities(indices, tdErrors, alpha = 0.6) {
        if (!this.prioritized) return;

        for (let i = 0; i < indices.length; i++) {
            const priority = Math.pow(Math.abs(tdErrors[i]) + 1e-6, alpha);
            this.priorities[indices[i]] = priority;
            this.maxPriority = Math.max(this.maxPriority, priority);
        }
    }

    /**
     * Clear the buffer.
     */
    clear() {
        this.buffer = [];
        this.priorities = [];
        this.position = 0;
        this.maxPriority = 1.0;
    }

    /**
     * Get buffer statistics.
     */
    getStats() {
        if (this.buffer.length === 0) return { size: 0 };

        const rewards = this.buffer.map(t => t.reward);
        const avgReward = rewards.reduce((s, r) => s + r, 0) / rewards.length;
        const maxReward = Math.max(...rewards);
        const minReward = Math.min(...rewards);

        return {
            size: this.buffer.length,
            capacity: this.capacity,
            utilization: this.buffer.length / this.capacity,
            avgReward,
            maxReward,
            minReward,
            prioritized: this.prioritized,
        };
    }
}
