/**
 * Prometheus Engine – Market Shock Events (SIM-008)
 * Models unexpected market disruptions and their effects on simulation.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Shock Event Catalog
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SHOCK_TYPES = {
    PANDEMIC: {
        name: 'Pandemia',
        icon: '🦠',
        demandMultiplier: 0.4,
        supplyMultiplier: 0.5,
        durationWeeks: 12,
        recoveryWeeks: 16,
        costIncrease: 0.30,
    },
    REGULATION: {
        name: 'Regulación',
        icon: '📜',
        demandMultiplier: 0.85,
        supplyMultiplier: 1.0,
        durationWeeks: 8,
        recoveryWeeks: 4,
        costIncrease: 0.15,
    },
    VIRAL_TREND: {
        name: 'Tendencia Viral',
        icon: '📱',
        demandMultiplier: 3.0,
        supplyMultiplier: 1.0,
        durationWeeks: 4,
        recoveryWeeks: 6,
        costIncrease: 0.0,
    },
    SUPPLY_DISRUPTION: {
        name: 'Rotura de Cadena',
        icon: '🚢',
        demandMultiplier: 1.0,
        supplyMultiplier: 0.3,
        durationWeeks: 8,
        recoveryWeeks: 12,
        costIncrease: 0.40,
    },
    ECONOMIC_CRISIS: {
        name: 'Crisis Económica',
        icon: '📉',
        demandMultiplier: 0.6,
        supplyMultiplier: 0.8,
        durationWeeks: 24,
        recoveryWeeks: 20,
        costIncrease: 0.10,
    },
    COMPETITOR_EXIT: {
        name: 'Salida de Competidor',
        icon: '🏳️',
        demandMultiplier: 1.3,
        supplyMultiplier: 1.0,
        durationWeeks: 52,
        recoveryWeeks: 0,
        costIncrease: 0.0,
    },
};

/**
 * Create a shock event schedule.
 * @param {object} params
 * @param {string} params.type - key from SHOCK_TYPES
 * @param {number} params.startWeek - when the shock begins
 * @param {number} [params.severity=1.0] - multiplier on shock intensity (0.5=mild, 2=severe)
 * @returns {object} shock event
 */
export function createShockEvent({ type, startWeek, severity = 1.0 }) {
    const template = SHOCK_TYPES[type] || SHOCK_TYPES.REGULATION;

    const demandEffect = 1 - (1 - template.demandMultiplier) * severity;
    const supplyEffect = 1 - (1 - template.supplyMultiplier) * severity;

    return {
        type,
        name: template.name,
        icon: template.icon,
        startWeek,
        endWeek: startWeek + template.durationWeeks,
        recoveryEnd: startWeek + template.durationWeeks + template.recoveryWeeks,
        peakDemandMultiplier: Math.max(0.1, demandEffect),
        peakSupplyMultiplier: Math.max(0.1, supplyEffect),
        costIncrease: template.costIncrease * severity,
        severity,
    };
}

/**
 * Calculate the demand and supply effects at a given week for a list of shock events.
 * Uses smooth transitions (ease in/out) instead of abrupt changes.
 * @param {number} week
 * @param {object[]} shockEvents - from createShockEvent()
 * @returns {object} { demandFactor, supplyFactor, costFactor, activeShocks }
 */
export function getShockEffects(week, shockEvents) {
    let demandFactor = 1.0;
    let supplyFactor = 1.0;
    let costFactor = 1.0;
    const activeShocks = [];

    for (const shock of shockEvents) {
        if (week < shock.startWeek || week > shock.recoveryEnd) continue;

        let intensity;
        if (week <= shock.endWeek) {
            // During shock: ramp up intensity
            const progress = (week - shock.startWeek) / (shock.endWeek - shock.startWeek || 1);
            intensity = easeInOut(Math.min(1, progress));
        } else {
            // Recovery phase: ramp down intensity
            const progress = (week - shock.endWeek) / (shock.recoveryEnd - shock.endWeek || 1);
            intensity = 1 - easeInOut(Math.min(1, progress));
        }

        demandFactor *= 1 + (shock.peakDemandMultiplier - 1) * intensity;
        supplyFactor *= 1 + (shock.peakSupplyMultiplier - 1) * intensity;
        costFactor *= 1 + shock.costIncrease * intensity;

        if (intensity > 0.01) {
            activeShocks.push({
                name: shock.name,
                icon: shock.icon,
                intensity: Math.round(intensity * 100),
                phase: week <= shock.endWeek ? 'impacto' : 'recuperación',
            });
        }
    }

    return {
        demandFactor: Math.max(0.05, demandFactor),
        supplyFactor: Math.max(0.05, supplyFactor),
        costFactor: Math.max(1.0, costFactor),
        activeShocks,
    };
}

/**
 * Simulate revenue under shock scenarios.
 * @param {object} baseConfig
 * @param {object[]} shockEvents
 * @returns {object[]} weekly results with shock effects applied
 */
export function simulateWithShocks(baseConfig, shockEvents = []) {
    const { weeklyRevenue = 50000, weeks = 52, baseGrowth = 0.001 } = baseConfig;
    const results = [];

    for (let w = 1; w <= weeks; w++) {
        const { demandFactor, costFactor, activeShocks } = getShockEffects(w, shockEvents);
        const growth = 1 + baseGrowth * w;
        const adjustedRevenue = Math.round(weeklyRevenue * growth * demandFactor);
        const adjustedCost = Math.round(weeklyRevenue * 0.65 * costFactor);
        const profit = adjustedRevenue - adjustedCost;

        results.push({
            week: w,
            revenue: adjustedRevenue,
            cost: adjustedCost,
            profit,
            demandFactor: Math.round(demandFactor * 1000) / 1000,
            costFactor: Math.round(costFactor * 1000) / 1000,
            activeShocks,
            shockCount: activeShocks.length,
        });
    }

    return results;
}

// Smooth ease-in-out
function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
