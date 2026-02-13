/**
 * Prometheus Engine – Bayesian Updating (DS-007)
 * Update expert beliefs with observed data using Bayes' theorem.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Bayesian Belief Updater
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Normal-Normal conjugate update (known variance).
 * Prior: N(mu0, sigma0²), Likelihood: N(mu, sigma²)
 * @param {object} prior - { mean, std }
 * @param {number[]} observations
 * @param {number} likelihoodStd - known std of observations
 * @returns {object} posterior { mean, std, n, credibleInterval }
 */
export function normalNormalUpdate(prior, observations, likelihoodStd) {
    const n = observations.length;
    if (n === 0) return { ...prior, n: 0, credibleInterval: [prior.mean - 1.96 * prior.std, prior.mean + 1.96 * prior.std] };

    const sampleMean = observations.reduce((s, v) => s + v, 0) / n;
    const priorPrecision = 1 / (prior.std ** 2);
    const likelihoodPrecision = n / (likelihoodStd ** 2);

    const posteriorPrecision = priorPrecision + likelihoodPrecision;
    const posteriorMean = (priorPrecision * prior.mean + likelihoodPrecision * sampleMean) / posteriorPrecision;
    const posteriorStd = Math.sqrt(1 / posteriorPrecision);

    return {
        mean: posteriorMean,
        std: posteriorStd,
        n,
        credibleInterval: [posteriorMean - 1.96 * posteriorStd, posteriorMean + 1.96 * posteriorStd],
        priorWeight: priorPrecision / posteriorPrecision,
        dataWeight: likelihoodPrecision / posteriorPrecision,
    };
}

/**
 * Beta-Binomial conjugate update (for probability estimation).
 * Prior: Beta(alpha, beta), Likelihood: Binomial(n, p)
 * @param {object} prior - { alpha, beta }
 * @param {number} successes
 * @param {number} failures
 * @returns {object} posterior
 */
export function betaBinomialUpdate(prior, successes, failures) {
    const postAlpha = prior.alpha + successes;
    const postBeta = prior.beta + failures;
    const mean = postAlpha / (postAlpha + postBeta);
    const variance = (postAlpha * postBeta) / ((postAlpha + postBeta) ** 2 * (postAlpha + postBeta + 1));

    return {
        alpha: postAlpha,
        beta: postBeta,
        mean,
        std: Math.sqrt(variance),
        mode: (postAlpha > 1 && postBeta > 1) ? (postAlpha - 1) / (postAlpha + postBeta - 2) : mean,
        credibleInterval: betaQuantiles(postAlpha, postBeta),
        n: successes + failures,
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Expert Belief Manager
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Manage beliefs for multiple parameters.
 */
export class BeliefManager {
    constructor() {
        this.beliefs = new Map();
    }

    /**
     * Register a belief with a prior.
     * @param {string} paramName
     * @param {object} prior - { type: 'normal'|'beta', ... }
     */
    registerBelief(paramName, prior) {
        this.beliefs.set(paramName, {
            prior,
            current: { ...prior },
            history: [{ ...prior, observation: 'prior' }],
        });
    }

    /**
     * Update a belief with new data.
     * @param {string} paramName
     * @param {number[]|{successes: number, failures: number}} data
     * @param {number} [likelihoodStd]
     * @returns {object} updated belief
     */
    updateBelief(paramName, data, likelihoodStd) {
        const belief = this.beliefs.get(paramName);
        if (!belief) throw new Error(`Unknown parameter: ${paramName}`);

        let posterior;
        if (belief.current.type === 'normal') {
            const obs = Array.isArray(data) ? data : [data];
            const std = likelihoodStd || belief.current.std * 2;
            posterior = { type: 'normal', ...normalNormalUpdate(belief.current, obs, std) };
        } else if (belief.current.type === 'beta') {
            const { successes = 0, failures = 0 } = data;
            posterior = { type: 'beta', ...betaBinomialUpdate(belief.current, successes, failures) };
        }

        belief.current = posterior;
        belief.history.push({ ...posterior, timestamp: Date.now() });
        return posterior;
    }

    /**
     * Get current belief for a parameter.
     * @param {string} paramName
     */
    getBelief(paramName) {
        return this.beliefs.get(paramName)?.current || null;
    }

    /**
     * Get all beliefs summary.
     */
    getSummary() {
        const summary = {};
        for (const [name, belief] of this.beliefs) {
            summary[name] = {
                type: belief.current.type,
                mean: belief.current.mean,
                std: belief.current.std,
                ci: belief.current.credibleInterval,
                updates: belief.history.length - 1,
            };
        }
        return summary;
    }

    /**
     * Get the update history for a parameter.
     * @param {string} paramName
     */
    getHistory(paramName) {
        return this.beliefs.get(paramName)?.history || [];
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Approximate Beta distribution quantiles (2.5%, 97.5%) using Normal approximation.
 */
function betaQuantiles(alpha, beta) {
    const mean = alpha / (alpha + beta);
    const std = Math.sqrt((alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1)));
    return [Math.max(0, mean - 1.96 * std), Math.min(1, mean + 1.96 * std)];
}
