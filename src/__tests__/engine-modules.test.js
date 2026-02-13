/**
 * Prometheus Tests – Engine Module Tests (QA-006)
 * Unit tests for replenishment, customer-ltv, nash-equilibrium, bayesian, statistics, risk-adjusted
 */
import { describe, it, expect } from 'vitest';
import { calculateEOQ, calculateReorderPoint, calculateSafetyStock, simulateReplenishment, POLICIES } from '../engine/replenishment.js';
import { modelCohortLTV, assessChurnRisk, RETENTION_MODELS } from '../engine/customer-ltv.js';
import { buildPayoffMatrix, findPureNashEquilibria, findDominantStrategies, analyzePricingEquilibrium } from '../engine/nash-equilibrium.js';
import { normalNormalUpdate, betaBinomialUpdate, BeliefManager } from '../engine/bayesian.js';
import { linearRegression, correlation, iqr, detectOutliers, zScore } from '../engine/statistics.js';
import { sharpeRatio, sortinoRatio, maxDrawdown, calmarRatio } from '../engine/risk-adjusted.js';
import { OnlineLinearRegression } from '../engine/online-regression.js';
import { parseCSV, descriptiveStats, fitDistributions } from '../engine/distribution-fitting.js';
import { calculateSOV, analyzeSOVvsSOM, generateSOVReport } from '../engine/share-of-voice.js';

// ━━━━━━━━━ Replenishment ━━━━━━━━━
describe('Replenishment Engine (ECO-005)', () => {
    it('calculates EOQ correctly', () => {
        const result = calculateEOQ(10000, 100, 5);
        expect(result.eoq).toBeGreaterThan(0);
        expect(result.totalCost).toBeGreaterThan(0);
        expect(result.numOrders).toBeGreaterThan(0);
    });

    it('returns zero EOQ for invalid inputs', () => {
        expect(calculateEOQ(0, 100, 5).eoq).toBe(0);
        expect(calculateEOQ(1000, 100, 0).eoq).toBe(0);
    });

    it('calculates reorder point', () => {
        expect(calculateReorderPoint(100, 7, 50)).toBe(750);
    });

    it('calculates safety stock', () => {
        const ss = calculateSafetyStock(1.65, 20, 14);
        expect(ss).toBeGreaterThan(0);
    });

    it('simulates reorder_point policy', () => {
        const result = simulateReplenishment({
            initialInventory: 1000,
            avgWeeklyDemand: 100,
            weeks: 12,
        });
        expect(result.policy).toBe('reorder_point');
        expect(result.weeklyLog).toHaveLength(12);
        expect(result.fillRate).toBeGreaterThanOrEqual(0);
        expect(result.fillRate).toBeLessThanOrEqual(1);
    });

    it('simulates JIT policy', () => {
        const result = simulateReplenishment({
            initialInventory: 200,
            avgWeeklyDemand: 100,
            policy: POLICIES.JIT,
            weeks: 8,
        });
        expect(result.policy).toBe('jit');
        expect(result.ordersPlaced).toBe(8);
    });
});

// ━━━━━━━━━ Customer LTV ━━━━━━━━━
describe('Customer LTV (ECO-006)', () => {
    it('models cohort LTV with churn', () => {
        const result = modelCohortLTV({
            initialCohort: 1000,
            avgOrderValue: 500,
            ordersPerYear: 4,
            grossMarginPct: 40,
            monthlyChurnRate: 0.05,
            horizonMonths: 12,
        });
        expect(result.ltvPerCustomer).toBeGreaterThan(0);
        expect(result.totalChurned).toBeGreaterThan(0);
        expect(result.finalActive).toBeLessThan(1000);
        expect(result.monthlyData).toHaveLength(12);
    });

    it('assesses churn risk levels', () => {
        const high = assessChurnRisk({ daysSinceLastPurchase: 300, totalOrders: 1, returnsCount: 3 });
        expect(high.riskLevel).toBe('alto');

        const low = assessChurnRisk({ daysSinceLastPurchase: 5, totalOrders: 20, avgOrderValue: 500 });
        expect(low.riskLevel).toBe('bajo');
    });

    it('has retention curve models', () => {
        expect(RETENTION_MODELS.exponential(0.1, 5)).toBeCloseTo(Math.exp(-0.5), 5);
        expect(RETENTION_MODELS.power(1, 0)).toBe(1);
    });
});

