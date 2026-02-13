/**
 * Prometheus Engine – Market Ecosystem Model (SIM-010)
 * Models suppliers, distributors, and retailers as interconnected agents.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Ecosystem Agents
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const AGENT_TYPES = {
    SUPPLIER: 'supplier',
    DISTRIBUTOR: 'distributor',
    RETAILER: 'retailer',
};

export function createSupplier(name, config = {}) {
    return {
        type: AGENT_TYPES.SUPPLIER,
        name,
        capacity: config.capacity || 10000,
        unitCost: config.unitCost || 30,
        reliability: config.reliability || 0.95,
        leadTimeWeeks: config.leadTimeWeeks || 3,
        currentLoad: 0,
    };
}

export function createDistributor(name, config = {}) {
    return {
        type: AGENT_TYPES.DISTRIBUTOR,
        name,
        warehouseCapacity: config.warehouseCapacity || 5000,
        handlingCostPerUnit: config.handlingCostPerUnit || 5,
        deliverySpeed: config.deliverySpeed || 0.9,
        currentInventory: config.initialInventory || 1000,
        markup: config.markup || 0.15,
    };
}

export function createRetailer(name, config = {}) {
    return {
        type: AGENT_TYPES.RETAILER,
        name,
        avgCustomerDemand: config.avgCustomerDemand || 200,
        priceMarkup: config.priceMarkup || 0.40,
        marketReach: config.marketReach || 0.30,
        customerSatisfaction: 1.0,
        revenue: 0,
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Ecosystem Simulation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Simulate market ecosystem over time.
 * @param {object} config
 * @param {object[]} config.suppliers
 * @param {object[]} config.distributors
 * @param {object[]} config.retailers
 * @param {number} [config.weeks=26]
 * @param {number} [config.totalMarketDemand=5000] - weekly
 * @returns {object}
 */
export function simulateEcosystem(config) {
    const {
        suppliers,
        distributors,
        retailers,
        weeks = 26,
        totalMarketDemand = 5000,
    } = config;

    const log = [];
    let totalSystemRevenue = 0;
    let totalSupplierRevenue = 0;

    for (let w = 1; w <= weeks; w++) {
        const seasonal = 1 + 0.2 * Math.sin(w * Math.PI / 13);
        const weekDemand = Math.round(totalMarketDemand * seasonal);

        // Retailers determine demand
        const retailerDemands = retailers.map(r => ({
            retailer: r,
            demand: Math.round(weekDemand * r.marketReach),
        }));

        // Distributors fulfill retailer demand
        const distributorActivity = distributors.map(d => {
            const totalRequested = retailerDemands.reduce((s, rd) => s + rd.demand, 0) / distributors.length;
            const fulfilled = Math.min(totalRequested, d.currentInventory);
            d.currentInventory -= fulfilled;

            const revenue = fulfilled * (d.handlingCostPerUnit + d.handlingCostPerUnit * d.markup);

            return {
                distributor: d.name,
                requested: totalRequested,
                fulfilled,
                inventory: d.currentInventory,
                revenue: Math.round(revenue),
            };
        });

        // Suppliers replenish distributors
        const supplierActivity = suppliers.map(s => {
            const orderedPerDist = distributors.map(d => {
                const shortfall = d.warehouseCapacity - d.currentInventory;
                if (shortfall > 200) {
                    const canSupply = Math.round(Math.min(shortfall, s.capacity * s.reliability));
                    d.currentInventory += canSupply;
                    s.currentLoad += canSupply;
                    return canSupply;
                }
                return 0;
            });

            const totalProduced = orderedPerDist.reduce((a, b) => a + b, 0);
            const revenue = totalProduced * s.unitCost;
            totalSupplierRevenue += revenue;

            return {
                supplier: s.name,
                produced: totalProduced,
                loadPct: Math.round(s.currentLoad / s.capacity * 100),
                revenue: Math.round(revenue),
            };
        });

        // Calculate retailer revenue
        const retailerResults = retailerDemands.map(rd => {
            const availableForRetailer = distributorActivity.reduce((s, da) => s + da.fulfilled, 0) / retailers.length;
            const sales = Math.min(rd.demand, availableForRetailer);
            const price = suppliers[0].unitCost * (1 + distributors[0].markup) * (1 + rd.retailer.priceMarkup);
            const revenue = Math.round(sales * price);
            totalSystemRevenue += revenue;

            rd.retailer.customerSatisfaction = rd.demand > 0
                ? Math.min(1, 0.6 * rd.retailer.customerSatisfaction + 0.4 * (sales / rd.demand))
                : rd.retailer.customerSatisfaction;
            rd.retailer.revenue += revenue;

            return {
                retailer: rd.retailer.name,
                demand: rd.demand,
                sales: Math.round(sales),
                revenue,
                satisfaction: Math.round(rd.retailer.customerSatisfaction * 100),
            };
        });

        log.push({ week: w, retailers: retailerResults, distributors: distributorActivity, suppliers: supplierActivity });
    }

    return {
        totalSystemRevenue: Math.round(totalSystemRevenue),
        totalSupplierRevenue: Math.round(totalSupplierRevenue),
        weeks,
        log,
        agents: {
            suppliers: suppliers.map(s => ({ name: s.name, finalLoad: s.currentLoad })),
            distributors: distributors.map(d => ({ name: d.name, finalInventory: d.currentInventory })),
            retailers: retailers.map(r => ({ name: r.name, totalRevenue: Math.round(r.revenue), satisfaction: Math.round(r.customerSatisfaction * 100) })),
        },
    };
}
