/**
 * Prometheus Engine – Brand Awareness Build-up (MKT-003)
 * Models how brand awareness grows over time from marketing spend.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Brand Awareness Model
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Awareness build-up follows a logistic growth curve:
 * awareness(t) = maxAwareness / (1 + e^(-k*(t - t0)))
 * where k is growth rate and t0 is midpoint.
 */

/**
 * Brand Awareness Tracker.
 * Tracks awareness as a 0-1 metric that grows from marketing spend
 * and decays without sustained investment.
 */
export class BrandAwareness {
    /**
     * @param {object} params
     */
    constructor(params = {}) {
        const {
            initialAwareness = 0.05,
            maxAwareness = 0.95,
            growthRate = 0.03,      // per $10k marketing spend per week
            decayRate = 0.02,       // weekly decay without spending
            viral = 0.005,          // organic spread per awareness point per week
        } = params;

        this.awareness = initialAwareness;
        this.maxAwareness = maxAwareness;
        this.growthRate = growthRate;
        this.decayRate = decayRate;
        this.viral = viral;
        this.history = [{ week: 0, awareness: initialAwareness }];
    }

    /**
     * Update awareness for one simulation week.
     * @param {number} weeklyMarketingSpend - marketing spend this week
     * @param {number} [qualityMultiplier=1] - product quality effect
     * @returns {number} current awareness (0-1)
     */
    update(weeklyMarketingSpend, qualityMultiplier = 1) {
        // Marketing-driven growth (diminishing returns via logistic)
        const spendFactor = weeklyMarketingSpend / 10000; // normalize to $10k units
        const potentialGrowth = this.growthRate * spendFactor * qualityMultiplier;
        const headroom = this.maxAwareness - this.awareness;
        const marketingGrowth = potentialGrowth * (headroom / this.maxAwareness); // logistic decay

        // Organic/viral growth
        const viralGrowth = this.awareness * this.viral * headroom;

        // Natural decay (people forget)
        const decay = this.awareness * this.decayRate * (spendFactor < 0.5 ? 1 : 0.3); // reduced decay when spending

        // Apply
        this.awareness = Math.max(0, Math.min(this.maxAwareness,
            this.awareness + marketingGrowth + viralGrowth - decay,
        ));

        this.history.push({
            week: this.history.length,
            awareness: this.awareness,
            marketingGrowth,
            viralGrowth,
            decay,
            spend: weeklyMarketingSpend,
        });

        return this.awareness;
    }

    /**
     * Get the demand multiplier from current awareness.
     * Low awareness = low demand reach; high awareness = full demand potential.
     * @returns {number} multiplier (0.1 to 1.0)
     */
    getDemandMultiplier() {
        return 0.1 + this.awareness * 0.9;
    }

    /**
     * Get chart-ready awareness data.
     */
    getChartData() {
        return {
            weeks: this.history.map(h => h.week),
            awareness: this.history.map(h => h.awareness),
            spend: this.history.map(h => h.spend || 0),
        };
    }
}
