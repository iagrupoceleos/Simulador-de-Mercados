/**
 * Prometheus Engine – Multi-Armed Bandit (AI-006)
 * Price exploration vs exploitation using Thompson Sampling and UCB1.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Thompson Sampling (Bayesian Bandit)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Thompson Sampling bandit for price optimization.
 * Uses Beta distribution posteriors.
 */
export class ThompsonSamplingBandit {
    /**
     * @param {number[]} arms - available price points
     */
    constructor(arms) {
        this.arms = arms;
        this.alpha = arms.map(() => 1); // prior successes
        this.beta = arms.map(() => 1);  // prior failures
        this.pulls = arms.map(() => 0);
        this.totalReward = arms.map(() => 0);
        this.history = [];
    }

    /**
     * Select an arm using Thompson Sampling.
     * @returns {object} { armIndex, price }
     */
    selectArm() {
        const samples = this.arms.map((_, i) =>
            sampleBeta(this.alpha[i], this.beta[i])
        );
        const selected = samples.indexOf(Math.max(...samples));
        return { armIndex: selected, price: this.arms[selected] };
    }

    /**
     * Update with reward (0-1 normalized).
     * @param {number} armIndex
     * @param {number} reward - between 0 and 1
     */
    update(armIndex, reward) {
        this.pulls[armIndex]++;
        this.totalReward[armIndex] += reward;

        // Interpret reward > 0.5 as "success"
        if (reward > 0.5) {
            this.alpha[armIndex] += 1;
        } else {
            this.beta[armIndex] += 1;
        }

        this.history.push({ arm: armIndex, price: this.arms[armIndex], reward });
    }

    /** Get expected value per arm */
    getExpectedValues() {
        return this.arms.map((price, i) => ({
            price,
            expectedValue: this.alpha[i] / (this.alpha[i] + this.beta[i]),
            pulls: this.pulls[i],
            avgReward: this.pulls[i] > 0 ? this.totalReward[i] / this.pulls[i] : 0,
        }));
    }

    /** Get the best arm */
    getBestArm() {
        const values = this.getExpectedValues();
        values.sort((a, b) => b.expectedValue - a.expectedValue);
        return values[0];
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  UCB1 (Upper Confidence Bound)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * UCB1 bandit for price optimization.
 * Balances exploration/exploitation with confidence bonus.
 */
export class UCB1Bandit {
    constructor(arms) {
        this.arms = arms;
        this.pulls = arms.map(() => 0);
        this.totalReward = arms.map(() => 0);
        this.totalPulls = 0;
    }

    selectArm() {
        // Force exploration if any arm hasn't been pulled
        const unpulled = this.pulls.findIndex(p => p === 0);
        if (unpulled !== -1) return { armIndex: unpulled, price: this.arms[unpulled] };

        const ucbValues = this.arms.map((_, i) => {
            const avgReward = this.totalReward[i] / this.pulls[i];
            const exploration = Math.sqrt((2 * Math.log(this.totalPulls)) / this.pulls[i]);
            return avgReward + exploration;
        });

        const selected = ucbValues.indexOf(Math.max(...ucbValues));
        return { armIndex: selected, price: this.arms[selected] };
    }

    update(armIndex, reward) {
        this.pulls[armIndex]++;
        this.totalReward[armIndex] += reward;
        this.totalPulls++;
    }

    getExpectedValues() {
        return this.arms.map((price, i) => ({
            price,
            avgReward: this.pulls[i] > 0 ? this.totalReward[i] / this.pulls[i] : 0,
            pulls: this.pulls[i],
        }));
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Price Optimization Runner
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Run a multi-armed bandit price optimization simulation.
 * @param {object} config
 * @param {number[]} config.pricePoints - candidate prices
 * @param {Function} config.rewardFn - (price) => reward (0-1)
 * @param {number} [config.rounds=200] - exploration rounds
 * @param {string} [config.algorithm='thompson'] - 'thompson' or 'ucb1'
 * @returns {object} optimization results
 */
export function runPriceOptimization(config) {
    const {
        pricePoints,
        rewardFn,
        rounds = 200,
        algorithm = 'thompson',
    } = config;

    const bandit = algorithm === 'ucb1'
        ? new UCB1Bandit(pricePoints)
        : new ThompsonSamplingBandit(pricePoints);

    const rewardTimeline = [];

    for (let r = 0; r < rounds; r++) {
        const { armIndex, price } = bandit.selectArm();
        const reward = rewardFn(price);
        bandit.update(armIndex, reward);
        rewardTimeline.push({
            round: r + 1,
            price,
            reward,
            cumulativeAvg: rewardTimeline.length > 0
                ? (rewardTimeline.reduce((s, t) => s + t.reward, 0) + reward) / (r + 1)
                : reward,
        });
    }

    const values = bandit.getExpectedValues();
    values.sort((a, b) => (b.avgReward || b.expectedValue || 0) - (a.avgReward || a.expectedValue || 0));

    return {
        algorithm,
        rounds,
        bestPrice: values[0].price,
        bestReward: values[0].avgReward || values[0].expectedValue,
        armResults: values,
        convergence: rewardTimeline,
        explorationRatio: values.filter(v => v.pulls < rounds * 0.1).length / values.length,
    };
}

// ━━━━━━━━━━ Helpers ━━━━━━━━━━

function sampleBeta(alpha, beta) {
    // Approximation using Gamma sampling
    const x = sampleGamma(alpha);
    const y = sampleGamma(beta);
    return x / (x + y);
}

function sampleGamma(shape) {
    if (shape < 1) {
        return sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
        let x, v;
        do {
            x = boxMullerZ();
            v = 1 + c * x;
        } while (v <= 0);
        v = v * v * v;
        const u = Math.random();
        if (u < 1 - 0.0331 * x * x * x * x) return d * v;
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
}

function boxMullerZ() {
    return Math.sqrt(-2 * Math.log(Math.random() || 1e-10)) * Math.cos(2 * Math.PI * Math.random());
}
