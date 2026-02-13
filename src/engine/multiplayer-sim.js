/**
 * Prometheus Engine – Multi-Player Competitive Simulation (SIM-009)
 * 3+ simultaneous strategies competing in the same market.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Player Strategies
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const STRATEGIES = {
    AGGRESSIVE: {
        name: 'Agresiva',
        icon: '⚔️',
        priceMultiplier: 0.85,
        marketingMultiplier: 1.3,
        qualityMultiplier: 1.0,
    },
    PREMIUM: {
        name: 'Premium',
        icon: '💎',
        priceMultiplier: 1.20,
        marketingMultiplier: 1.1,
        qualityMultiplier: 1.3,
    },
    VALUE: {
        name: 'Valor',
        icon: '🏷️',
        priceMultiplier: 0.90,
        marketingMultiplier: 0.9,
        qualityMultiplier: 0.95,
    },
    NICHE: {
        name: 'Nicho',
        icon: '🎯',
        priceMultiplier: 1.10,
        marketingMultiplier: 0.7,
        qualityMultiplier: 1.15,
    },
    BALANCED: {
        name: 'Equilibrada',
        icon: '⚖️',
        priceMultiplier: 1.0,
        marketingMultiplier: 1.0,
        qualityMultiplier: 1.0,
    },
};

/**
 * Create a player.
 * @param {string} name
 * @param {string} strategyKey - key from STRATEGIES
 * @param {object} [overrides]
 * @returns {object}
 */
export function createPlayer(name, strategyKey = 'BALANCED', overrides = {}) {
    const strategy = STRATEGIES[strategyKey] || STRATEGIES.BALANCED;
    return {
        name,
        strategy: strategyKey,
        strategyLabel: strategy.name,
        icon: strategy.icon,
        basePrice: overrides.basePrice || 100,
        price: (overrides.basePrice || 100) * strategy.priceMultiplier,
        marketingBudget: (overrides.marketingBudget || 10000) * strategy.marketingMultiplier,
        quality: (overrides.quality || 70) * strategy.qualityMultiplier,
        marketShare: 0,
        revenue: 0,
        profit: 0,
        cogs: overrides.cogs || 50,
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Multi-Player Simulation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Run a multi-player competitive simulation.
 * @param {object} config
 * @param {object[]} config.players - from createPlayer()
 * @param {number} config.marketSize - total addressable market (units)
 * @param {number} [config.weeks=26]
 * @param {number} [config.priceElasticity=-1.5]
 * @returns {object} simulation results
 */
export function runMultiPlayerSim(config) {
    const { players, marketSize, weeks = 26, priceElasticity = -1.5 } = config;

    const n = players.length;
    const weeklyResults = [];
    const cumulative = players.map(() => ({ revenue: 0, profit: 0, sales: 0 }));

    for (let w = 1; w <= weeks; w++) {
        // Calculate attractiveness scores (price/quality/marketing blend)
        const scores = players.map(p => {
            const priceScore = Math.pow(p.price / 100, priceElasticity);
            const qualityScore = p.quality / 100;
            const marketingScore = Math.log(1 + p.marketingBudget / 5000);
            return Math.max(0.01, priceScore * 0.4 + qualityScore * 0.35 + marketingScore * 0.25);
        });

        const totalScore = scores.reduce((a, b) => a + b, 0);
        const shares = scores.map(s => s / totalScore);

        // Weekly seasonal demand
        const seasonalFactor = 1 + 0.15 * Math.sin(w * Math.PI / 13);
        const weeklyDemand = Math.round(marketSize / weeks * seasonalFactor);

        const weekData = { week: w, players: [] };

        for (let p = 0; p < n; p++) {
            const sales = Math.round(weeklyDemand * shares[p]);
            const revenue = sales * players[p].price;
            const cost = sales * players[p].cogs + players[p].marketingBudget / weeks;
            const profit = revenue - cost;

            players[p].marketShare = shares[p];
            players[p].revenue = revenue;
            players[p].profit = profit;

            cumulative[p].revenue += revenue;
            cumulative[p].profit += profit;
            cumulative[p].sales += sales;

            weekData.players.push({
                name: players[p].name,
                sales,
                revenue: Math.round(revenue),
                profit: Math.round(profit),
                marketShare: Math.round(shares[p] * 1000) / 10,
            });
        }

        weeklyResults.push(weekData);
    }

    // Final standings
    const standings = players.map((p, i) => ({
        rank: 0,
        name: p.name,
        strategy: p.strategyLabel,
        icon: p.icon,
        totalRevenue: Math.round(cumulative[i].revenue),
        totalProfit: Math.round(cumulative[i].profit),
        totalSales: cumulative[i].sales,
        avgMarketShare: Math.round(cumulative[i].sales / (marketSize || 1) * 1000) / 10,
        roi: cumulative[i].revenue > 0
            ? Math.round(cumulative[i].profit / (p.marketingBudget || 1) * 100) / 100
            : 0,
    }));

    standings.sort((a, b) => b.totalProfit - a.totalProfit);
    standings.forEach((s, i) => s.rank = i + 1);

    return { standings, weeklyResults, totalWeeks: weeks, marketSize };
}
