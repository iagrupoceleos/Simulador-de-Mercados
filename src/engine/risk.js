/**
 * Prometheus Engine – Risk Quantification (VaR / CVaR)
 * Calculates financial risk metrics for inventory and profitability.
 */
import { computeStats } from './distributions.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  VaR / CVaR Calculator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class RiskEngine {
    /**
     * Calculate Value at Risk for a loss distribution.
     * VaR at confidence α = loss value such that P(Loss ≤ VaR) = α
     * @param {number[]} losses – array of loss values (higher = worse)
     * @param {number} confidence – e.g. 0.95, 0.99
     */
    static VaR(losses, confidence = 0.95) {
        const sorted = [...losses].sort((a, b) => a - b);
        const idx = Math.ceil(confidence * sorted.length) - 1;
        return sorted[Math.max(0, idx)];
    }

    /**
     * Conditional VaR (Expected Shortfall) = average of losses exceeding VaR
     */
    static CVaR(losses, confidence = 0.95) {
        const var_ = RiskEngine.VaR(losses, confidence);
        const tail = losses.filter(l => l >= var_);
        if (tail.length === 0) return var_;
        return tail.reduce((s, v) => s + v, 0) / tail.length;
    }

    /**
     * Full inventory risk analysis from Monte Carlo results.
     */
    static analyzeInventoryRisk(mcResults, offerCOGS = 50) {
        const results = mcResults.rawResults;
        if (!results || results.length === 0) return null;

        // Loss = value of unsold inventory (at COGS)
        const inventoryLosses = results.map(r => r.inventoryRemaining * offerCOGS);

        // Unprofitable inventory = units that would need to be sold below COGS
        // Approximate: if net profit per unit < 0, all remaining inventory is "at risk"
        const unprofitableLosses = results.map(r => {
            const avgMargin = r.totalUnitsSold > 0
                ? r.grossProfit / r.totalUnitsSold
                : 0;
            if (avgMargin < 0) return r.inventoryRemaining * offerCOGS;
            return r.inventoryRemaining * Math.max(0, offerCOGS - avgMargin * 0.3); // partial recovery
        });

        // Capital immobilized risk
        const capitalAtRisk = results.map(r => r.inventoryValue + r.totalMarketingSpent);

        return {
            // Inventory VaR/CVaR
            inventoryVaR95: RiskEngine.VaR(inventoryLosses, 0.95),
            inventoryVaR99: RiskEngine.VaR(inventoryLosses, 0.99),
            inventoryCVaR95: RiskEngine.CVaR(inventoryLosses, 0.95),
            inventoryCVaR99: RiskEngine.CVaR(inventoryLosses, 0.99),

            // Unprofitable inventory
            unprofitableVaR95: RiskEngine.VaR(unprofitableLosses, 0.95),
            unprofitableVaR99: RiskEngine.VaR(unprofitableLosses, 0.99),
            unprofitableCVaR95: RiskEngine.CVaR(unprofitableLosses, 0.95),

            // Margin risk
            marginVaR95: RiskEngine.VaR(results.map(r => -r.marginPct), 0.95) * -1,
            marginMin: Math.min(...results.map(r => r.marginPct)),

            // Capital at risk
            capitalVaR99: RiskEngine.VaR(capitalAtRisk, 0.99),

            // Probability of scenarios
            probInventoryExcess10pct: results.filter(r => r.unsoldPct > 10).length / results.length,
            probInventoryExcess25pct: results.filter(r => r.unsoldPct > 25).length / results.length,
            probNegativeProfit: results.filter(r => r.netProfit < 0).length / results.length,
            probMarginBelow15: results.filter(r => r.marginPct < 15).length / results.length,
            probMarginBelow20: results.filter(r => r.marginPct < 20).length / results.length,

            // Distribution data for charts
            inventoryLossDistribution: inventoryLosses,
            unprofitableDistribution: unprofitableLosses,

            // Stats
            inventoryStats: computeStats(inventoryLosses),
            marginStats: computeStats(results.map(r => r.marginPct)),
        };
    }

    /**
     * Profitability risk analysis (ROI, Break-even).
     */
    static analyzeProfitabilityRisk(mcResults) {
        const results = mcResults.rawResults;
        if (!results || results.length === 0) return null;

        const rois = results.map(r => r.roi);
        const netProfits = results.map(r => r.netProfit);
        const breakEvens = results.map(r => r.breakEvenWeek).filter(w => w >= 0);

        return {
            roiStats: computeStats(rois),
            roiVaR95: RiskEngine.VaR(rois.map(r => -r), 0.95) * -1, // worst-case ROI
            netProfitStats: computeStats(netProfits),
            netProfitVaR95: RiskEngine.VaR(netProfits.map(p => -p), 0.95) * -1,
            breakEvenStats: breakEvens.length > 0 ? computeStats(breakEvens) : null,
            probNoBreakEven: results.filter(r => r.breakEvenWeek < 0).length / results.length,
            probROIBelow0: results.filter(r => r.roi < 0).length / results.length,
            probROIAbove100: results.filter(r => r.roi > 100).length / results.length,
        };
    }
}
