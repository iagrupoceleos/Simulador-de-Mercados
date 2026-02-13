/**
 * Prometheus Engine – Monte Carlo Runner
 * Executes multiple simulation runs with parameter variation.
 */
import { PRNG, computeStats } from './distributions.js';
import { CustomerPopulation } from './agents-customer.js';
import { createCompetitorAgent } from './agents-competitor.js';
import { SimulationRun, OfferState } from './simulation.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Monte Carlo Engine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class MonteCarloEngine {
    constructor() {
        this.results = [];
        this.isRunning = false;
        this.cancelled = false;
    }

    /**
     * Run N Monte Carlo simulations.
     * @param {object} config
     * @param {Function} onProgress – callback ({ iteration, total, pct })
     * @returns {MonteCarloResults}
     */
    async run(config, onProgress = () => { }) {
        const {
            ngc,
            offerConfig,
            populationConfig,
            initialInventory = 45000,
            iterations = 1000,
            timeHorizonWeeks = 26,
            seed = 42,
        } = config;

        this.results = [];
        this.isRunning = true;
        this.cancelled = false;

        const masterRng = new PRNG(seed);

        for (let i = 0; i < iterations; i++) {
            if (this.cancelled) break;

            const iterSeed = masterRng.next() * 2147483647 | 0;
            const rng = new PRNG(iterSeed);

            // Sample scenario from NGC
            const scenario = ngc.sampleFullScenario(rng);

            // Generate customer population
            const population = new CustomerPopulation();
            population.generate(populationConfig, rng);

            // Create competitor agents
            const competitorAgents = [];
            for (const [id, profile] of ngc.competitors) {
                competitorAgents.push(createCompetitorAgent(profile, {
                    basePrice: scenario.competitors[id]?.sampledCOGS
                        ? scenario.competitors[id].sampledCOGS * (1 + profile.constraints.minMargin + 0.3)
                        : 140,
                    baseMarketing: scenario.competitors[id]?.sampledMarketingBudget ?? 80000,
                }));
            }

            // Create offer state (with optional price variation)
            const offer = new OfferState({
                ...offerConfig,
                basePrice: offerConfig.basePrice + (scenario.company.priceAdjustment ?? 0),
            });
            offer.currentPrice = offer.basePrice;

            // Execute simulation
            const sim = new SimulationRun({
                offer,
                population,
                ngcScenario: scenario,
                competitorAgents,
                timeHorizonWeeks,
            });

            const result = sim.execute(initialInventory, rng);
            this.results.push(result);

            // Progress callback (yield to event loop every 10 iterations)
            if (i % 10 === 0 || i === iterations - 1) {
                onProgress({ iteration: i + 1, total: iterations, pct: ((i + 1) / iterations) * 100 });
                await new Promise(r => setTimeout(r, 0));
            }
        }

        this.isRunning = false;
        return this.aggregate();
    }

    cancel() {
        this.cancelled = true;
    }

    /**
     * Aggregate all simulation results into statistical summaries.
     */
    aggregate() {
        const n = this.results.length;
        if (n === 0) return null;

        const extract = (key) => this.results.map(r => r[key]);

        const unitsSold = extract('totalUnitsSold');
        const revenue = extract('totalRevenue');
        const grossProfit = extract('grossProfit');
        const netProfit = extract('netProfit');
        const roi = extract('roi');
        const marginPct = extract('marginPct');
        const inventoryRemaining = extract('inventoryRemaining');
        const inventoryValue = extract('inventoryValue');
        const unsoldPct = extract('unsoldPct');
        const breakEvenWeek = extract('breakEvenWeek').filter(w => w >= 0);

        return {
            iterations: n,
            sales: computeStats(unitsSold),
            revenue: computeStats(revenue),
            grossProfit: computeStats(grossProfit),
            netProfit: computeStats(netProfit),
            roi: computeStats(roi),
            margin: computeStats(marginPct),
            inventoryRemaining: computeStats(inventoryRemaining),
            inventoryValue: computeStats(inventoryValue),
            unsoldPct: computeStats(unsoldPct),
            breakEvenWeek: breakEvenWeek.length > 0 ? computeStats(breakEvenWeek) : null,

            // Distribution data for charts
            distributions: {
                unitsSold, revenue, grossProfit, netProfit,
                roi, marginPct, inventoryRemaining, unsoldPct,
            },

            // Weekly time series (averaged across all runs)
            weeklyAvg: this._averageWeekly(),

            // Raw results for VaR/CVaR calculation
            rawResults: this.results,
        };
    }

    /** Average weekly metrics across all runs */
    _averageWeekly() {
        if (this.results.length === 0) return [];
        const weeks = this.results[0].weeklyMetrics.length;
        const avgMetrics = [];

        for (let w = 0; w < weeks; w++) {
            const weekData = this.results.map(r => r.weeklyMetrics[w]).filter(Boolean);
            if (weekData.length === 0) continue;

            avgMetrics.push({
                week: w,
                unitsSold: weekData.reduce((s, d) => s + d.unitsSold, 0) / weekData.length,
                cumulativeSold: weekData.reduce((s, d) => s + d.cumulativeSold, 0) / weekData.length,
                inventory: weekData.reduce((s, d) => s + d.inventory, 0) / weekData.length,
                revenue: weekData.reduce((s, d) => s + d.revenue, 0) / weekData.length,
                avgConversion: weekData.reduce((s, d) => s + d.avgConversion, 0) / weekData.length,
                competitorAttractiveness: weekData.reduce((s, d) => s + d.competitorAttractiveness, 0) / weekData.length,
            });
        }

        return avgMetrics;
    }
}
