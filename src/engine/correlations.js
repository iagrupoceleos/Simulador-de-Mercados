/**
 * Prometheus Engine – Correlated Uncertainties (SIM-004)
 * Models correlation between competitor behaviors and market conditions.
 * Uses Cholesky decomposition for generating correlated random variates.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Cholesky Decomposition
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Compute Cholesky decomposition of a positive-definite matrix.
 * Returns lower-triangular matrix L such that A = L * L^T.
 * @param {number[][]} matrix - symmetric positive-definite correlation matrix
 * @returns {number[][]} lower-triangular matrix
 */
export function choleskyDecomposition(matrix) {
    const n = matrix.length;
    const L = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = 0;
            for (let k = 0; k < j; k++) {
                sum += L[i][k] * L[j][k];
            }
            if (i === j) {
                const val = matrix[i][i] - sum;
                L[i][j] = Math.sqrt(Math.max(0, val)); // clamp for numerical stability
            } else {
                L[i][j] = L[j][j] !== 0 ? (matrix[i][j] - sum) / L[j][j] : 0;
            }
        }
    }
    return L;
}

/**
 * Generate correlated standard normal variates using Cholesky decomposition.
 * @param {number[][]} correlationMatrix - correlation matrix
 * @param {object} rng - PRNG with .next() method
 * @returns {number[]} correlated standard normal samples
 */
export function generateCorrelatedNormals(correlationMatrix, rng) {
    const n = correlationMatrix.length;
    const L = choleskyDecomposition(correlationMatrix);

    // Generate independent standard normals (Box-Muller)
    const z = [];
    for (let i = 0; i < n; i++) {
        const u1 = Math.max(1e-10, rng.next());
        const u2 = rng.next();
        z.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
    }

    // Apply Cholesky factor
    const correlated = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            correlated[i] += L[i][j] * z[j];
        }
    }
    return correlated;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Market Correlation Presets
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Pre-defined correlation structures for common market relationships.
 * Variables: [demand, price_elasticity, competitor_aggression, supply_risk]
 */
export const MARKET_CORRELATIONS = {
    /** Strong recession pattern: demand↓ + competitor aggression↑ */
    recession: {
        labels: ['demand', 'price_elasticity', 'competitor_aggression', 'supply_risk'],
        matrix: [
            [1.00, 0.60, -0.50, 0.30],
            [0.60, 1.00, -0.30, 0.10],
            [-0.50, -0.30, 1.00, 0.20],
            [0.30, 0.10, 0.20, 1.00],
        ],
    },
    /** Growth market: high demand, low aggressiveness */
    growth: {
        labels: ['demand', 'price_elasticity', 'competitor_aggression', 'supply_risk'],
        matrix: [
            [1.00, 0.30, -0.20, -0.10],
            [0.30, 1.00, -0.10, 0.05],
            [-0.20, -0.10, 1.00, 0.10],
            [-0.10, 0.05, 0.10, 1.00],
        ],
    },
    /** Independent: no correlation between variables */
    independent: {
        labels: ['demand', 'price_elasticity', 'competitor_aggression', 'supply_risk'],
        matrix: [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ],
    },
};

/**
 * Apply correlated shocks to NGC scenario parameters.
 * @param {object} scenario - NGC sampled scenario
 * @param {string} preset - key from MARKET_CORRELATIONS
 * @param {object} rng - PRNG
 * @param {number} [intensity=1] - shock intensity multiplier
 * @returns {object} modified scenario
 */
export function applyCorrelatedShocks(scenario, preset, rng, intensity = 1) {
    const corr = MARKET_CORRELATIONS[preset] || MARKET_CORRELATIONS.independent;
    const shocks = generateCorrelatedNormals(corr.matrix, rng);

    // Map correlated normals to scenario adjustments
    const adjustments = {};
    corr.labels.forEach((label, i) => {
        adjustments[label] = shocks[i] * intensity * 0.1; // scale to ±10% impact
    });

    // Apply demand shock
    if (scenario.company) {
        scenario.company.demandShock = 1 + (adjustments.demand || 0);
    }

    // Apply price elasticity shock
    if (scenario.company) {
        scenario.company.priceElasticityShock = 1 + (adjustments.price_elasticity || 0);
    }

    // Apply competitor aggression shock
    if (scenario.competitors) {
        for (const key of Object.keys(scenario.competitors)) {
            scenario.competitors[key].aggressionShock = 1 + (adjustments.competitor_aggression || 0);
        }
    }

    // Apply supply risk shock
    if (scenario.riskEvents) {
        scenario.supplyShock = 1 + (adjustments.supply_risk || 0);
    }

    scenario._correlatedAdjustments = adjustments;
    return scenario;
}