// ━━━━━━━━━ Nash Equilibrium ━━━━━━━━━
describe('Nash Equilibrium (AI-005)', () => {
    it('builds payoff matrix', () => {
        const matrix = buildPayoffMatrix(
            [80, 100, 120],
            [85, 105],
            (p1, p2) => ({ myPayoff: (200 - p1) * p1 / 100, opPayoff: (200 - p2) * p2 / 100 })
        );
        expect(matrix.payoffs).toHaveLength(3);
        expect(matrix.payoffs[0]).toHaveLength(2);
    });

    it('finds pure Nash equilibria', () => {
        // Prisoner's dilemma: (Defect, Defect) is Nash
        const matrix = buildPayoffMatrix(
            [0, 1], [0, 1],
            (a, b) => {
                if (a === 0 && b === 0) return { myPayoff: 3, opPayoff: 3 };
                if (a === 0 && b === 1) return { myPayoff: 0, opPayoff: 5 };
                if (a === 1 && b === 0) return { myPayoff: 5, opPayoff: 0 };
                return { myPayoff: 1, opPayoff: 1 };
            }
        );
        const eq = findPureNashEquilibria(matrix);
        expect(eq.length).toBeGreaterThanOrEqual(1);
    });

    it('analyzes pricing equilibrium', () => {
        const result = analyzePricingEquilibrium({ basePrice: 100, marketSize: 5000 });
        expect(result.playerPrices.length).toBeGreaterThan(0);
        expect(typeof result.hasEquilibrium).toBe('boolean');
    });
});

// ━━━━━━━━━ Bayesian ━━━━━━━━━
describe('Bayesian Updating (DS-007)', () => {
    it('performs normal-normal update', () => {
        const posterior = normalNormalUpdate({ mean: 100, std: 20 }, [110, 105, 115], 15);
        expect(posterior.mean).toBeGreaterThan(100);
        expect(posterior.std).toBeLessThan(20);
        expect(posterior.credibleInterval).toHaveLength(2);
    });

    it('performs beta-binomial update', () => {
        const posterior = betaBinomialUpdate({ alpha: 1, beta: 1 }, 8, 2);
        expect(posterior.mean).toBeCloseTo(0.75, 1);
        expect(posterior.alpha).toBe(9);
        expect(posterior.beta).toBe(3);
    });

    it('manages beliefs via BeliefManager', () => {
        const bm = new BeliefManager();
        bm.registerBelief('price', { type: 'normal', mean: 100, std: 20 });
        bm.updateBelief('price', [110, 115]);
        const belief = bm.getBelief('price');
        expect(belief.mean).toBeGreaterThan(100);
    });
});

