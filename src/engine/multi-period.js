/**
 * Prometheus Engine – Multi-Period Simulation (SIM-006)
 * Extends the base weekly simulation to monthly/quarterly planning horizons.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Period Aggregator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const PERIODS = {
    WEEKLY: { name: 'weekly', weeksPerPeriod: 1, label: 'Semana' },
    MONTHLY: { name: 'monthly', weeksPerPeriod: 4, label: 'Mes' },
    QUARTERLY: { name: 'quarterly', weeksPerPeriod: 13, label: 'Trimestre' },
    YEARLY: { name: 'yearly', weeksPerPeriod: 52, label: 'Año' },
};

/**
 * Aggregate weekly simulation data into higher-level periods.
 * @param {object[]} weeklyData - array of weekly results { week, revenue, sales, profit, ... }
 * @param {string} [periodType='monthly'] - 'weekly'|'monthly'|'quarterly'|'yearly'
 * @returns {object[]} aggregated period data
 */
export function aggregateByPeriod(weeklyData, periodType = 'monthly') {
    const period = PERIODS[periodType.toUpperCase()] || PERIODS.MONTHLY;
    const { weeksPerPeriod, label } = period;
    const result = [];

    for (let i = 0; i < weeklyData.length; i += weeksPerPeriod) {
        const chunk = weeklyData.slice(i, i + weeksPerPeriod);
        if (chunk.length === 0) break;

        const periodIndex = result.length + 1;
        result.push({
            period: periodIndex,
            label: `${label} ${periodIndex}`,
            weeks: chunk.map(w => w.week),
            revenue: sum(chunk, 'revenue'),
            sales: sum(chunk, 'sales'),
            profit: sum(chunk, 'profit'),
            avgPrice: mean(chunk, 'avgPrice'),
            avgMarketShare: mean(chunk, 'marketShare'),
            avgInventory: mean(chunk, 'inventory'),
            stockoutWeeks: chunk.filter(w => (w.inventory || 0) <= 0).length,
            minInventory: Math.min(...chunk.map(w => w.inventory || 0)),
            maxInventory: Math.max(...chunk.map(w => w.inventory || 0)),
            customerCount: sum(chunk, 'customers'),
        });
    }

    return result;
}

/**
 * Run multi-period planning simulation.
 * @param {object} config
 * @param {number} config.horizonMonths - planning horizon in months
 * @param {number} config.baseRevenue - monthly base revenue
 * @param {number} config.growthRate - fractional monthly growth rate
 * @param {number} config.seasonalAmplitude - seasonal swing (0-1)
 * @param {number} config.marginPct - gross margin percentage
 * @param {number} [config.scenarios=3] - number of scenarios (optimistic, base, pessimistic)
 * @returns {object} multi-period plan
 */
export function multiPeriodPlan(config) {
    const {
        horizonMonths = 12,
        baseRevenue = 100000,
        growthRate = 0.02,
        seasonalAmplitude = 0.15,
        marginPct = 35,
        scenarios = 3,
    } = config;

    const scenarioFactors = [
        { name: 'Optimista', factor: 1.2 },
        { name: 'Base', factor: 1.0 },
        { name: 'Pesimista', factor: 0.8 },
    ].slice(0, scenarios);

    return scenarioFactors.map(({ name, factor }) => {
        const months = [];
        let cumRevenue = 0;
        let cumProfit = 0;

        for (let m = 1; m <= horizonMonths; m++) {
            const growth = Math.pow(1 + growthRate, m);
            const seasonal = 1 + seasonalAmplitude * Math.sin((m - 1) * Math.PI / 6);
            const revenue = Math.round(baseRevenue * growth * seasonal * factor);
            const profit = Math.round(revenue * marginPct / 100);
            cumRevenue += revenue;
            cumProfit += profit;

            months.push({
                month: m,
                revenue,
                profit,
                cumRevenue,
                cumProfit,
                growthVsBaseline: growth * factor,
            });
        }

        return {
            scenario: name,
            factor,
            months,
            totalRevenue: cumRevenue,
            totalProfit: cumProfit,
            avgMonthlyRevenue: Math.round(cumRevenue / horizonMonths),
        };
    });
}

// ━━━━━━ Helpers ━━━━━━
function sum(arr, key) { return arr.reduce((s, o) => s + (o[key] || 0), 0); }
function mean(arr, key) {
    const vals = arr.filter(o => o[key] != null);
    return vals.length ? vals.reduce((s, o) => s + o[key], 0) / vals.length : 0;
}
