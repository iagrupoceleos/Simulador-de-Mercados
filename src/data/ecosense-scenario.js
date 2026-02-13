/**
 * Prometheus Engine – EcoSense Demo Scenario
 * Pre-configured scenario matching the article example.
 */
import { NormalDistribution, TruncatedNormalDistribution, BetaDistribution, TriangularDistribution, UniformDistribution } from '../engine/distributions.js';

export const ECOSENSE_SCENARIO = {
    offer: {
        name: 'EcoSense – Sensor Inteligente de Eficiencia Energética',
        basePrice: 149,
        cogs: 50,
        marketingBudget: 200000,
        qualityIndex: 0.75,
        channels: ['online', 'marketplace', 'retail'],
        allowRepeat: false,
        subscriptionPrice: 9.99,
        subscriptionCost: 1.0,
    },

    simulation: {
        initialInventory: 45000,
        iterations: 500,
        timeHorizonWeeks: 26,
        seed: 42,
    },

    population: {
        totalCustomers: 5000,
        // Uses electronics vertical segments by default
    },

    vertical: 'electronics',

    competitors: [
        {
            id: 'comp_a',
            name: 'TechGiant Corp',
            type: 'rl',
            aggressiveness: 0.7,
            financialHealth: 0.9,
            marketShare: 0.25,
            constraints: {
                minMargin: 0.25,
                maxMarketingBudget: 500000,
                maxPriceReduction: 0.25,
                riskAversion: 0.3,
            },
            beliefs: [
                {
                    id: 'comp_a_launch_similar',
                    description: 'TechGiant Corp tiene un 60% de probabilidad de lanzar un producto similar si EcoSense tiene éxito inicial',
                    probability: 0.6,
                    distribution: new TruncatedNormalDistribution(0.15, 0.05, 0.05, 0.30),
                    category: 'competition',
                },
            ],
            cogsDistribution: new TriangularDistribution(35, 45, 55),
            marketingBudgetDistribution: new UniformDistribution(200000, 500000),
            marginDistribution: new TruncatedNormalDistribution(0.30, 0.05, 0.25, 0.35),
        },
        {
            id: 'comp_b',
            name: 'GreenTech Startup',
            type: 'rule_based',
            aggressiveness: 0.5,
            financialHealth: 0.5,
            marketShare: 0.08,
            constraints: {
                minMargin: 0.15,
                maxMarketingBudget: 150000,
                maxPriceReduction: 0.20,
                riskAversion: 0.7,
            },
            beliefs: [
                {
                    id: 'comp_b_marketing_blitz',
                    description: 'GreenTech Startup puede lanzar una campaña dirigida enfatizando debilidades de EcoSense',
                    probability: 0.4,
                    distribution: new NormalDistribution(0.10, 0.03),
                    category: 'marketing',
                },
            ],
            cogsDistribution: new TriangularDistribution(40, 55, 70),
            marketingBudgetDistribution: new UniformDistribution(50000, 150000),
        },
        {
            id: 'comp_c',
            name: 'SmartHome Solutions',
            type: 'ml',
            aggressiveness: 0.6,
            financialHealth: 0.7,
            marketShare: 0.12,
            constraints: {
                minMargin: 0.20,
                maxMarketingBudget: 300000,
                maxPriceReduction: 0.22,
                riskAversion: 0.4,
            },
            beliefs: [],
            cogsDistribution: new TriangularDistribution(38, 48, 58),
            marketingBudgetDistribution: new UniformDistribution(100000, 300000),
        },
    ],

    riskEvents: [
        {
            id: 'supply_chain_disruption',
            description: 'Interrupción en la cadena de suministro por regulaciones ambientales, aumentando COGS un ~15%',
            probability: 0.10,
            impactValue: 0.15,
            category: 'supply_chain',
        },
        {
            id: 'semiconductor_shortage',
            description: 'Escasez temporal de semiconductores que retrasa entregas 2-4 semanas',
            probability: 0.08,
            impactValue: 0.10,
            category: 'supply_chain',
        },
        {
            id: 'market_trend_shift',
            description: 'Cambio en tendencia del mercado hacia soluciones integradas en grandes ecosistemas',
            probability: 0.05,
            impactValue: 0.20,
            category: 'market',
        },
    ],

    macroAssumptions: {
        gdpGrowth: new NormalDistribution(0.02, 0.01),
        consumerConfidence: new BetaDistribution(8, 3),
        energyPriceChange: new NormalDistribution(0.05, 0.10),
        inflationRate: new TruncatedNormalDistribution(0.03, 0.01, 0.01, 0.08),
    },
};