// ━━━━━━━━━ Statistics ━━━━━━━━━
describe('Statistics (SCOUT-006)', () => {
    it('computes linear regression', () => {
        const result = linearRegression([[1, 2], [2, 4], [3, 6], [4, 8]]);
        expect(result.slope).toBeCloseTo(2, 1);
        expect(result.intercept).toBeCloseTo(0, 1);
        expect(result.r2).toBeGreaterThan(0.99);
    });

    it('computes Pearson correlation', () => {
        expect(correlation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 5);
        expect(correlation([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 5);
    });

    it('computes IQR', () => {
        expect(iqr([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBeGreaterThan(0);
    });

    it('detects outliers', () => {
        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100];
        const result = detectOutliers(data);
        expect(result.outliers.length).toBeGreaterThanOrEqual(1);
        expect(result.outliers).toContain(100);
    });

    it('z-score normalizes data', () => {
        const norm = zScore([10, 20, 30]);
        expect(norm[1]).toBeCloseTo(0, 5);
    });
});

// ━━━━━━━━━ Risk-Adjusted Returns ━━━━━━━━━
describe('Risk-Adjusted Returns (STR-005)', () => {
    it('computes Sharpe ratio', () => {
        const returns = [0.05, 0.03, 0.04, 0.06, 0.02, 0.07];
        expect(sharpeRatio(returns)).toBeGreaterThan(0);
    });

    it('computes Sortino ratio', () => {
        const returns = [0.05, -0.02, 0.04, 0.06, -0.01, 0.07];
        expect(sortinoRatio(returns)).toBeGreaterThan(0);
    });

    it('computes max drawdown', () => {
        const values = [100, 110, 105, 115, 90, 120];
        const dd = maxDrawdown(values);
        expect(dd.maxDrawdown).toBeGreaterThan(0);
        expect(dd.drawdownPct).toBeDefined();
    });

    it('computes Calmar ratio', () => {
        const returns = [0.05, -0.02, 0.04, 0.06, -0.03, 0.07];
        const values = [100, 105, 103, 107, 113, 110, 118];
        expect(calmarRatio(returns, values)).toBeGreaterThan(0);
    });
});

// ━━━━━━━━━ Online Regression ━━━━━━━━━
describe('Online Linear Regression (AI-004)', () => {
    it('learns from streaming data', () => {
        const model = new OnlineLinearRegression(1);
        for (let i = 0; i < 50; i++) {
            model.update([i], i * 2 + 5);
        }
        const stats = model.getStats();
        expect(stats.sampleCount).toBe(50);
        expect(model.predict([100])).toBeGreaterThan(150);
    });

    it('tracks feature importance', () => {
        const model = new OnlineLinearRegression(3);
        for (let i = 0; i < 30; i++) {
            model.update([i, i * 0.1, i * 0.01], i * 5);
        }
        const importance = model.getFeatureImportance(['price', 'quality', 'noise']);
        expect(importance[0].name).toBe('price');
    });
});

// ━━━━━━━━━ Distribution Fitting ━━━━━━━━━
describe('Distribution Fitting (DS-006)', () => {
    it('parses CSV', () => {
        const csv = 'name,value\nA,10\nB,20\nC,30';
        const { headers, rows, numericColumns } = parseCSV(csv);
        expect(headers).toEqual(['name', 'value']);
        expect(rows).toHaveLength(3);
        expect(numericColumns).toContain('value');
    });

    it('computes descriptive stats', () => {
        const stats = descriptiveStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        expect(stats.mean).toBe(5.5);
        expect(stats.n).toBe(10);
        expect(stats.std).toBeGreaterThan(0);
    });

    it('fits distributions and ranks by KS', () => {
        const data = Array.from({ length: 100 }, (_, i) => 50 + Math.sin(i) * 10);
        const fits = fitDistributions(data);
        expect(fits.length).toBeGreaterThan(0);
        expect(fits[0].goodnessOfFit).toBeGreaterThanOrEqual(0);
    });
});

// ━━━━━━━━━ Share of Voice ━━━━━━━━━
describe('Share of Voice (MKT-005)', () => {
    it('calculates SOV across brands', () => {
        const result = calculateSOV([
            { brand: 'Us', spend: { social: 5000, search: 3000 } },
            { brand: 'Comp', spend: { social: 3000, search: 5000 } },
        ]);
        expect(result.totalMarketSpend).toBe(16000);
        expect(result.brandSOV).toHaveLength(2);
        expect(result.herfindahlIndex).toBeGreaterThan(0);
    });

    it('analyzes SOV vs SOM', () => {
        const result = analyzeSOVvsSOM([
            { brand: 'Us', sov: 0.6, som: 0.4 },
            { brand: 'Them', sov: 0.4, som: 0.6 },
        ]);
        expect(result[0].position).toBe('en_crecimiento');
        expect(result[1].position).toBe('en_retroceso');
    });

    it('generates SOV report', () => {
        const report = generateSOVReport({
            playerBrand: 'MyBrand', playerSpend: 10000, playerMarketShare: 0.3,
            competitors: [{ brand: 'Rival', spend: 15000, marketShare: 0.5 }],
        });
        expect(report.playerBrand).toBe('MyBrand');
        expect(report.competitiveLandscape).toHaveLength(2);
    });
});
