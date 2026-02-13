/**
 * Prometheus Engine – Simulation Pipeline Integration (INT-001)
 * Wires competitor dynamics, replenishment, and customer LTV into the MC pipeline.
 */

import { evaluateEntry, evaluateExit, generateCompetitor, CompetitorDynamicsTracker } from './competitor-dynamics.js';
import { simulateReplenishment } from './replenishment.js';
import { modelCohortLTV, assessChurnRisk } from './customer-ltv.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Enhanced Pipeline
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Simple seeded pseudo-random number generator.
 */
class SeededRNG {
    constructor(seed = 42) { this.state = seed; }
    next() {
        this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
        return (this.state >>> 0) / 4294967296;
    }
}

/**
 * Run enhanced simulation with competitor dynamics, replenishment planning, and LTV analysis.
 * Called after MC produces base results to enrich them.
 * @param {object} mcResults - base Monte Carlo results
 * @param {object} config - simulation configuration
 * @returns {object} enriched results
 */
export function enrichSimulationResults(mcResults, config = {}) {
    const enriched = { ...mcResults };

    // 1. Competitor Dynamics Analysis
    enriched.competitorDynamics = runCompetitorDynamicsAnalysis(config);

    // 2. Replenishment Planning
    enriched.replenishment = runReplenishmentAnalysis(mcResults, config);

    // 3. Customer LTV Projection
    enriched.customerLTV = runLTVAnalysis(mcResults, config);

    return enriched;
}

/**
 * Simulate competitor entry/exit over the simulation horizon.
 */
function runCompetitorDynamicsAnalysis(config) {
    const rng = new SeededRNG(123);
    const tracker = new CompetitorDynamicsTracker();
    const weeks = config.weeks || 26;

    // Start with existing competitors
    const numInitial = config.competitors?.length || 3;
    for (let i = 0; i < numInitial; i++) {
        tracker.addCompetitor(generateCompetitor(rng, {
            avgPrice: config.price || 100,
            avgQuality: 70,
            week: 0,
        }));
    }

    // Simulate weekly dynamics
    for (let w = 1; w <= weeks; w++) {
        const active = tracker.getActive();

        // Check exits
        for (const comp of active) {
            const { shouldExit, reason } = evaluateExit(comp, {
                week: w,
                minShareThreshold: 0.02,
                maxLossWeeks: 8,
            }, rng);
            if (shouldExit) {
                tracker.removeCompetitor(comp.id, w, reason);
            }
        }

        // Check entry
        const { shouldEnter } = evaluateEntry({
            week: w,
            avgMargin: config.margin || 30,
            activeCompetitors: tracker.getActive().length,
            marketGrowthRate: 0.03,
        }, rng);

        if (shouldEnter) {
            tracker.addCompetitor(generateCompetitor(rng, {
                avgPrice: config.price || 100,
                avgQuality: 70,
                week: w,
            }));
        }
    }

    return tracker.getSummary();
}

/**
 * Run replenishment analysis using MC results for demand estimation.
 */
function runReplenishmentAnalysis(mcResults, config) {
    const avgWeeklySales = mcResults?.sales?.mean
        ? mcResults.sales.mean / (config.weeks || 26)
        : 100;

    return simulateReplenishment({
        initialInventory: config.stock || 5000,
        avgWeeklyDemand: Math.round(avgWeeklySales),
        leadTimeWeeks: config.leadTimeWeeks || 2,
        orderCost: config.orderCost || 500,
        holdingCostPerUnit: config.holdingCostPerUnit || 1,
        weeks: config.weeks || 26,
    });
}

/**
 * Project customer LTV from simulation results.
 */
function runLTVAnalysis(mcResults, config) {
    const avgRevenue = mcResults?.revenue?.mean || 100000;
    const avgSales = mcResults?.sales?.mean || 1000;
    const aov = avgSales > 0 ? avgRevenue / avgSales : 200;

    return modelCohortLTV({
        initialCohort: config.customerCohort || 500,
        avgOrderValue: Math.round(aov),
        ordersPerYear: config.ordersPerYear || 3,
        grossMarginPct: config.marginPct || 35,
        monthlyChurnRate: config.churnRate || 0.06,
        horizonMonths: 24,
    });
}

/**
 * Assess churn risk levels for a sample set.
 */
export function assessCohortChurnRisk(customers) {
    return customers.map(c => assessChurnRisk(c));
}
