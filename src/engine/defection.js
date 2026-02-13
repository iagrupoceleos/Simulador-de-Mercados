/**
 * Prometheus Engine – Stock-out Customer Defection (SIM-003)
 * Models customer behavior when products are out of stock:
 * - Probability of switching to competitor
 * - Return probability decay over time
 * - Brand loyalty impact
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Defection Profiles by Vertical
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const DEFECTION_PROFILES = {
    electronics: {
        /** Probability a customer switches to competitor on stock-out */
        switchProbability: 0.55,
        /** Weekly decay rate of return probability after stock-out */
        returnDecayRate: 0.12,
        /** Minimum return probability floor */
        returnFloor: 0.15,
        /** How much a stock-out damages brand loyalty (permanent) */
        loyaltyDamage: 0.08,
        /** Weeks until customer "forgets" the stock-out (recovery start) */
        recoveryDelay: 3,
        /** Recovery rate per week after delay period */
        recoveryRate: 0.04,
    },
    fashion: {
        switchProbability: 0.70,
        returnDecayRate: 0.18,
        returnFloor: 0.10,
        loyaltyDamage: 0.12,
        recoveryDelay: 4,
        recoveryRate: 0.03,
    },
    food: {
        switchProbability: 0.80,
        returnDecayRate: 0.25,
        returnFloor: 0.20,
        loyaltyDamage: 0.05,
        recoveryDelay: 1,
        recoveryRate: 0.10,
    },
    default: {
        switchProbability: 0.60,
        returnDecayRate: 0.15,
        returnFloor: 0.15,
        loyaltyDamage: 0.08,
        recoveryDelay: 2,
        recoveryRate: 0.05,
    },
};

/**
 * Get defection profile for a vertical.
 * @param {string} vertical
 * @returns {object}
 */
export function getDefectionProfile(vertical) {
    return DEFECTION_PROFILES[vertical] || DEFECTION_PROFILES.default;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Defection Tracker
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Tracks stock-out events and their impact on customer base.
 */
export class DefectionTracker {
    /**
     * @param {string} vertical - product vertical
     * @param {number} initialCustomerBase - starting number of available customers
     */
    constructor(vertical, initialCustomerBase) {
        this.profile = getDefectionProfile(vertical);
        this.initialBase = initialCustomerBase;
        this.currentBase = initialCustomerBase;
        this.stockOutWeeks = 0;
        this.totalDefections = 0;
        this.loyaltyMultiplier = 1.0;
        this.weeksSinceLastStockOut = Infinity;
        this.history = [];
    }

    /**
     * Process a simulation week. Call each week to update defection state.
     * @param {boolean} isStockedOut - true if inventory <= 0 this week
     * @param {object} rng - PRNG instance
     * @returns {{ defections: number, returnees: number, effectiveBase: number, loyaltyMultiplier: number }}
     */
    processWeek(isStockedOut, rng) {
        let defections = 0;
        let returnees = 0;

        if (isStockedOut) {
            this.stockOutWeeks++;
            this.weeksSinceLastStockOut = 0;

            // Customers who encounter stock-out may defect
            const defectionRate = this.profile.switchProbability *
                (1 + Math.min(this.stockOutWeeks - 1, 3) * 0.1); // Worse with consecutive stock-outs
            defections = Math.round(this.currentBase * defectionRate * (rng ? rng.next() * 0.3 + 0.85 : 1));
            defections = Math.min(defections, this.currentBase);

            this.currentBase -= defections;
            this.totalDefections += defections;

            // Permanent loyalty damage
            this.loyaltyMultiplier *= (1 - this.profile.loyaltyDamage);
            this.loyaltyMultiplier = Math.max(this.loyaltyMultiplier, 0.3); // Floor
        } else {
            this.stockOutWeeks = 0;
            this.weeksSinceLastStockOut++;

            // Recovery: some defected customers return
            if (this.weeksSinceLastStockOut > this.profile.recoveryDelay && this.totalDefections > 0) {
                const returnRate = this.profile.recoveryRate *
                    Math.exp(-this.profile.returnDecayRate * this.weeksSinceLastStockOut);
                returnees = Math.round(this.totalDefections * Math.max(returnRate, this.profile.returnFloor * 0.1));
                returnees = Math.min(returnees, this.totalDefections);

                this.currentBase += returnees;
                this.totalDefections -= returnees;

                // Partial loyalty recovery
                this.loyaltyMultiplier = Math.min(
                    this.loyaltyMultiplier + this.profile.recoveryRate * 0.2,
                    1.0,
                );
            }
        }

        const result = {
            defections,
            returnees,
            effectiveBase: this.currentBase,
            loyaltyMultiplier: this.loyaltyMultiplier,
            stockOutWeeks: this.stockOutWeeks,
        };
        this.history.push(result);
        return result;
    }

    /**
     * Get summary statistics for the entire simulation.
     * @returns {object}
     */
    getSummary() {
        return {
            initialBase: this.initialBase,
            finalBase: this.currentBase,
            totalDefections: this.totalDefections,
            defectionRate: this.totalDefections / this.initialBase,
            finalLoyalty: this.loyaltyMultiplier,
            totalStockOutWeeks: this.history.filter(h => h.stockOutWeeks > 0).length,
            peakDefectionWeek: this.history.reduce(
                (max, h, i) => h.defections > (max.defections || 0) ? { week: i, defections: h.defections } : max,
                { week: -1, defections: 0 },
            ),
        };
    }
}
