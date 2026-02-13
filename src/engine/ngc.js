/**
 * Prometheus Engine – NGC (Competitive & Uncertain Data Management)
 * Manages market data with embedded uncertainty through probability distributions.
 */
import { NormalDistribution, TruncatedNormalDistribution, BetaDistribution, TriangularDistribution, UniformDistribution, distributionFromJSON } from './distributions.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Market Data Container
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class MarketData {
    constructor() {
        /** @type {Map<string, any>} Known / deterministic values */
        this.known = new Map();
        /** @type {Map<string, import('./distributions.js').Distribution>} Uncertain params */
        this.uncertain = new Map();
    }
    set(key, value) { this.known.set(key, value); return this; }
    get(key) { return this.known.get(key); }
    setDistribution(key, dist) { this.uncertain.set(key, dist); return this; }
    getDistribution(key) { return this.uncertain.get(key); }
    /** Sample all uncertain params into a deterministic scenario */
    sampleScenario(rng) {
        const scenario = {};
        for (const [k, v] of this.known) scenario[k] = v;
        for (const [k, dist] of this.uncertain) scenario[k] = dist.sample(rng);
        return scenario;
    }
    toJSON() {
        const known = Object.fromEntries(this.known);
        const uncertain = {};
        for (const [k, d] of this.uncertain) uncertain[k] = d.toJSON();
        return { known, uncertain };
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Expert Belief (quantified assumption)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class ExpertBelief {
    constructor({ id, description, probability, distribution, category = 'general' }) {
        this.id = id;
        this.description = description;
        this.probability = probability; // likelihood this belief materializes (0-1)
        this.distribution = distribution;
        this.category = category; // 'pricing', 'marketing', 'supply_chain', etc.
    }
    /** Sample: first check if belief materializes, then sample impact */
    sample(rng) {
        const triggers = rng.next() < this.probability;
        return {
            triggered: triggers,
            value: triggers ? this.distribution.sample(rng) : 0,
        };
    }
    toJSON() {
        return {
            id: this.id,
            description: this.description,
            probability: this.probability,
            distribution: this.distribution.toJSON(),
            category: this.category,
        };
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Competitor Profile
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class CompetitorProfile {
    constructor({
        id,
        name,
        type = 'rule_based', // 'rule_based' | 'ml' | 'rl'
        aggressiveness = 0.5,
        financialHealth = 0.7,
        marketShare = 0.1,
        beliefs = [],
        constraints = {},
    }) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.aggressiveness = aggressiveness; // 0-1
        this.financialHealth = financialHealth; // 0-1
        this.marketShare = marketShare; // 0-1
        this.beliefs = beliefs.map(b => b instanceof ExpertBelief ? b : new ExpertBelief(b));

        // Business constraints for RL/ML agents
        this.constraints = {
            minMargin: constraints.minMargin ?? 0.1,            // 10% minimum margin
            maxMarketingBudget: constraints.maxMarketingBudget ?? 500000,
            maxPriceReduction: constraints.maxPriceReduction ?? 0.3, // max 30% discount
            riskAversion: constraints.riskAversion ?? 0.5,       // 0 = aggressive, 1 = conservative
        };

        // Uncertain internal params
        this.cogsDistribution = null; // Distribution for COGS estimation
        this.marketingBudgetDistribution = null;
        this.marginDistribution = null;
    }
    toJSON() {
        return {
            id: this.id, name: this.name, type: this.type,
            aggressiveness: this.aggressiveness,
            financialHealth: this.financialHealth,
            marketShare: this.marketShare,
            beliefs: this.beliefs.map(b => b.toJSON()),
            constraints: { ...this.constraints },
        };
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  NGC Module (Data Hub)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class NGC {
    constructor() {
        /** Our own (company) data */
        this.companyData = new MarketData();
        /** Macro / external market data */
        this.macroData = new MarketData();
        /** @type {Map<string, CompetitorProfile>} */
        this.competitors = new Map();
        /** Global risk events */
        this.riskEvents = [];
        /** Supply chain data */
        this.supplyChain = new MarketData();
    }

    // ---- Company Data ----
    setCompanyParam(key, value) { this.companyData.set(key, value); return this; }
    setCompanyUncertain(key, dist) { this.companyData.setDistribution(key, dist); return this; }

    // ---- Macro ----
    setMacroParam(key, value) { this.macroData.set(key, value); return this; }
    setMacroUncertain(key, dist) { this.macroData.setDistribution(key, dist); return this; }

    // ---- Competitors ----
    addCompetitor(profile) {
        const cp = profile instanceof CompetitorProfile ? profile : new CompetitorProfile(profile);
        this.competitors.set(cp.id, cp);
        return this;
    }
    removeCompetitor(id) { this.competitors.delete(id); }
    getCompetitor(id) { return this.competitors.get(id); }

    // ---- Risk Events ----
    addRiskEvent({ id, description, probability, impactDistribution, category }) {
        this.riskEvents.push(new ExpertBelief({
            id, description, probability, distribution: impactDistribution, category,
        }));
        return this;
    }

    // ---- Sample a full scenario ----
    sampleFullScenario(rng) {
        const company = this.companyData.sampleScenario(rng);
        const macro = this.macroData.sampleScenario(rng);
        const supply = this.supplyChain.sampleScenario(rng);

        const competitors = {};
        for (const [id, cp] of this.competitors) {
            competitors[id] = {
                ...cp,
                sampledBeliefs: cp.beliefs.map(b => ({ id: b.id, ...b.sample(rng) })),
                sampledCOGS: cp.cogsDistribution ? cp.cogsDistribution.sample(rng) : null,
                sampledMarketingBudget: cp.marketingBudgetDistribution ? cp.marketingBudgetDistribution.sample(rng) : null,
            };
        }

        const riskResults = this.riskEvents.map(ev => ({
            id: ev.id, description: ev.description,
            ...ev.sample(rng),
        }));

        return { company, macro, supply, competitors, riskResults };
    }

    toJSON() {
        return {
            companyData: this.companyData.toJSON(),
            macroData: this.macroData.toJSON(),
            competitors: Object.fromEntries([...this.competitors].map(([k, v]) => [k, v.toJSON()])),
            riskEvents: this.riskEvents.map(r => r.toJSON()),
            supplyChain: this.supplyChain.toJSON(),
        };
    }
}
