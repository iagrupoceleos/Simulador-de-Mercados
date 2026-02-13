/**
 * Prometheus – Integration Test: Full Simulation Pipeline (QA-004)
 * End-to-end test: NGC → Monte Carlo → Risk → Optimizer
 */
import { describe, it, expect } from 'vitest';
import { NGC, CompetitorProfile, ExpertBelief } from '../engine/ngc.js';
import { MonteCarloEngine } from '../engine/montecarlo.js';
import { RiskEngine } from '../engine/risk.js';
import { Optimizer } from '../engine/optimizer.js';
import {
    NormalDistribution,
    TriangularDistribution,
    UniformDistribution,
    PRNG,
} from '../engine/distributions.js';

describe('Full Simulation Pipeline (QA-004)', () => {
    /**
     * Helper: set up a minimal but complete NGC scenario
     */
    function buildTestNGC() {
        const ngc = new NGC();
        ngc.setCompanyParam('basePrice', 120);
        ngc.setCompanyParam('cogs', 40);
        ngc.setCompanyParam('marketingBudget', 150000);

        const competitor = new CompetitorProfile({
            id: 'comp-1',
            name: 'Rival Corp',
            type: 'equilibrium',
            aggressiveness: 0.6,
            financialHealth: 0.7,
            marketShare: 0.25,
            beliefs: [
                new ExpertBelief({
                    id: 'b1',
                    description: 'Price war',
                    probability: 0.3,
                    distribution: new NormalDistribution(0.1, 0.05),
                    category: 'pricing',
                }),
            ],
            constraints: { minMargin: 0.15 },
        });
        competitor.cogsDistribution = new TriangularDistribution(30, 45, 55);
        competitor.marketingBudgetDistribution = new UniformDistribution(50000, 120000);
        ngc.addCompetitor(competitor);

        ngc.addRiskEvent({
            id: 'supply-disruption',
            description: 'Supply chain shock',
            probability: 0.15,
            impactDistribution: new NormalDistribution(0.2, 0.08),
            category: 'supply',
        });

        return ngc;
    }

    it('runs the full pipeline without errors', async () => {
        const ngc = buildTestNGC();
        const mc = new MonteCarloEngine();

        const results = await mc.run({
            ngc,
            offerConfig: { basePrice: 120, cogs: 40, marketingBudget: 150000, qualityIndex: 0.7, channels: ['online'], vertical: 'electronics' },
            populationConfig: { totalCustomers: 500 },
            initialInventory: 5000,
            iterations: 20,
            timeHorizonWeeks: 12,
            seed: 42,
        });

        expect(results).toBeDefined();
        expect(results).not.toBeNull();
    });

    it('produces valid statistical aggregates', async () => {
        const ngc = buildTestNGC();
        const mc = new MonteCarloEngine();

        const results = await mc.run({
            ngc,
            offerConfig: { basePrice: 120, cogs: 40, marketingBudget: 150000, qualityIndex: 0.7, channels: ['online'], vertical: 'electronics' },
            populationConfig: { totalCustomers: 500 },
            initialInventory: 5000,
            iterations: 30,
            timeHorizonWeeks: 12,
            seed: 123,
        });

        // Must have all KPI stats
        expect(results.iterations).toBe(30);
        expect(results.sales).toHaveProperty('mean');
        expect(results.sales).toHaveProperty('p50');
        expect(results.revenue).toHaveProperty('mean');
        expect(results.netProfit).toHaveProperty('mean');
        expect(results.roi).toHaveProperty('mean');
        expect(results.margin).toHaveProperty('mean');
        expect(results.inventoryRemaining).toHaveProperty('mean');

        // Sales should be positive (500 customers, 12 weeks, some will buy)
        expect(results.sales.mean).toBeGreaterThan(0);
        // Revenue = sales × price  → positive
        expect(results.revenue.mean).toBeGreaterThan(0);
    });

    it('generates weekly time series', async () => {
        const ngc = buildTestNGC();
        const mc = new MonteCarloEngine();

        const results = await mc.run({
            ngc,
            offerConfig: { basePrice: 120, cogs: 40, marketingBudget: 150000, qualityIndex: 0.7, channels: ['online'], vertical: 'electronics' },
            populationConfig: { totalCustomers: 500 },
            initialInventory: 5000,
            iterations: 10,
            timeHorizonWeeks: 8,
            seed: 77,
        });

        expect(results.weeklyAvg).toBeDefined();
        expect(results.weeklyAvg.length).toBe(8);
        expect(results.weeklyAvg[0]).toHaveProperty('unitsSold');
        expect(results.weeklyAvg[0]).toHaveProperty('inventory');
        expect(results.weeklyAvg[0]).toHaveProperty('revenue');
    });

    it('risk analysis produces valid VaR/CVaR', async () => {
        const ngc = buildTestNGC();
        const mc = new MonteCarloEngine();

        const results = await mc.run({
            ngc,
            offerConfig: { basePrice: 120, cogs: 40, marketingBudget: 150000, qualityIndex: 0.7, channels: ['online'], vertical: 'electronics' },
            populationConfig: { totalCustomers: 500 },
            initialInventory: 5000,
            iterations: 50,
            timeHorizonWeeks: 12,
            seed: 42,
        });

        const inventoryRisk = RiskEngine.analyzeInventoryRisk(results, 40);
        expect(inventoryRisk).toHaveProperty('inventoryVaR95');
        expect(inventoryRisk.inventoryVaR95).toBeTypeOf('number');
        expect(inventoryRisk.inventoryVaR95).toBeGreaterThanOrEqual(0);

        const profitRisk = RiskEngine.analyzeProfitabilityRisk(results);
        expect(profitRisk).toHaveProperty('netProfitVaR95');
        expect(profitRisk).toHaveProperty('probROIBelow0');
        expect(profitRisk.probROIBelow0).toBeGreaterThanOrEqual(0);
        expect(profitRisk.probROIBelow0).toBeLessThanOrEqual(1);
    });

    it('optimizer produces safe stock recommendation', async () => {
        const ngc = buildTestNGC();
        const mc = new MonteCarloEngine();

        const results = await mc.run({
            ngc,
            offerConfig: { basePrice: 120, cogs: 40, marketingBudget: 150000, qualityIndex: 0.7, channels: ['online'], vertical: 'electronics' },
            populationConfig: { totalCustomers: 500 },
            initialInventory: 5000,
            iterations: 30,
            timeHorizonWeeks: 12,
            seed: 42,
        });

        const safeStock = Optimizer.recommendSafeStock(results, 40);
        expect(safeStock).toHaveProperty('recommended');
        expect(safeStock.recommended).toBeTypeOf('number');
        expect(safeStock.recommended).toBeGreaterThan(0);

        const contingency = Optimizer.generateContingencyPlans(results, { basePrice: 120, cogs: 40 });
        expect(contingency).toBeInstanceOf(Array);
        expect(contingency.length).toBeGreaterThan(0);
    });

    it('deterministic: same seed → same results', async () => {
        const config = {
            ngc: buildTestNGC(),
            offerConfig: { basePrice: 120, cogs: 40, marketingBudget: 150000, qualityIndex: 0.7, channels: ['online'], vertical: 'electronics' },
            populationConfig: { totalCustomers: 200 },
            initialInventory: 3000,
            iterations: 10,
            timeHorizonWeeks: 8,
            seed: 42,
        };

        const mc1 = new MonteCarloEngine();
        const r1 = await mc1.run({ ...config, ngc: buildTestNGC() });
        const mc2 = new MonteCarloEngine();
        const r2 = await mc2.run({ ...config, ngc: buildTestNGC() });

        expect(r1.sales.mean).toBeCloseTo(r2.sales.mean, 4);
        expect(r1.revenue.mean).toBeCloseTo(r2.revenue.mean, 4);
        expect(r1.netProfit.mean).toBeCloseTo(r2.netProfit.mean, 4);
    });

    it('cancellation stops the engine', async () => {
        const ngc = buildTestNGC();
        const mc = new MonteCarloEngine();

        // Cancel immediately after starting
        const promise = mc.run({
            ngc,
            offerConfig: { basePrice: 120, cogs: 40, marketingBudget: 150000, qualityIndex: 0.7, channels: ['online'], vertical: 'electronics' },
            populationConfig: { totalCustomers: 100 },
            initialInventory: 1000,
            iterations: 1000,
            timeHorizonWeeks: 4,
            seed: 42,
        });

        // Cancel after a tiny delay
        setTimeout(() => mc.cancel(), 5);
        const result = await promise;

        // Should have completed fewer than all 1000 iterations
        expect(result.iterations).toBeLessThan(1000);
    });
});
