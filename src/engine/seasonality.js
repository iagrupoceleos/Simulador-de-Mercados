/**
 * Prometheus Engine – Seasonality Module (SIM-002)
 * Models weekly and holiday demand seasonality patterns.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Seasonality Pattern Definitions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Weekly intra-week multiplier: weekend vs weekday demand.
 * Not used directly in weekly sim, but available for future daily granularity.
 */
export const WEEKLY_PATTERN = {
    mon: 0.85, tue: 0.90, wed: 0.95, thu: 1.00,
    fri: 1.15, sat: 1.25, sun: 1.10,
};

/**
 * Monthly seasonality: 12-month multiplier (index 0 = Jan).
 * Based on typical e-commerce patterns (Q4 peak, summer dip).
 */
export const MONTHLY_SEASONALITY = [
    0.90,  // Jan  – post-holiday reset
    0.85,  // Feb  – winter low
    0.95,  // Mar  – spring uptick
    1.00,  // Apr  – baseline
    1.00,  // May  – stable
    0.92,  // Jun  – summer start dip
    0.88,  // Jul  – summer low
    0.90,  // Aug  – back-to-school prep
    1.05,  // Sep  – back-to-school
    1.10,  // Oct  – pre-holiday
    1.30,  // Nov  – Black Friday / Cyber Monday
    1.40,  // Dec  – holiday peak
];

/**
 * Holiday boosts: keyed by week-of-year (0-indexed from sim start).
 * These are additive multipliers on top of monthly seasonality.
 */
export const HOLIDAY_BOOSTS = {
    valentines: { weekOfYear: 6, boost: 1.15 },
    mothersDay: { weekOfYear: 19, boost: 1.20 },
    fathersDay: { weekOfYear: 24, boost: 1.10 },
    backToSchool: { weekOfYear: 35, boost: 1.15 },
    halloween: { weekOfYear: 43, boost: 1.10 },
    blackFriday: { weekOfYear: 47, boost: 1.50 },
    cyberMonday: { weekOfYear: 48, boost: 1.40 },
    christmas: { weekOfYear: 51, boost: 1.60 },
    newYear: { weekOfYear: 0, boost: 1.05 },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Seasonality Calculator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Compute the demand seasonality multiplier for a given simulation week.
 * 
 * @param {number} simWeek - simulation week (0-indexed)
 * @param {object} [options] - configuration
 * @param {number} [options.startMonth=0] - start month of the simulation (0=Jan)
 * @param {boolean} [options.useHolidays=true] - apply holiday boosts
 * @param {number} [options.amplitude=1.0] - how strong the seasonal effect is (0=off, 1=default, 2=exaggerated)
 * @returns {{ multiplier: number, month: number, holiday: string|null }}
 */
export function getSeasonalityMultiplier(simWeek, options = {}) {
    const {
        startMonth = 0,
        useHolidays = true,
        amplitude = 1.0,
    } = options;

    // Compute which calendar month this simulation week falls in
    const weeksPerMonth = 4.33;
    const monthsElapsed = simWeek / weeksPerMonth;
    const currentMonth = Math.floor((startMonth + monthsElapsed) % 12);

    // Monthly base multiplier
    const baseMultiplier = MONTHLY_SEASONALITY[currentMonth];

    // Scale amplitude around 1.0: multiplier = 1 + (base - 1) * amplitude
    let multiplier = 1.0 + (baseMultiplier - 1.0) * amplitude;

    // Holiday check
    let holiday = null;
    if (useHolidays) {
        const weekOfYear = Math.floor((startMonth * weeksPerMonth + simWeek) % 52);
        for (const [name, h] of Object.entries(HOLIDAY_BOOSTS)) {
            if (Math.abs(weekOfYear - h.weekOfYear) <= 0) {
                holiday = name;
                multiplier *= (1.0 + (h.boost - 1.0) * amplitude);
                break;
            }
        }
    }

    return {
        multiplier: Math.max(0.5, multiplier), // floor at 0.5x
        month: currentMonth,
        holiday,
    };
}

/**
 * Generate a full season profile for a given time horizon.
 * Useful for visualization and pre-computation.
 * 
 * @param {number} totalWeeks
 * @param {object} [options] – same as getSeasonalityMultiplier
 * @returns {Array<{ week: number, multiplier: number, month: number, holiday: string|null }>}
 */
export function generateSeasonProfile(totalWeeks, options = {}) {
    const profile = [];
    for (let w = 0; w < totalWeeks; w++) {
        profile.push({ week: w, ...getSeasonalityMultiplier(w, options) });
    }
    return profile;
}
