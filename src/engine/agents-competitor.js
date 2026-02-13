/**
 * Prometheus Engine – Competitor Agents
 * Rule-based, ML-prediction, and RL adversarial competitor agents.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Base Competitor Agent
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class CompetitorAgent {
    constructor(profile) {
        this.profile = profile;
        this.currentPrice = 0;
        this.currentMarketingSpend = 0;
        this.currentPromotion = null; // { type, discount, duration }
        this.revenue = 0;
        this.profit = 0;
        this.unitsSold = 0;
        this.history = [];
    }

    /** Decide action for this time step. Override in subclasses. */
    decide(marketState, rng) {
        return { price: this.currentPrice, marketingSpend: this.currentMarketingSpend, promotion: null };
    }

    /** Apply constraints from profile */
    applyConstraints(action, scenario) {
        const c = this.profile.constraints;
        const cogs = scenario?.sampledCOGS ?? this.profile.constraints.baseCOGS ?? 50;

        // Don't price below cost + min margin
        const minPrice = cogs * (1 + c.minMargin);
        action.price = Math.max(action.price, minPrice);

        // Cap marketing budget
        action.marketingSpend = Math.min(action.marketingSpend, c.maxMarketingBudget);

        // Cap discount
        if (action.promotion?.discount) {
            action.promotion.discount = Math.min(action.promotion.discount, c.maxPriceReduction);
        }

        return action;
    }

    reset() {
        this.revenue = 0;
        this.profit = 0;
        this.unitsSold = 0;
        this.history = [];
        this.currentPromotion = null;
    }

    recordStep(step) {
        this.history.push({ ...step, price: this.currentPrice, marketing: this.currentMarketingSpend });
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Rule-Based Competitor (Heuristic)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class RuleBasedCompetitor extends CompetitorAgent {
    constructor(profile, config = {}) {
        super(profile);
        this.basePrice = config.basePrice ?? 140;
        this.currentPrice = this.basePrice;
        this.baseMarketing = config.baseMarketing ?? 50000;
        this.currentMarketingSpend = this.baseMarketing;
        this.priceMatchRatio = config.priceMatchRatio ?? 0.8; // matches competitor at 80%
        this.reactionDelay = config.reactionDelay ?? 2; // weeks before reacting
        this.stepCount = 0;
    }

    decide(marketState, rng) {
        this.stepCount++;

        // React to our offer's price after delay
        const ourPrice = marketState.ourOffer?.currentPrice ?? 149;
        const agg = this.profile.aggressiveness;

        let newPrice = this.basePrice;
        let newMarketing = this.baseMarketing;
        let promotion = null;

        // If our price is lower, potentially match or undercut
        if (this.stepCount >= this.reactionDelay && ourPrice < this.basePrice) {
            const priceGap = (this.basePrice - ourPrice) / this.basePrice;

            if (priceGap > 0.05) { // >5% cheaper
                // Aggressive competitor matches or undercuts
                if (agg > 0.6) {
                    newPrice = ourPrice * (1 - 0.02 * agg); // undercut
                } else if (agg > 0.3) {
                    newPrice = ourPrice; // match
                }
                // else: no price change

                // Increase marketing response
                newMarketing = this.baseMarketing * (1 + agg * 0.5);
            }
        }

        // If our conversion is high, react with promotion
        if (marketState.ourConversionRate > 0.02 && agg > 0.5) {
            if (rng.next() < agg * 0.3) {
                promotion = {
                    type: 'discount',
                    discount: 0.1 + rng.next() * 0.15,
                    duration: 2 + Math.floor(rng.next() * 3),
                };
            }
        }

        // Random marketing bursts
        if (rng.next() < 0.05 * agg) {
            newMarketing *= 1.5;
        }

        const action = { price: newPrice, marketingSpend: newMarketing, promotion };
        return this.applyConstraints(action, marketState.competitorScenario);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ML-Prediction Competitor (Decision-tree-like)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class MLCompetitor extends CompetitorAgent {
    constructor(profile, config = {}) {
        super(profile);
        this.basePrice = config.basePrice ?? 139;
        this.currentPrice = this.basePrice;
        this.baseMarketing = config.baseMarketing ?? 80000;
        this.currentMarketingSpend = this.baseMarketing;
        this.learningRate = config.learningRate ?? 0.1;
        // Internal "model" = weighted features
        this.weights = {
            priceGap: -0.5,
            marketShareLoss: -0.8,
            marginPressure: 0.3,
            seasonality: 0.2,
        };
    }

    decide(marketState, rng) {
        const ourPrice = marketState.ourOffer?.currentPrice ?? 149;
        const ourSales = marketState.ourTotalSales ?? 0;
        const totalMarket = marketState.totalMarketSize ?? 100000;

        // Feature extraction
        const priceGap = (ourPrice - this.currentPrice) / this.currentPrice;
        const marketShareLoss = Math.min(1, ourSales / (totalMarket * 0.3));
        const margin = (this.currentPrice - (marketState.competitorScenario?.sampledCOGS ?? 50)) / this.currentPrice;
        const seasonality = Math.sin(2 * Math.PI * (marketState.week ?? 0) / 52) * 0.5 + 0.5;

        // Decision score
        const score = this.weights.priceGap * priceGap
            + this.weights.marketShareLoss * marketShareLoss
            + this.weights.marginPressure * margin
            + this.weights.seasonality * seasonality;

        let newPrice = this.currentPrice;
        let newMarketing = this.baseMarketing;
        let promotion = null;

        // Strong negative score → react aggressively
        if (score < -0.3) {
            const reduction = Math.min(0.15, Math.abs(score) * 0.2);
            newPrice = this.currentPrice * (1 - reduction);
            newMarketing = this.baseMarketing * (1 + Math.abs(score));
            if (score < -0.5) {
                promotion = { type: 'bundle', discount: 0.15, duration: 3 };
            }
        } else if (score > 0.2) {
            // Slightly increase price if winning
            newPrice = this.currentPrice * (1 + 0.03);
        }

        // Adapt weights slightly (online learning with noise)
        if (this.history.length > 2) {
            const lastResult = this.history[this.history.length - 1];
            const reward = (lastResult?.profit ?? 0) > 0 ? 0.01 : -0.01;
            for (const key in this.weights) {
                this.weights[key] += this.learningRate * reward * (0.5 - rng.next());
            }
        }

        const action = { price: newPrice, marketingSpend: newMarketing, promotion };
        return this.applyConstraints(action, marketState.competitorScenario);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  RL Adversarial Competitor (DQN-inspired)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class RLCompetitor extends CompetitorAgent {
    constructor(profile, config = {}) {
        super(profile);
        this.basePrice = config.basePrice ?? 145;
        this.currentPrice = this.basePrice;
        this.baseMarketing = config.baseMarketing ?? 100000;
        this.currentMarketingSpend = this.baseMarketing;

        // Q-table approximation (discrete state-action)
        this.epsilon = config.epsilon ?? 0.2; // exploration rate
        this.gamma = config.gamma ?? 0.95;     // discount factor
        this.alpha = config.alpha ?? 0.1;      // learning rate
        this.qTable = new Map();

        // Action space
        this.actions = [
            { id: 'hold', priceChange: 0, marketingMult: 1.0, promoDiscount: 0 },
            { id: 'slight_cut', priceChange: -0.05, marketingMult: 1.1, promoDiscount: 0 },
            { id: 'aggressive_cut', priceChange: -0.12, marketingMult: 1.3, promoDiscount: 0.1 },
            { id: 'undercut', priceChange: -0.18, marketingMult: 1.5, promoDiscount: 0.15 },
            { id: 'marketing_blitz', priceChange: 0, marketingMult: 2.0, promoDiscount: 0 },
            { id: 'bundle_defense', priceChange: -0.05, marketingMult: 1.2, promoDiscount: 0.12 },
            { id: 'premium_play', priceChange: 0.05, marketingMult: 0.8, promoDiscount: 0 },
            { id: 'counter_launch', priceChange: -0.08, marketingMult: 1.8, promoDiscount: 0.2 },
        ];

        this.lastState = null;
        this.lastAction = null;
    }

    _stateKey(marketState) {
        const ourPrice = marketState.ourOffer?.currentPrice ?? 149;
        const priceRatio = Math.round((this.currentPrice / ourPrice) * 10) / 10;
        const salesBucket = marketState.ourTotalSales > 10000 ? 'high' :
            marketState.ourTotalSales > 3000 ? 'mid' : 'low';
        const week = Math.min(Math.floor((marketState.week ?? 0) / 4), 12);
        return `${priceRatio}|${salesBucket}|${week}`;
    }

    _getQ(state, actionId) {
        return this.qTable.get(`${state}:${actionId}`) ?? 0;
    }
    _setQ(state, actionId, value) {
        this.qTable.set(`${state}:${actionId}`, value);
    }

    decide(marketState, rng) {
        const state = this._stateKey(marketState);

        // ε-greedy action selection
        let action;
        if (rng.next() < this.epsilon) {
            action = this.actions[Math.floor(rng.next() * this.actions.length)];
        } else {
            // Pick action with highest Q
            let bestQ = -Infinity;
            action = this.actions[0];
            for (const a of this.actions) {
                const q = this._getQ(state, a.id);
                if (q > bestQ) { bestQ = q; action = a; }
            }
        }

        // Q-learning update from last step
        if (this.lastState !== null && this.lastAction !== null) {
            const reward = this._computeReward(marketState);
            const maxFutureQ = Math.max(...this.actions.map(a => this._getQ(state, a.id)));
            const oldQ = this._getQ(this.lastState, this.lastAction.id);
            const newQ = oldQ + this.alpha * (reward + this.gamma * maxFutureQ - oldQ);
            this._setQ(this.lastState, this.lastAction.id, newQ);
        }

        this.lastState = state;
        this.lastAction = action;

        // Apply action to current state
        const newPrice = this.basePrice * (1 + action.priceChange);
        const newMarketing = this.baseMarketing * action.marketingMult;
        let promotion = null;
        if (action.promoDiscount > 0) {
            promotion = { type: 'discount', discount: action.promoDiscount, duration: 2 };
        }

        const result = this.applyConstraints(
            { price: newPrice, marketingSpend: newMarketing, promotion },
            marketState.competitorScenario
        );

        this.currentPrice = result.price;
        this.currentMarketingSpend = result.marketingSpend;
        this.currentPromotion = result.promotion;

        return result;
    }

    _computeReward(marketState) {
        // Reward = own profit increase - penalty for opponent success
        const ownProfit = this.profit;
        const ourSales = marketState.ourTotalSales ?? 0;
        const agg = this.profile.aggressiveness;

        // Maximize own benefit, minimize opponent's success (adversarial)
        return ownProfit * 0.001 - ourSales * 0.0001 * agg;
    }

    reset() {
        super.reset();
        this.lastState = null;
        this.lastAction = null;
        // Keep Q-table across resets to accumulate learning
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Factory
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function createCompetitorAgent(profile, config = {}) {
    switch (profile.type) {
        case 'ml': return new MLCompetitor(profile, config);
        case 'rl': return new RLCompetitor(profile, config);
        case 'rule_based':
        default: return new RuleBasedCompetitor(profile, config);
    }
}
