/**
 * Prometheus Engine – Simulation Orchestrator
 * Coordinates agent interactions over simulated time.
 */
import { createCompetitorAgent } from './agents-competitor.js';
import { getSeasonalityMultiplier } from './seasonality.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Product Lifecycle Engine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Product lifecycle stages with default durations & novelty multipliers. */
export const LIFECYCLE_STAGES = [
    { name: 'launch', novelty: 1.30, durationPct: 0.12 }, // first 12% of horizon
    { name: 'growth', novelty: 1.15, durationPct: 0.27 }, // next 27%
    { name: 'maturity', novelty: 1.00, durationPct: 0.38 }, // next 38%
    { name: 'decline', novelty: 0.70, durationPct: 0.23 }, // last 23%
];

/**
 * Compute lifecycle stage and novelty factor for a given week.
 * @param {number} week – current simulation week (0-indexed)
 * @param {number} totalWeeks – total horizon
 * @returns {{ stage: string, noveltyFactor: number, progress: number }}
 */
export function getLifecycleState(week, totalWeeks) {
    const pct = week / Math.max(1, totalWeeks);
    let cumPct = 0;
    for (const stage of LIFECYCLE_STAGES) {
        cumPct += stage.durationPct;
        if (pct < cumPct) {
            // Smooth interpolation within stage
            const stageStart = cumPct - stage.durationPct;
            const stageProgress = (pct - stageStart) / stage.durationPct;
            // Blend toward next stage novelty for smooth curve
            const idx = LIFECYCLE_STAGES.indexOf(stage);
            const nextNovelty = idx < LIFECYCLE_STAGES.length - 1
                ? LIFECYCLE_STAGES[idx + 1].novelty
                : stage.novelty * 0.9;
            const noveltyFactor = stage.novelty + (nextNovelty - stage.novelty) * stageProgress;
            return { stage: stage.name, noveltyFactor, progress: stageProgress };
        }
    }
    // Past all stages (shouldn't happen)
    return { stage: 'decline', noveltyFactor: 0.65, progress: 1 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Offer State
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class OfferState {
    constructor(config) {
        this.name = config.name ?? 'New Product';
        this.basePrice = config.basePrice ?? 149;
        this.currentPrice = this.basePrice;
        this.cogs = config.cogs ?? 50;
        this.marketingBudget = config.marketingBudget ?? 200000;
        this.weeklyMarketingSpend = this.marketingBudget / 13; // quarterly
        this.qualityIndex = config.qualityIndex ?? 0.7;
        this.channels = config.channels ?? ['online', 'marketplace'];
        this.isNew = true;
        this.allowRepeat = config.allowRepeat ?? false;
        this.subscriptionPrice = config.subscriptionPrice ?? 0;
        this.subscriptionCost = config.subscriptionCost ?? 0;
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Simulation Run
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class SimulationRun {
    constructor({ offer, population, ngcScenario, competitorAgents, timeHorizonWeeks = 26 }) {
        this.offer = offer;
        this.population = population;
        this.scenario = ngcScenario;
        this.competitorAgents = competitorAgents;
        this.timeHorizon = timeHorizonWeeks;

        // Accumulators
        this.weeklyMetrics = [];
        this.totalUnitsSold = 0;
        this.totalRevenue = 0;
        this.totalCost = 0;
        this.totalMarketingSpent = 0;
        this.totalSubscribers = 0;
        this.inventoryRemaining = 0;
    }

    /**
     * Execute one full simulation run.
     * @param {number} initialInventory – units stocked
     * @param {import('./distributions.js').PRNG} rng
     * @returns {SimulationResult}
     */
    execute(initialInventory, rng) {
        let inventory = initialInventory;
        this.population.resetAll();
        for (const ca of this.competitorAgents) ca.reset();

        const marketState = {
            week: 0,
            ourOffer: this.offer,
            ourTotalSales: 0,
            ourConversionRate: 0,
            totalMarketSize: this.population.size,
            marketingSpend: this.offer.weeklyMarketingSpend,
            competitorAttractiveness: 0,
            competitorScenario: null,
            getAgent: (id) => this.population.getAgent(id),
        };

        for (let week = 0; week < this.timeHorizon; week++) {
            marketState.week = week;

            // ── Product lifecycle (SIM-001) ──
            const lifecycle = getLifecycleState(week, this.timeHorizon);
            marketState.lifecycleStage = lifecycle.stage;
            marketState.noveltyFactor = lifecycle.noveltyFactor;
            this.offer.isNew = lifecycle.stage === 'launch';

            // ── Demand seasonality (SIM-002) ──
            const season = getSeasonalityMultiplier(week, {
                startMonth: this.offer.launchMonth ?? 0,
                amplitude: 1.0,
            });
            marketState.seasonalMultiplier = season.multiplier;
            marketState.currentHoliday = season.holiday;

            // ── Competitor decisions ──
            let totalCompAttract = 0;
            for (let ci = 0; ci < this.competitorAgents.length; ci++) {
                const ca = this.competitorAgents[ci];
                const cpId = ca.profile.id;
                marketState.competitorScenario = this.scenario.competitors[cpId] ?? null;
                const action = ca.decide(marketState, rng);
                ca.currentPrice = action.price;
                ca.currentMarketingSpend = action.marketingSpend;
                ca.currentPromotion = action.promotion;

                // Competitor attractiveness based on price advantage and marketing
                const priceAdv = Math.max(0, (this.offer.currentPrice - ca.currentPrice) / this.offer.currentPrice);
                const marketingAdv = ca.currentMarketingSpend / Math.max(1, this.offer.weeklyMarketingSpend);
                const promoBoost = ca.currentPromotion ? ca.currentPromotion.discount * 0.5 : 0;
                totalCompAttract += (priceAdv * 0.5 + Math.min(1, marketingAdv * 0.3) + promoBoost) * ca.profile.marketShare;
            }
            marketState.competitorAttractiveness = Math.min(1, totalCompAttract);

            // ── Apply risk events ──
            let cogsMultiplier = 1;
            for (const risk of (this.scenario.riskResults || [])) {
                if (risk.triggered && risk.value) {
                    cogsMultiplier += risk.value;
                }
            }
            const effectiveCOGS = this.offer.cogs * cogsMultiplier;

            // ── Customer purchase decisions ──
            let weekSales = 0;
            let weekConversions = 0;
            const agents = this.population.agents;

            for (let i = 0; i < agents.length; i++) {
                if (inventory <= 0) break;
                const result = agents[i].evaluatePurchase(this.offer, marketState, rng);
                weekConversions += result.probability;
                if (result.willBuy) {
                    weekSales++;
                    inventory--;
                    this.totalUnitsSold++;
                    const saleRevenue = this.offer.currentPrice;
                    this.totalRevenue += saleRevenue;
                    this.totalCost += effectiveCOGS;

                    // Subscription
                    if (this.offer.subscriptionPrice > 0 && rng.next() < 0.6) {
                        this.totalSubscribers++;
                    }
                }
            }

            const avgConversion = agents.length > 0 ? weekConversions / agents.length : 0;
            marketState.ourConversionRate = avgConversion;
            marketState.ourTotalSales = this.totalUnitsSold;
            marketState.marketingSpend = this.offer.weeklyMarketingSpend;
            this.totalMarketingSpent += this.offer.weeklyMarketingSpend;

            // Update competitor profit tracking
            for (const ca of this.competitorAgents) {
                const cpSales = Math.floor(ca.profile.marketShare * this.population.size * 0.01 * rng.next());
                ca.unitsSold += cpSales;
                ca.revenue += cpSales * ca.currentPrice;
                ca.profit += cpSales * (ca.currentPrice - (this.scenario.competitors[ca.profile.id]?.sampledCOGS ?? 50));
                ca.recordStep({ week, sales: cpSales });
            }

            // Record weekly metrics
            this.weeklyMetrics.push({
                week,
                unitsSold: weekSales,
                cumulativeSold: this.totalUnitsSold,
                inventory,
                revenue: weekSales * this.offer.currentPrice,
                cumulativeRevenue: this.totalRevenue,
                avgConversion: avgConversion,
                ourPrice: this.offer.currentPrice,
                competitorPrices: this.competitorAgents.map(ca => ca.currentPrice),
                competitorAttractiveness: marketState.competitorAttractiveness,
                effectiveCOGS,
                subscribers: this.totalSubscribers,
            });
        }

        this.inventoryRemaining = inventory;

        return this.getResult(initialInventory);
    }

    getResult(initialInventory) {
        const grossProfit = this.totalRevenue - this.totalCost;
        const netProfit = grossProfit - this.totalMarketingSpent;
        const roi = this.totalMarketingSpent > 0
            ? (netProfit / (this.totalCost + this.totalMarketingSpent)) * 100
            : 0;
        const marginPct = this.totalRevenue > 0 ? (grossProfit / this.totalRevenue) * 100 : 0;
        const inventoryValue = this.inventoryRemaining * this.offer.cogs;
        const unsoldPct = initialInventory > 0 ? (this.inventoryRemaining / initialInventory) * 100 : 0;

        // Subscription revenue over the horizon
        const subRevenue = this.totalSubscribers * this.offer.subscriptionPrice * (this.timeHorizon / 4.33);
        const subCost = this.totalSubscribers * this.offer.subscriptionCost * (this.timeHorizon / 4.33);

        // Break-even week
        let breakEvenWeek = -1;
        let cumProfit = 0;
        for (const m of this.weeklyMetrics) {
            cumProfit += m.revenue - (m.unitsSold * m.effectiveCOGS) - this.offer.weeklyMarketingSpend;
            if (cumProfit > 0 && breakEvenWeek === -1) breakEvenWeek = m.week;
        }

        return {
            totalUnitsSold: this.totalUnitsSold,
            totalRevenue: this.totalRevenue + subRevenue,
            totalCost: this.totalCost + subCost,
            grossProfit: grossProfit + (subRevenue - subCost),
            netProfit: netProfit + (subRevenue - subCost),
            roi,
            marginPct,
            inventoryRemaining: this.inventoryRemaining,
            inventoryValue,
            unsoldPct,
            breakEvenWeek,
            totalSubscribers: this.totalSubscribers,
            subscriptionRevenue: subRevenue,
            weeklyMetrics: this.weeklyMetrics,
            totalMarketingSpent: this.totalMarketingSpent,
        };
    }
}
