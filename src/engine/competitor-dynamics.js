/**
 * Prometheus Engine – Competitor Exit/Entry Dynamics (SIM-005)
 * Models competitor market entry and exit during simulation runs.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Competitor Dynamics
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * @typedef {object} CompetitorProfile
 * @property {string} id
 * @property {string} name
 * @property {number} price
 * @property {number} quality
 * @property {number} marketShare
 * @property {boolean} active
 * @property {number} entryWeek
 * @property {number} [exitWeek]
 * @property {string} [exitReason]
 */

/**
 * Generate a random competitor profile.
 * @param {object} rng - { next: () => number }
 * @param {object} market - { avgPrice, avgQuality, week }
 * @returns {CompetitorProfile}
 */
export function generateCompetitor(rng, market) {
    const priceMultiplier = 0.7 + rng.next() * 0.6; // 70-130% of market avg
    const qualityMultiplier = 0.6 + rng.next() * 0.8; // 60-140%
    const id = `comp-${market.week}-${Math.round(rng.next() * 9999)}`;

    return {
        id,
        name: `Competidor ${id.slice(-4)}`,
        price: Math.round(market.avgPrice * priceMultiplier),
        quality: Math.round(market.avgQuality * qualityMultiplier),
        marketShare: 0,
        active: true,
        entryWeek: market.week,
    };
}

/**
 * Check if a competitor should exit the market.
 * @param {CompetitorProfile} competitor
 * @param {object} context
 * @param {number} context.week
 * @param {number} context.minShareThreshold - below this, risk of exit
 * @param {number} context.maxLossWeeks - consecutive weeks of low share before exit
 * @param {object} rng
 * @returns {{ shouldExit: boolean, reason: string }}
 */
export function evaluateExit(competitor, context, rng) {
    const { week, minShareThreshold = 0.02, maxLossWeeks = 8 } = context;
    const weeksActive = week - competitor.entryWeek;

    // Too early to exit
    if (weeksActive < 4) return { shouldExit: false, reason: '' };

    // Very low market share → probability of exit increases
    if (competitor.marketShare < minShareThreshold) {
        const exitProb = Math.min(0.3, (minShareThreshold - competitor.marketShare) * 10);
        if (rng.next() < exitProb) {
            return { shouldExit: true, reason: 'participación_baja' };
        }
    }

    // Long tenure with declining share → exhaustion exit
    if (weeksActive > maxLossWeeks && competitor.marketShare < 0.05) {
        if (rng.next() < 0.1) {
            return { shouldExit: true, reason: 'desgaste_prolongado' };
        }
    }

    // Random strategic exit (e.g., pivot, acquisition)
    if (rng.next() < 0.005) {
        return { shouldExit: true, reason: 'decisión_estratégica' };
    }

    return { shouldExit: false, reason: '' };
}

/**
 * Check if a new competitor should enter the market.
 * @param {object} market
 * @param {number} market.week
 * @param {number} market.avgMargin - average margin in market
 * @param {number} market.activeCompetitors - current count
 * @param {number} market.marketGrowthRate - % growth
 * @param {object} rng
 * @returns {{ shouldEnter: boolean, reason: string }}
 */
export function evaluateEntry(market, rng) {
    const { avgMargin = 30, activeCompetitors = 3, marketGrowthRate = 0 } = market;

    // High margins attract entrants
    let entryProb = 0.01; // base probability per week

    if (avgMargin > 40) entryProb += 0.03;
    if (avgMargin > 60) entryProb += 0.05;

    // Growing market also attracts
    if (marketGrowthRate > 0.05) entryProb += 0.02;

    // Fewer competitors = more room
    if (activeCompetitors < 3) entryProb += 0.02;

    // Saturated market deters entry
    if (activeCompetitors > 6) entryProb *= 0.3;

    if (rng.next() < entryProb) {
        return { shouldEnter: true, reason: avgMargin > 40 ? 'márgenes_atractivos' : 'oportunidad_de_mercado' };
    }

    return { shouldEnter: false, reason: '' };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Dynamics Tracker
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Track competitor entries and exits over the simulation.
 */
export class CompetitorDynamicsTracker {
    constructor() {
        this.competitors = new Map();
        this.events = [];
    }

    addCompetitor(competitor) {
        this.competitors.set(competitor.id, competitor);
        this.events.push({ type: 'entry', week: competitor.entryWeek, ...competitor });
    }

    removeCompetitor(id, week, reason) {
        const comp = this.competitors.get(id);
        if (comp) {
            comp.active = false;
            comp.exitWeek = week;
            comp.exitReason = reason;
            this.events.push({ type: 'exit', week, id, reason });
        }
    }

    getActive() {
        return [...this.competitors.values()].filter(c => c.active);
    }

    getSummary() {
        const all = [...this.competitors.values()];
        return {
            total: all.length,
            active: all.filter(c => c.active).length,
            exited: all.filter(c => !c.active).length,
            entries: this.events.filter(e => e.type === 'entry').length,
            exits: this.events.filter(e => e.type === 'exit').length,
            avgLifespan: all.filter(c => !c.active && c.exitWeek)
                .reduce((s, c) => s + (c.exitWeek - c.entryWeek), 0)
                / Math.max(1, all.filter(c => !c.active).length),
            events: this.events,
        };
    }
}
