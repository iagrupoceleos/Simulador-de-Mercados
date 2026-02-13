/**
 * Prometheus Engine – Multi-Objective Reward Function (AI-003)
 * Combines profit, market share, and survival into a single RL reward signal.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Reward Components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Default weights for the multi-objective reward.
 * Sum to 1.0 for proper scaling.
 */
export const DEFAULT_REWARD_WEIGHTS = {
    profit: 0.40,
    marketShare: 0.25,
    survival: 0.20,
    efficiency: 0.15,
};

/**
 * Compute the multi-objective reward for an RL agent.
 * @param {object} state - current simulation state
 * @param {object} [weights] - override default weights
 * @returns {{ total: number, components: object }}
 */
export function computeReward(state, weights = DEFAULT_REWARD_WEIGHTS) {
    const {
        weeklyProfit = 0,
        targetProfit = 1000,
        marketShare = 0,
        targetShare = 0.20,
        inventory = 0,
        initialInventory = 1000,
        totalWeeks = 26,
        currentWeek = 0,
        isAlive = true,         // has the company survived?
        cashFlow = 0,
        salesVelocity = 0,      // units/week
        targetVelocity = 50,
    } = state;

    // 1. Profit reward: normalized around target
    const profitReward = targetProfit !== 0
        ? Math.tanh(weeklyProfit / Math.abs(targetProfit))  // tanh for bounded output
        : 0;

    // 2. Market share reward: how close to target share
    const shareReward = targetShare > 0
        ? Math.min(marketShare / targetShare, 1.5) - 0.5  // bonus for exceeding, penalty for under
        : 0;

    // 3. Survival reward: penalty for bankruptcy/stock-out
    let survivalReward = 1.0;
    if (!isAlive) survivalReward = -2.0; // heavy penalty for death
    if (inventory <= 0 && currentWeek < totalWeeks * 0.8) {
        survivalReward -= 0.5; // penalty for early stock-out
    }
    if (cashFlow < 0) {
        survivalReward -= 0.3; // penalty for negative cash flow
    }

    // 4. Efficiency reward: inventory turnover
    const inventoryRatio = initialInventory > 0 ? inventory / initialInventory : 1;
    const timeRatio = currentWeek / Math.max(1, totalWeeks);
    const expectedRatio = Math.max(0, 1 - timeRatio); // expected remaining inventory
    const efficiencyReward = 1 - Math.abs(inventoryRatio - expectedRatio) * 2;

    // Compose total reward
    const components = {
        profit: profitReward,
        marketShare: shareReward,
        survival: survivalReward,
        efficiency: efficiencyReward,
    };

    const total = Object.keys(weights).reduce((sum, key) => {
        return sum + (weights[key] || 0) * (components[key] || 0);
    }, 0);

    return { total, components };
}

/**
 * Preset reward configurations for different strategies.
 */
export const REWARD_PRESETS = {
    /** Maximize short-term profit */
    aggressive: { profit: 0.60, marketShare: 0.20, survival: 0.10, efficiency: 0.10 },
    /** Balanced growth */
    balanced: { profit: 0.40, marketShare: 0.25, survival: 0.20, efficiency: 0.15 },
    /** Maximize market share (growth phase) */
    growth: { profit: 0.20, marketShare: 0.45, survival: 0.20, efficiency: 0.15 },
    /** Defensive / survival mode */
    defensive: { profit: 0.25, marketShare: 0.10, survival: 0.45, efficiency: 0.20 },
    /** Inventory liquidation */
    liquidation: { profit: 0.15, marketShare: 0.10, survival: 0.25, efficiency: 0.50 },
};
