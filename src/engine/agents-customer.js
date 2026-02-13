/**
 * Prometheus Engine – Customer ABM Agents
 * Agent-Based Model for heterogeneous customer simulation.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Customer Agent
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class CustomerAgent {
    constructor({
        id,
        segment = 'general',
        priceSensitivity = 0.5,   // 0 = insensitive, 1 = very sensitive
        brandLoyalty = 0.5,        // 0 = no loyalty, 1 = die-hard fan
        qualityPreference = 0.5,   // 0 = price-driven, 1 = quality-first
        channelPreference = 'online', // 'online' | 'marketplace' | 'retail'
        socialInfluence = 0.3,     // how much influenced by network
        innovationAdoption = 0.5,  // 0 = laggard, 1 = early adopter
        budget = 500,              // monthly discretionary budget
        purchaseProbBase = 0.02,   // base probability of purchase per time-step
        connected = [],            // IDs of connected agents
    }) {
        this.id = id;
        this.segment = segment;
        this.priceSensitivity = priceSensitivity;
        this.brandLoyalty = brandLoyalty;
        this.qualityPreference = qualityPreference;
        this.channelPreference = channelPreference;
        this.socialInfluence = socialInfluence;
        this.innovationAdoption = innovationAdoption;
        this.budget = budget;
        this.purchaseProbBase = purchaseProbBase;
        this.connected = connected;

        // State
        this.hasPurchased = false;
        this.awareness = 0;        // 0-1 awareness of the product
        this.satisfaction = 0;     // post-purchase satisfaction
        this.subscribed = false;   // for subscription products
    }

    /**
     * Evaluate purchase decision for a product offering.
     * Returns { willBuy, probability }
     */
    evaluatePurchase(offer, marketState, rng) {
        if (this.hasPurchased && !offer.allowRepeat) {
            return { willBuy: false, probability: 0 };
        }

        // Price attractiveness (higher is better for cheap products)
        const priceRatio = offer.currentPrice / this.budget;
        const priceScore = Math.max(0, 1 - priceRatio * this.priceSensitivity * 2);

        // Brand/quality score
        const qualityScore = offer.qualityIndex * this.qualityPreference;

        // Innovation bonus (early adopters more likely to buy new products)
        const noveltyBonus = offer.isNew ? this.innovationAdoption * 0.3 : 0;

        // Social pressure from network
        const networkBuyers = this.connected.filter(id => {
            const neighbor = marketState.getAgent?.(id);
            return neighbor?.hasPurchased;
        }).length;
        const socialScore = this.connected.length > 0
            ? (networkBuyers / this.connected.length) * this.socialInfluence
            : 0;

        // Marketing reach effect
        const marketingEffect = Math.min(1, (marketState.marketingSpend || 0) / 200000) * 0.2;

        // Awareness grows over time with marketing spend and social influence
        this.awareness = Math.min(1, this.awareness + marketingEffect + socialScore * 0.1);

        // Competitor attractiveness dampens our probability
        const competitorPressure = marketState.competitorAttractiveness || 0;
        const competitorDampening = 1 - competitorPressure * 0.5;

        // Product lifecycle novelty factor (SIM-001)
        const noveltyFactor = marketState.noveltyFactor ?? 1.0;

        // Demand seasonality (SIM-002)
        const seasonalMultiplier = marketState.seasonalMultiplier ?? 1.0;

        // Combined probability
        let prob = this.purchaseProbBase
            * (0.3 + 0.7 * priceScore)
            * (0.5 + 0.5 * qualityScore)
            * (1 + noveltyBonus)
            * (1 + socialScore)
            * competitorDampening
            * this.awareness
            * noveltyFactor
            * seasonalMultiplier;

        prob = Math.min(prob, 0.95); // cap

        const willBuy = rng.next() < prob;
        if (willBuy) {
            this.hasPurchased = true;
            this.satisfaction = 0.5 + 0.5 * rng.next(); // random initial satisfaction
        }

        return { willBuy, probability: prob };
    }

    /** Reset agent state for a new simulation run */
    reset() {
        this.hasPurchased = false;
        this.awareness = 0;
        this.satisfaction = 0;
        this.subscribed = false;
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Customer Population Generator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class CustomerPopulation {
    constructor() {
        /** @type {CustomerAgent[]} */
        this.agents = [];
        /** @type {Map<number, CustomerAgent>} */
        this.agentMap = new Map();
    }

    get size() { return this.agents.length; }

    getAgent(id) { return this.agentMap.get(id); }

    /**
     * Generate a synthetic customer population based on segment distributions.
     */
    generate(config, rng) {
        const {
            totalCustomers = 5000,
            segments = [],
        } = config;

        this.agents = [];
        this.agentMap.clear();

        // Default segments if none provided
        const segs = segments.length > 0 ? segments : [
            { name: 'price_hunters', weight: 0.30, priceSens: [0.7, 0.95], brandLoyalty: [0.1, 0.3], quality: [0.2, 0.5], budget: [200, 600], innovation: [0.2, 0.5], purchaseProb: [0.01, 0.03] },
            { name: 'brand_loyalists', weight: 0.20, priceSens: [0.1, 0.4], brandLoyalty: [0.7, 0.95], quality: [0.5, 0.9], budget: [400, 1200], innovation: [0.3, 0.6], purchaseProb: [0.015, 0.04] },
            { name: 'early_adopters', weight: 0.15, priceSens: [0.2, 0.5], brandLoyalty: [0.3, 0.6], quality: [0.6, 0.9], budget: [500, 1500], innovation: [0.7, 0.95], purchaseProb: [0.02, 0.05] },
            { name: 'mainstream', weight: 0.25, priceSens: [0.4, 0.6], brandLoyalty: [0.3, 0.6], quality: [0.3, 0.7], budget: [300, 800], innovation: [0.3, 0.6], purchaseProb: [0.01, 0.025] },
            { name: 'bargain_seekers', weight: 0.10, priceSens: [0.8, 0.99], brandLoyalty: [0.05, 0.2], quality: [0.1, 0.4], budget: [100, 400], innovation: [0.1, 0.3], purchaseProb: [0.005, 0.02] },
        ];

        let id = 0;
        for (const seg of segs) {
            const count = Math.round(totalCustomers * seg.weight);
            for (let i = 0; i < count; i++) {
                const lerp = (range) => range[0] + rng.next() * (range[1] - range[0]);
                const agent = new CustomerAgent({
                    id: id++,
                    segment: seg.name,
                    priceSensitivity: lerp(seg.priceSens),
                    brandLoyalty: lerp(seg.brandLoyalty),
                    qualityPreference: lerp(seg.quality),
                    channelPreference: ['online', 'marketplace', 'retail'][Math.floor(rng.next() * 3)],
                    socialInfluence: 0.1 + rng.next() * 0.5,
                    innovationAdoption: lerp(seg.innovation),
                    budget: lerp(seg.budget),
                    purchaseProbBase: lerp(seg.purchaseProb),
                    connected: [],
                });
                this.agents.push(agent);
                this.agentMap.set(agent.id, agent);
            }
        }

        // Build social network (small-world: ~6 connections per agent)
        this._buildSocialNetwork(rng);

        return this;
    }

    /** Small-world network: each agent connects to ~6 neighbors + random long-range */
    _buildSocialNetwork(rng) {
        const n = this.agents.length;
        if (n < 2) return;
        const avgConnections = Math.min(6, Math.floor(n / 2));
        for (let i = 0; i < n; i++) {
            const connections = new Set();
            // Local neighbors
            for (let j = 1; j <= avgConnections / 2; j++) {
                connections.add((i + j) % n);
                connections.add((i - j + n) % n);
            }
            // Random rewiring (Watts-Strogatz p=0.1)
            for (const c of [...connections]) {
                if (rng.next() < 0.1) {
                    connections.delete(c);
                    connections.add(Math.floor(rng.next() * n));
                }
            }
            connections.delete(i); // no self-loops
            this.agents[i].connected = [...connections].map(idx => this.agents[idx].id);
        }
    }

    /** Reset all agents for a new simulation run */
    resetAll() {
        for (const agent of this.agents) agent.reset();
    }
}
