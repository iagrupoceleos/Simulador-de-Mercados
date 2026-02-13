/**
 * Prometheus Engine – Risk Module Tests
 * Tests for VaR, CVaR, inventory risk, and profitability risk analysis.
 */
import { describe, it, expect } from 'vitest';
import { RiskEngine } from '../engine/risk.js';

// ── Helper: create mock MC results ──
function createMockMCResults(count, overrides = {}) {
    const rawResults = [];
    for (let i = 0; i < count; i++) {
        rawResults.push({
            totalUnitsSold: 100 + i * 5,
            totalRevenue: (100 + i * 5) * 150,
            totalCost: (100 + i * 5) * 50,
            grossProfit: (100 + i * 5) * 100,
            netProfit: (100 + i * 5) * 100 - 20000,
            roi: ((100 + i * 5) * 100 - 20000) / ((100 + i * 5) * 50 + 20000) * 100,
            marginPct: ((100 + i * 5) * 100) / ((100 + i * 5) * 150) * 100,
            inventoryRemaining: Math.max(0, 500 - (100 + i * 5)),
            inventoryValue: Math.max(0, 500 - (100 + i * 5)) * 50,
            unsoldPct: Math.max(0, (500 - (100 + i * 5)) / 500) * 100,
            breakEvenWeek: i < count * 0.3 ? -1 : Math.floor(5 + i * 0.5),
            totalSubscribers: Math.floor(i * 2),
            subscriptionRevenue: Math.floor(i * 2) * 10 * 6,
            weeklyMetrics: [],
            totalMarketingSpent: 20000,
            ...overrides,
        });
    }
    return { rawResults };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━
//  VaR Tests
// ━━━━━━━━━━━━━━━━━━━━━━━━
describe('RiskEngine.VaR', () => {
    it('returns the correct percentile value for sorted losses', () => {
        // 10 values: [1,2,3,4,5,6,7,8,9,10]
        const losses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        // VaR at 90% = ceil(0.9 * 10) - 1 = index 8 = 9
        expect(RiskEngine.VaR(losses, 0.9)).toBe(9);
    });

    it('handles unsorted input', () => {
        const losses = [10, 3, 7, 1, 5, 9, 2, 8, 4, 6];
        expect(RiskEngine.VaR(losses, 0.9)).toBe(9);
    });

    it('returns max for 100% confidence', () => {
        const losses = [1, 2, 3, 4, 5];
        expect(RiskEngine.VaR(losses, 1.0)).toBe(5);
    });

    it('returns min for very low confidence', () => {
        const losses = [10, 20, 30, 40, 50];
        // VaR at 10% = ceil(0.1 * 5) - 1 = index 0 = 10
        expect(RiskEngine.VaR(losses, 0.1)).toBe(10);
    });

    it('handles single element', () => {
        expect(RiskEngine.VaR([42], 0.95)).toBe(42);
    });

    it('VaR at 95% is higher than at 50%', () => {
        const losses = Array.from({ length: 100 }, (_, i) => i + 1);
        const var50 = RiskEngine.VaR(losses, 0.5);
        const var95 = RiskEngine.VaR(losses, 0.95);
        expect(var95).toBeGreaterThan(var50);
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━
//  CVaR Tests
// ━━━━━━━━━━━━━━━━━━━━━━━━
describe('RiskEngine.CVaR', () => {
    it('is always >= VaR', () => {
        const losses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const var90 = RiskEngine.VaR(losses, 0.9);
        const cvar90 = RiskEngine.CVaR(losses, 0.9);
        expect(cvar90).toBeGreaterThanOrEqual(var90);
    });

    it('equals VaR when all tail values are equal', () => {
        const losses = [1, 2, 3, 4, 5, 5, 5, 5, 5, 5];
        const cvar90 = RiskEngine.CVaR(losses, 0.9);
        expect(cvar90).toBe(5);
    });

    it('computes correct average for known tail', () => {
        // losses = [1..10], VaR at 80% = ceil(0.8*10)-1 = index 7 = 8
        // tail = [8,9,10], CVaR = (8+9+10)/3 = 9
        const losses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        expect(RiskEngine.CVaR(losses, 0.8)).toBeCloseTo(9, 0);
    });

    it('handles single element', () => {
        expect(RiskEngine.CVaR([100], 0.95)).toBe(100);
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━
//  Inventory Risk Analysis
// ━━━━━━━━━━━━━━━━━━━━━━━━
describe('RiskEngine.analyzeInventoryRisk', () => {
    it('returns null for empty results', () => {
        expect(RiskEngine.analyzeInventoryRisk({ rawResults: [] })).toBeNull();
    });

    it('returns all expected fields', () => {
        const mc = createMockMCResults(50);
        const result = RiskEngine.analyzeInventoryRisk(mc, 50);

        expect(result).toHaveProperty('inventoryVaR95');
        expect(result).toHaveProperty('inventoryVaR99');
        expect(result).toHaveProperty('inventoryCVaR95');
        expect(result).toHaveProperty('inventoryCVaR99');
        expect(result).toHaveProperty('unprofitableVaR95');
        expect(result).toHaveProperty('capitalVaR99');
        expect(result).toHaveProperty('probInventoryExcess10pct');
        expect(result).toHaveProperty('probNegativeProfit');
        expect(result).toHaveProperty('inventoryStats');
        expect(result).toHaveProperty('marginStats');
    });

    it('VaR99 >= VaR95', () => {
        const mc = createMockMCResults(100);
        const result = RiskEngine.analyzeInventoryRisk(mc, 50);
        expect(result.inventoryVaR99).toBeGreaterThanOrEqual(result.inventoryVaR95);
    });

    it('CVaR95 >= VaR95', () => {
        const mc = createMockMCResults(100);
        const result = RiskEngine.analyzeInventoryRisk(mc, 50);
        expect(result.inventoryCVaR95).toBeGreaterThanOrEqual(result.inventoryVaR95);
    });

    it('probabilities are between 0 and 1', () => {
        const mc = createMockMCResults(100);
        const result = RiskEngine.analyzeInventoryRisk(mc, 50);
        expect(result.probInventoryExcess10pct).toBeGreaterThanOrEqual(0);
        expect(result.probInventoryExcess10pct).toBeLessThanOrEqual(1);
        expect(result.probNegativeProfit).toBeGreaterThanOrEqual(0);
        expect(result.probNegativeProfit).toBeLessThanOrEqual(1);
    });

    it('inventoryStats has expected shape', () => {
        const mc = createMockMCResults(50);
        const result = RiskEngine.analyzeInventoryRisk(mc, 50);
        expect(result.inventoryStats).toHaveProperty('mean');
        expect(result.inventoryStats).toHaveProperty('std');
        expect(result.inventoryStats).toHaveProperty('min');
        expect(result.inventoryStats).toHaveProperty('max');
        expect(result.inventoryStats).toHaveProperty('p50');
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━
//  Profitability Risk Analysis
// ━━━━━━━━━━━━━━━━━━━━━━━━
describe('RiskEngine.analyzeProfitabilityRisk', () => {
    it('returns null for empty results', () => {
        expect(RiskEngine.analyzeProfitabilityRisk({ rawResults: [] })).toBeNull();
    });

    it('returns all expected fields', () => {
        const mc = createMockMCResults(50);
        const result = RiskEngine.analyzeProfitabilityRisk(mc);

        expect(result).toHaveProperty('roiStats');
        expect(result).toHaveProperty('roiVaR95');
        expect(result).toHaveProperty('netProfitStats');
        expect(result).toHaveProperty('netProfitVaR95');
        expect(result).toHaveProperty('breakEvenStats');
        expect(result).toHaveProperty('probNoBreakEven');
        expect(result).toHaveProperty('probROIBelow0');
        expect(result).toHaveProperty('probROIAbove100');
    });

    it('probabilities are between 0 and 1', () => {
        const mc = createMockMCResults(100);
        const result = RiskEngine.analyzeProfitabilityRisk(mc);
        expect(result.probNoBreakEven).toBeGreaterThanOrEqual(0);
        expect(result.probNoBreakEven).toBeLessThanOrEqual(1);
        expect(result.probROIBelow0).toBeGreaterThanOrEqual(0);
        expect(result.probROIBelow0).toBeLessThanOrEqual(1);
    });

    it('ROI stats have correct shape', () => {
        const mc = createMockMCResults(50);
        const result = RiskEngine.analyzeProfitabilityRisk(mc);
        expect(result.roiStats).toHaveProperty('mean');
        expect(result.roiStats.mean).toBeTypeOf('number');
        expect(result.roiStats.std).toBeTypeOf('number');
    });

    it('break-even stats are null when no simulations break even', () => {
        // All breakEvenWeek = -1
        const mc = createMockMCResults(10, { breakEvenWeek: -1 });
        const result = RiskEngine.analyzeProfitabilityRisk(mc);
        expect(result.breakEvenStats).toBeNull();
        expect(result.probNoBreakEven).toBe(1);
    });
});
