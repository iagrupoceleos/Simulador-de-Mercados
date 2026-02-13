/**
 * Prometheus Engine – Genetic Algorithm Optimizer (AI-007)
 * Evolves marketing mix allocations using tournament selection, crossover, and mutation.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Genetic Algorithm
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * @typedef {object} GAConfig
 * @property {number} populationSize - individuals per generation
 * @property {number} geneCount - number of allocation channels
 * @property {string[]} geneNames - channel names
 * @property {number} totalBudget - total budget to allocate
 * @property {Function} fitnessFn - (allocation: number[]) => fitness score
 * @property {number} [generations=100]
 * @property {number} [mutationRate=0.1]
 * @property {number} [elitismPct=0.1]
 * @property {number} [crossoverRate=0.7]
 */

/**
 * Run a genetic algorithm to optimize marketing mix.
 * @param {GAConfig} config
 * @returns {object} optimization results
 */
export function evolveMarketingMix(config) {
    const {
        populationSize = 50,
        geneCount,
        geneNames,
        totalBudget,
        fitnessFn,
        generations = 100,
        mutationRate = 0.1,
        elitismPct = 0.1,
        crossoverRate = 0.7,
    } = config;

    const eliteCount = Math.max(1, Math.floor(populationSize * elitismPct));

    // Initialize random population (allocations summing to totalBudget)
    let population = Array.from({ length: populationSize }, () => randomAllocation(geneCount, totalBudget));

    const fitnessHistory = [];
    let bestEver = { fitness: -Infinity, genes: null };

    for (let gen = 0; gen < generations; gen++) {
        // Evaluate fitness
        const evaluated = population.map(genes => ({
            genes,
            fitness: fitnessFn(genes),
        }));
        evaluated.sort((a, b) => b.fitness - a.fitness);

        // Track best
        if (evaluated[0].fitness > bestEver.fitness) {
            bestEver = { fitness: evaluated[0].fitness, genes: [...evaluated[0].genes] };
        }
        fitnessHistory.push({
            generation: gen + 1,
            bestFitness: evaluated[0].fitness,
            avgFitness: evaluated.reduce((s, e) => s + e.fitness, 0) / populationSize,
            worstFitness: evaluated[evaluated.length - 1].fitness,
        });

        // New generation
        const newPop = [];

        // Elitism: keep top individuals
        for (let i = 0; i < eliteCount; i++) {
            newPop.push([...evaluated[i].genes]);
        }

        // Fill rest via selection + crossover + mutation
        while (newPop.length < populationSize) {
            const parent1 = tournamentSelect(evaluated);
            const parent2 = tournamentSelect(evaluated);

            let child;
            if (Math.random() < crossoverRate) {
                child = crossover(parent1.genes, parent2.genes, totalBudget);
            } else {
                child = [...parent1.genes];
            }

            if (Math.random() < mutationRate) {
                mutate(child, totalBudget);
            }

            newPop.push(child);
        }

        population = newPop;
    }

    // Final best
    const namedAllocation = {};
    bestEver.genes.forEach((amount, i) => {
        namedAllocation[geneNames[i] || `ch_${i}`] = Math.round(amount);
    });

    return {
        bestAllocation: namedAllocation,
        bestFitness: bestEver.fitness,
        generations,
        populationSize,
        fitnessHistory,
        convergenceGen: fitnessHistory.findIndex(
            (h, i, arr) => i > 10 && Math.abs(h.bestFitness - arr[Math.max(0, i - 10)].bestFitness) < 0.001
        ) + 1,
    };
}

// ━━━━━━━━━━ GA Operators ━━━━━━━━━━

function randomAllocation(n, total) {
    const raw = Array.from({ length: n }, () => Math.random());
    const sum = raw.reduce((a, b) => a + b, 0);
    return raw.map(v => Math.round((v / sum) * total));
}

function tournamentSelect(evaluated, k = 3) {
    let best = null;
    for (let i = 0; i < k; i++) {
        const candidate = evaluated[Math.floor(Math.random() * evaluated.length)];
        if (!best || candidate.fitness > best.fitness) best = candidate;
    }
    return best;
}

function crossover(p1, p2, total) {
    const n = p1.length;
    const blend = p1.map((v, i) => {
        const alpha = Math.random();
        return alpha * v + (1 - alpha) * p2[i];
    });
    // Normalize to sum = total
    const sum = blend.reduce((a, b) => a + b, 0) || 1;
    return blend.map(v => Math.round((v / sum) * total));
}

function mutate(genes, total) {
    const i = Math.floor(Math.random() * genes.length);
    const j = Math.floor(Math.random() * genes.length);
    if (i === j) return;

    const shift = Math.round(genes[i] * (0.1 + Math.random() * 0.3));
    genes[i] = Math.max(0, genes[i] - shift);
    genes[j] += shift;

    // Renormalize
    const sum = genes.reduce((a, b) => a + b, 0) || 1;
    for (let k = 0; k < genes.length; k++) {
        genes[k] = Math.round((genes[k] / sum) * total);
    }
}
