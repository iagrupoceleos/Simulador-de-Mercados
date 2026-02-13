/**
 * Prometheus Engine – Nash Equilibrium Detection (AI-005)
 * Detects and analyzes Nash equilibria in the competitive pricing game.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Nash Equilibrium Finder
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Build a payoff matrix for two-player pricing game.
 * @param {number[]} playerPrices - set of prices player can choose
 * @param {number[]} opponentPrices - set of prices opponent can choose
 * @param {Function} payoffFn - (myPrice, opPrice) => { myPayoff, opPayoff }
 * @returns {object} payoff matrix
 */
export function buildPayoffMatrix(playerPrices, opponentPrices, payoffFn) {
    const matrix = {
        playerPrices,
        opponentPrices,
        payoffs: [], // [i][j] = { player, opponent }
    };

    for (let i = 0; i < playerPrices.length; i++) {
        matrix.payoffs[i] = [];
        for (let j = 0; j < opponentPrices.length; j++) {
            const result = payoffFn(playerPrices[i], opponentPrices[j]);
            matrix.payoffs[i][j] = {
                player: result.myPayoff,
                opponent: result.opPayoff,
            };
        }
    }

    return matrix;
}

/**
 * Find pure strategy Nash equilibria.
 * A cell (i,j) is a Nash equilibrium if:
 * - Player payoff at (i,j) >= player payoff at (i',j) for all i' (player can't improve by switching)
 * - Opponent payoff at (i,j) >= opponent payoff at (i,j') for all j' (opponent can't improve)
 * @param {object} matrix - from buildPayoffMatrix
 * @returns {Array<{playerIdx: number, opponentIdx: number, playerPrice: number, opponentPrice: number, payoffs: object}>}
 */
export function findPureNashEquilibria(matrix) {
    const { playerPrices, opponentPrices, payoffs } = matrix;
    const equilibria = [];

    for (let i = 0; i < playerPrices.length; i++) {
        for (let j = 0; j < opponentPrices.length; j++) {
            const currentPayoff = payoffs[i][j];

            // Check: is this the best response for player given opponent plays j?
            let playerBest = true;
            for (let i2 = 0; i2 < playerPrices.length; i2++) {
                if (payoffs[i2][j].player > currentPayoff.player) {
                    playerBest = false;
                    break;
                }
            }

            // Check: is this the best response for opponent given player plays i?
            let opponentBest = true;
            for (let j2 = 0; j2 < opponentPrices.length; j2++) {
                if (payoffs[i][j2].opponent > currentPayoff.opponent) {
                    opponentBest = false;
                    break;
                }
            }

            if (playerBest && opponentBest) {
                equilibria.push({
                    playerIdx: i,
                    opponentIdx: j,
                    playerPrice: playerPrices[i],
                    opponentPrice: opponentPrices[j],
                    payoffs: currentPayoff,
                });
            }
        }
    }

    return equilibria;
}

/**
 * Find dominant strategies for each player.
 * @param {object} matrix
 * @returns {object} { playerDominant, opponentDominant }
 */
export function findDominantStrategies(matrix) {
    const { playerPrices, opponentPrices, payoffs } = matrix;

    // Check if a strategy dominates all others for the player
    function checkPlayerDominance(stratIdx) {
        for (let other = 0; other < playerPrices.length; other++) {
            if (other === stratIdx) continue;
            let dominates = true;
            for (let j = 0; j < opponentPrices.length; j++) {
                if (payoffs[stratIdx][j].player <= payoffs[other][j].player) {
                    dominates = false;
                    break;
                }
            }
            if (!dominates) return false;
        }
        return true;
    }

    function checkOpponentDominance(stratIdx) {
        for (let other = 0; other < opponentPrices.length; other++) {
            if (other === stratIdx) continue;
            let dominates = true;
            for (let i = 0; i < playerPrices.length; i++) {
                if (payoffs[i][stratIdx].opponent <= payoffs[i][other].opponent) {
                    dominates = false;
                    break;
                }
            }
            if (!dominates) return false;
        }
        return true;
    }

    let playerDominant = null;
    let opponentDominant = null;

    for (let i = 0; i < playerPrices.length; i++) {
        if (checkPlayerDominance(i)) {
            playerDominant = { index: i, price: playerPrices[i] };
            break;
        }
    }

    for (let j = 0; j < opponentPrices.length; j++) {
        if (checkOpponentDominance(j)) {
            opponentDominant = { index: j, price: opponentPrices[j] };
            break;
        }
    }

    return { playerDominant, opponentDominant };
}

/**
 * Analyze pricing equilibrium from simulation data.
 * @param {object} params
 * @param {number} params.basePrice
 * @param {number} params.competitorBasePrice
 * @param {number} params.priceStep - step between price options
 * @param {number} params.numOptions - number of price levels per player
 * @param {number} params.marketSize
 * @param {number} params.cogs
 * @returns {object} equilibrium analysis
 */
export function analyzePricingEquilibrium(params) {
    const {
        basePrice = 100,
        competitorBasePrice = 95,
        priceStep = 10,
        numOptions = 5,
        marketSize = 10000,
        cogs = 50,
    } = params;

    // Generate price options
    const half = Math.floor(numOptions / 2);
    const playerPrices = Array.from({ length: numOptions }, (_, i) => basePrice + (i - half) * priceStep);
    const opponentPrices = Array.from({ length: numOptions }, (_, i) => competitorBasePrice + (i - half) * priceStep);

    // Simple duopoly payoff: share captured proportional to price attractiveness
    const payoffFn = (myPrice, opPrice) => {
        const myAttractiveness = Math.max(0.01, 1 - (myPrice - cogs) / (myPrice + opPrice));
        const opAttractiveness = Math.max(0.01, 1 - (opPrice - cogs) / (myPrice + opPrice));
        const totalAtt = myAttractiveness + opAttractiveness;

        const myShare = myAttractiveness / totalAtt;
        const opShare = opAttractiveness / totalAtt;

        return {
            myPayoff: myShare * marketSize * (myPrice - cogs),
            opPayoff: opShare * marketSize * (opPrice - cogs),
        };
    };

    const matrix = buildPayoffMatrix(playerPrices, opponentPrices, payoffFn);
    const equilibria = findPureNashEquilibria(matrix);
    const dominant = findDominantStrategies(matrix);

    return {
        playerPrices,
        opponentPrices,
        matrix,
        equilibria,
        dominantStrategies: dominant,
        hasEquilibrium: equilibria.length > 0,
        recommendation: equilibria.length > 0
            ? `Equilibrio encontrado: precio óptimo $${equilibria[0].playerPrice} vs competidor $${equilibria[0].opponentPrice}`
            : 'No se encontró equilibrio puro. Considerar estrategia mixta.',
    };
}
