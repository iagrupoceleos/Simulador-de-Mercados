/**
 * Prometheus Engine – JSDoc Type Interfaces (ARCH-004)
 * TypeScript-compatible JSDoc type definitions for all public APIs.
 * Import this file for IDE autocompletion and type checking.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Core Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * @typedef {object} OfferConfig
 * @property {string} offerName - Product/offer name
 * @property {string} vertical - Product vertical (sustainability, technology, etc.)
 * @property {number} basePrice - Price in MXN
 * @property {number} cogs - Cost of goods sold per unit
 * @property {number} marketingBudget - Total marketing budget
 * @property {number} qualityIndex - Quality score (0-100)
 * @property {number} [brandStrength=50] - Brand strength (0-100)
 * @property {number} [serviceLevel=70] - Service level (0-100)
 * @property {number} [innovationIndex=50] - Innovation score (0-100)
 */

/**
 * @typedef {object} PopulationConfig
 * @property {number} totalCustomers - Total addressable customers
 * @property {{ min: number, max: number }} priceRange - Customer price sensitivity range
 * @property {{ min: number, max: number }} qualityRange - Customer quality sensitivity range
 * @property {number} [loyaltyBias=0.5] - Brand loyalty bias
 */

/**
 * @typedef {object} SimulationConfig
 * @property {object} ngc - Normal Gaussian Copula configuration
 * @property {OfferConfig} offerConfig - Product offer configuration
 * @property {PopulationConfig} populationConfig - Customer population config
 * @property {number} [initialInventory=45000] - Starting inventory
 * @property {number} [iterations=1000] - Monte Carlo iterations
 * @property {number} [timeHorizonWeeks=26] - Simulation duration in weeks
 * @property {number} [seed=42] - PRNG seed for reproducibility
 */

/**
 * @typedef {object} SimulationResult
 * @property {number} totalUnitsSold
 * @property {number} revenue
 * @property {number} grossProfit
 * @property {number} netProfit
 * @property {number} roi
 * @property {number} marginPct
 * @property {number} inventoryRemaining
 * @property {number} inventoryValue
 * @property {number} unsoldPct
 * @property {number} breakEvenWeek
 * @property {number} totalMarketingSpent
 * @property {WeeklyMetric[]} weeklyMetrics
 */

/**
 * @typedef {object} WeeklyMetric
 * @property {number} week
 * @property {number} unitsSold
 * @property {number} cumulativeSold
 * @property {number} inventory
 * @property {number} revenue
 * @property {number} avgConversion
 * @property {number} competitorAttractiveness
 */

/**
 * @typedef {object} MCResults
 * @property {number} iterations
 * @property {StatSummary} sales
 * @property {StatSummary} revenue
 * @property {StatSummary} grossProfit
 * @property {StatSummary} netProfit
 * @property {StatSummary} roi
 * @property {StatSummary} margin
 * @property {StatSummary} inventoryRemaining
 * @property {StatSummary} unsoldPct
 * @property {SimulationResult[]} rawResults
 * @property {WeeklyMetric[]} weeklyAvg
 */

/**
 * @typedef {object} StatSummary
 * @property {number} mean
 * @property {number} std
 * @property {number} min
 * @property {number} max
 * @property {number} p5
 * @property {number} p25
 * @property {number} p50
 * @property {number} p75
 * @property {number} p95
 * @property {number} n
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Risk Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * @typedef {object} RiskAnalysis
 * @property {number} inventoryVaR95
 * @property {number} inventoryVaR99
 * @property {number} inventoryCVaR95
 * @property {number} inventoryCVaR99
 * @property {number} netProfitVaR95
 * @property {number} probNegativeProfit
 * @property {number} probInventoryExcess10pct
 * @property {number} probROIBelow0
 */

/**
 * @typedef {object} ProfitabilityRisk
 * @property {StatSummary} roiStats
 * @property {number} roiVaR95
 * @property {StatSummary} netProfitStats
 * @property {number} netProfitVaR95
 * @property {StatSummary|null} breakEvenStats
 * @property {number} probNoBreakEven
 * @property {number} probROIBelow0
 * @property {number} probROIAbove100
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Plugin Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * @typedef {object} VerticalPlugin
 * @property {string} id
 * @property {string} name
 * @property {string} version
 * @property {string} vertical
 * @property {object} config - default config overrides
 * @property {boolean} enabled
 * @property {Object<string, Function>} [hooks] - lifecycle hooks
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Marketing Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * @typedef {object} FunnelResult
 * @property {number} totalBudget
 * @property {number} totalPurchases
 * @property {number} costPerAcquisition
 * @property {number} overallROAS
 * @property {Object<string, number>} aggregateFunnel
 * @property {Object<string, ChannelResult>} channelResults
 */

/**
 * @typedef {object} ChannelResult
 * @property {string} label
 * @property {number} budget
 * @property {number} impressions
 * @property {Object<string, number>} funnel
 * @property {number} costPerPurchase
 * @property {number} roas
 */

// Export empty to make this a module
export { };
