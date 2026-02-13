/**
 * Prometheus Tests – Sprint 14-17 Module Tests (QA-007)
 * Tests for forecasting, supply chain, shocks, bandits, multi-player, ecosystem,
 * dynamic pricing, promotions, SWOT, attribution, multi-period.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock localStorage for Node environment
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] ?? null,
        setItem: (key, val) => { store[key] = String(val); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; },
        get length() { return Object.keys(store).length; },
        key: (i) => Object.keys(store)[i] ?? null,
    };
})();
if (typeof globalThis.localStorage === 'undefined') {
    globalThis.localStorage = localStorageMock;
}

// ━━━ Multi-Period (SIM-006) ━━━
import { aggregateByPeriod, multiPeriodPlan, PERIODS } from '../engine/multi-period.js';

describe('Multi-Period Simulation (SIM-006)', () => {
    it('aggregates weekly data into monthly periods', () => {
        const weeks = Array.from({ length: 8 }, (_, i) => ({ week: i + 1, revenue: 1000, sales: 10, profit: 300 }));
        const monthly = aggregateByPeriod(weeks, 'monthly');
        expect(monthly.length).toBe(2);
        expect(monthly[0].revenue).toBe(4000);
        expect(monthly[0].sales).toBe(40);
    });

    it('generates multi-period plan with scenarios', () => {
        const plan = multiPeriodPlan({ horizonMonths: 6, baseRevenue: 50000 });
        expect(plan.length).toBe(3); // optimistic, base, pessimistic
        plan.forEach(s => {
            expect(s.months.length).toBe(6);
            expect(s.totalRevenue).toBeGreaterThan(0);
        });
    });

    it('exposes correct period definitions', () => {
        expect(PERIODS.WEEKLY.weeksPerPeriod).toBe(1);
        expect(PERIODS.QUARTERLY.weeksPerPeriod).toBe(13);
        expect(PERIODS.YEARLY.weeksPerPeriod).toBe(52);
    });
});

// ━━━ Supply Chain (SIM-007) ━━━
import { simulateSupplyChain, LEAD_TIME_MODELS } from '../engine/supply-chain.js';

describe('Supply Chain Simulation (SIM-007)', () => {
    it('simulates with default config', () => {
        const result = simulateSupplyChain({ weeks: 12 });
        expect(result.log.length).toBe(12);
        expect(result.fillRate).toBeGreaterThanOrEqual(0);
        expect(result.fillRate).toBeLessThanOrEqual(1);
    });

    it('tracks fill rate and stockouts', () => {
        const result = simulateSupplyChain({ weeks: 52, initialInventory: 10, avgWeeklyDemand: 200 });
        expect(result.totalStockoutWeeks).toBeGreaterThan(0);
    });

    it('has all lead time models', () => {
        expect(LEAD_TIME_MODELS.fixed).toBeDefined();
        expect(LEAD_TIME_MODELS.uniform).toBeDefined();
        expect(LEAD_TIME_MODELS.triangular).toBeDefined();
        expect(LEAD_TIME_MODELS.lognormal).toBeDefined();
    });
});

// ━━━ Market Shocks (SIM-008) ━━━
import { createShockEvent, getShockEffects, simulateWithShocks, SHOCK_TYPES } from '../engine/market-shocks.js';

describe('Market Shocks (SIM-008)', () => {
    it('creates a shock event', () => {
        const shock = createShockEvent({ type: 'PANDEMIC', startWeek: 10 });
        expect(shock.type).toBe('PANDEMIC');
        expect(shock.startWeek).toBe(10);
        expect(shock.endWeek).toBe(22); // 10+12
    });

    it('calculates demand/supply effects during shock', () => {
        const shock = createShockEvent({ type: 'PANDEMIC', startWeek: 5 });
        const effects = getShockEffects(10, [shock]);
        expect(effects.demandFactor).toBeLessThan(1);
        expect(effects.activeShocks.length).toBe(1);
    });

    it('recovers after shock ends', () => {
        const shock = createShockEvent({ type: 'REGULATION', startWeek: 1 });
        const afterRecovery = getShockEffects(shock.recoveryEnd + 5, [shock]);
        expect(afterRecovery.activeShocks.length).toBe(0);
    });

    it('simulates revenue under shocks', () => {
        const shocks = [createShockEvent({ type: 'VIRAL_TREND', startWeek: 10 })];
        const results = simulateWithShocks({ weeks: 20 }, shocks);
        expect(results.length).toBe(20);
        const viralWeek = results.find(r => r.week === 12);
        expect(viralWeek.demandFactor).toBeGreaterThan(1);
    });

    it('catalogs 6 shock types', () => {
        expect(Object.keys(SHOCK_TYPES).length).toBe(6);
    });
});

// ━━━ Forecasting (FORE-001) ━━━
import { simpleExponentialSmoothing, holtSmoothing, holtWinters, autoForecast } from '../engine/forecasting.js';

describe('Forecasting (FORE-001)', () => {
    const data = [100, 110, 105, 115, 120, 125, 130, 128, 135, 140];

    it('SES produces fitted + forecast', () => {
        const result = simpleExponentialSmoothing(data, 0.3, 3);
        expect(result.fitted.length).toBe(data.length);
        expect(result.forecast.length).toBe(3);
    });

    it('Holt produces trend forecast', () => {
        const result = holtSmoothing(data, 0.3, 0.1, 4);
        expect(result.forecast.length).toBe(4);
        // Increasing trend should produce increasing forecast
        expect(result.forecast[3]).toBeGreaterThan(result.forecast[0]);
    });

    it('Holt-Winters needs 2 seasons minimum', () => {
        const result = holtWinters([1, 2, 3], 12);
        expect(result.error).toBeDefined();
    });

    it('auto-selects best method', () => {
        const result = autoForecast(data, 3);
        expect(result.method).toBeDefined();
        expect(result.forecast.length).toBe(3);
        expect(result.mape).toBeGreaterThanOrEqual(0);
    });
});

// ━━━ Demand Planning (FORE-002) ━━━
import { decompose, generateDemandPlan } from '../engine/demand-planning.js';

describe('Demand Planning (FORE-002)', () => {
    it('decomposes time series with insufficient data', () => {
        const result = decompose([100, 200, 150], 12);
        expect(result.trend.length).toBe(3);
    });

    it('generates a demand plan', () => {
        const historical = Array.from({ length: 24 }, (_, i) => 1000 + 50 * Math.sin(i * Math.PI / 6) + i * 10);
        const plan = generateDemandPlan({ historicalDemand: historical, seasonLength: 12, planHorizon: 6 });
        expect(plan.plan.length).toBe(6);
        plan.plan.forEach(p => {
            expect(p.forecastDemand).toBeGreaterThanOrEqual(0);
            expect(p.safetyStock).toBeGreaterThanOrEqual(0);
        });
    });
});

// ━━━ Bandit (AI-006) ━━━
import { ThompsonSamplingBandit, UCB1Bandit, runPriceOptimization } from '../engine/bandit.js';

describe('Multi-Armed Bandit (AI-006)', () => {
    it('Thompson Sampling selects arms', () => {
        const bandit = new ThompsonSamplingBandit([50, 75, 100]);
        const { armIndex } = bandit.selectArm();
        expect(armIndex).toBeGreaterThanOrEqual(0);
        expect(armIndex).toBeLessThan(3);
    });

    it('UCB1 explores all arms first', () => {
        const bandit = new UCB1Bandit([10, 20, 30, 40]);
        const pulled = new Set();
        for (let i = 0; i < 4; i++) {
            const { armIndex } = bandit.selectArm();
            bandit.update(armIndex, Math.random());
            pulled.add(armIndex);
        }
        expect(pulled.size).toBe(4);
    });

    it('price optimization converges', () => {
        const result = runPriceOptimization({
            pricePoints: [50, 75, 100, 125],
            rewardFn: (p) => p === 75 ? 0.8 : 0.3,
            rounds: 100,
        });
        expect(result.bestPrice).toBeDefined();
        expect(result.convergence.length).toBe(100);
    });
});

// ━━━ Genetic Optimizer (AI-007) ━━━
import { evolveMarketingMix } from '../engine/genetic-optimizer.js';

describe('Genetic Optimizer (AI-007)', () => {
    it('optimizes marketing mix', () => {
        const result = evolveMarketingMix({
            geneCount: 4,
            geneNames: ['SEO', 'SEM', 'Social', 'Email'],
            totalBudget: 10000,
            fitnessFn: (alloc) => alloc[1] * 0.5 + alloc[2] * 0.3 + alloc[3] * 0.2,
            generations: 20,
            populationSize: 20,
        });
        expect(result.bestAllocation).toBeDefined();
        expect(Object.keys(result.bestAllocation).length).toBe(4);
        expect(result.fitnessHistory.length).toBe(20);
    });
});

// ━━━ Multi-Player (SIM-009) ━━━
import { createPlayer, runMultiPlayerSim, STRATEGIES } from '../engine/multiplayer-sim.js';

describe('Multi-Player Simulation (SIM-009)', () => {
    it('creates players with strategy profiles', () => {
        const p = createPlayer('Alpha', 'AGGRESSIVE');
        expect(p.price).toBeLessThan(100); // aggressive = lower price
        expect(p.marketingBudget).toBeGreaterThan(10000); // higher marketing
    });

    it('runs multi-player simulation', () => {
        const players = [
            createPlayer('Alpha', 'AGGRESSIVE'),
            createPlayer('Beta', 'PREMIUM'),
            createPlayer('Gamma', 'VALUE'),
        ];
        const result = runMultiPlayerSim({ players, marketSize: 10000, weeks: 4 });
        expect(result.standings.length).toBe(3);
        expect(result.standings[0].rank).toBe(1);
        expect(result.weeklyResults.length).toBe(4);
    });

    it('defines 5 strategies', () => {
        expect(Object.keys(STRATEGIES).length).toBe(5);
    });
});

// ━━━ Ecosystem (SIM-010) ━━━
import { createSupplier, createDistributor, createRetailer, simulateEcosystem } from '../engine/ecosystem.js';

describe('Market Ecosystem (SIM-010)', () => {
    it('simulates ecosystem with agents', () => {
        const result = simulateEcosystem({
            suppliers: [createSupplier('S1')],
            distributors: [createDistributor('D1')],
            retailers: [createRetailer('R1')],
            weeks: 4,
        });
        expect(result.weeks).toBe(4);
        expect(result.totalSystemRevenue).toBeGreaterThan(0);
        expect(result.agents.retailers[0].satisfaction).toBeGreaterThan(0);
    });
});

// ━━━ Dynamic Pricing (ECO-007) ━━━
import { calculateDynamicPrice, simulateDynamicPricing } from '../engine/dynamic-pricing.js';

describe('Dynamic Pricing (ECO-007)', () => {
    it('adjusts price based on demand', () => {
        const high = calculateDynamicPrice({ basePrice: 100, demandIndex: 1.5, rule: 'demand_responsive' });
        const low = calculateDynamicPrice({ basePrice: 100, demandIndex: 0.5, rule: 'demand_responsive' });
        expect(high.adjustedPrice).toBeGreaterThan(low.adjustedPrice);
    });

    it('respects floor/ceiling bounds', () => {
        const result = calculateDynamicPrice({
            basePrice: 100, demandIndex: 0.1, rule: 'demand_responsive',
            bounds: { floor: 80, ceiling: 120 },
        });
        expect(result.adjustedPrice).toBeGreaterThanOrEqual(80);
    });

    it('simulates pricing over period', () => {
        const result = simulateDynamicPricing({ basePrice: 100, weeks: 10 });
        expect(result.results.length).toBe(10);
        expect(result.avgPrice).toBeGreaterThan(0);
    });
});

// ━━━ Promotions (ECO-008) ━━━
import { createPromotion, planPromotionCalendar } from '../engine/promotions.js';

describe('Promotion Calendar (ECO-008)', () => {
    it('creates a promotion event', () => {
        const promo = createPromotion({ type: 'FLASH_SALE', weekStart: 5 });
        expect(promo.name).toBe('Venta Flash');
        expect(promo.discountPct).toBe(25);
    });

    it('plans calendar with ROI', () => {
        const promos = [
            createPromotion({ type: 'FLASH_SALE', weekStart: 5 }),
            createPromotion({ type: 'HOLIDAY_PROMO', weekStart: 20 }),
        ];
        const plan = planPromotionCalendar({ promotions: promos, baseWeeklySales: 100, basePrice: 50, cogs: 25, weeks: 26 });
        expect(plan.weeklyPlan.length).toBe(26);
        expect(plan.promoROI.length).toBe(2);
        expect(plan.summary.promoWeeks).toBeGreaterThan(0);
    });
});

// ━━━ SWOT (STR-006) ━━━
import { generateSWOT } from '../engine/swot.js';

describe('SWOT Analysis (STR-006)', () => {
    it('generates SWOT from profitable results', () => {
        const swot = generateSWOT({ profit: { mean: 50000 }, revenue: { mean: 200000 }, marketShare: { mean: 0.3 } });
        expect(swot.strengths.length).toBeGreaterThan(0);
        expect(swot.summary.overallPosition).toBe('favorable');
    });

    it('detects weaknesses when unprofitable', () => {
        const swot = generateSWOT({ profit: { mean: -5000 }, marketShare: { mean: 0.05 } });
        expect(swot.weaknesses.length).toBeGreaterThan(0);
        expect(swot.summary.overallPosition).toBe('desafiante');
    });
});

// ━━━ Attribution (MKT-006) ━━━
import { runAttribution, compareAttributionModels } from '../engine/attribution.js';

describe('Attribution Modeling (MKT-006)', () => {
    const conversions = [
        {
            id: 'c1', revenue: 100,
            touchpoints: [
                { channel: 'organic', timestamp: 1000, cost: 0 },
                { channel: 'paid_search', timestamp: 2000, cost: 10 },
                { channel: 'email', timestamp: 3000, cost: 2 },
            ]
        },
    ];

    it('linear attribution splits revenue equally', () => {
        const result = runAttribution(conversions, 'linear');
        expect(result.channels.length).toBe(3);
        const emailAttr = result.channels.find(c => c.channel === 'email');
        expect(emailAttr.attributedRevenue).toBeCloseTo(33, -1);
    });

    it('first_touch gives all credit to first channel', () => {
        const result = runAttribution(conversions, 'first_touch');
        const organic = result.channels.find(c => c.channel === 'organic');
        expect(organic.attributedRevenue).toBe(100);
    });

    it('compares all models', () => {
        const comparison = compareAttributionModels(conversions);
        expect(comparison.models.length).toBe(5);
    });
});

// ━━━ Feature Flags (PROD-003) ━━━
import { isEnabled, toggleFlag, getAllFlags, resetFlags } from '../utils/feature-flags.js';

describe('Feature Flags (PROD-003)', () => {
    it('returns default enabled state', () => {
        resetFlags();
        expect(isEnabled('multiPeriodPlanning')).toBe(true);
        expect(isEnabled('multiPlayerMode')).toBe(false);
    });

    it('toggles flags', () => {
        resetFlags();
        toggleFlag('debugMode', true);
        expect(isEnabled('debugMode')).toBe(true);
        toggleFlag('debugMode', false);
        expect(isEnabled('debugMode')).toBe(false);
    });

    it('groups flags by category', () => {
        const groups = getAllFlags();
        expect(groups.simulation).toBeDefined();
        expect(groups.ai).toBeDefined();
    });
});
