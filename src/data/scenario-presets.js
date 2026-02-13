/**
 * Prometheus – Scenario Presets Library (INT-004)
 * Pre-built scenario configurations for different industries/verticals.
 */

export const SCENARIO_PRESETS = {
    // ━━━ E-Commerce ━━━
    eco_basic: {
        name: 'E-Commerce Básico',
        icon: '🛒',
        vertical: 'eco',
        description: 'Tienda online típica con 3 competidores.',
        config: {
            iterations: 500, weeks: 26,
            basePrice: 45, cogs: 22, marketingBudgetWeekly: 2000,
            marketSize: 50000, competitorCount: 3,
            elasticity: -1.8, initialInventory: 5000,
            avgWeeklyDemand: 400, demandStdDev: 80,
        },
    },
    eco_premium: {
        name: 'E-Commerce Premium',
        icon: '💎',
        vertical: 'eco',
        description: 'Marca premium con margen alto y baja elasticidad.',
        config: {
            iterations: 500, weeks: 26,
            basePrice: 120, cogs: 45, marketingBudgetWeekly: 5000,
            marketSize: 20000, competitorCount: 2,
            elasticity: -1.2, initialInventory: 2000,
            avgWeeklyDemand: 150, demandStdDev: 30,
        },
    },

    // ━━━ Tech / SaaS ━━━
    tech_saas: {
        name: 'SaaS B2B',
        icon: '💻',
        vertical: 'tech',
        description: 'Software as a Service con modelo de suscripción.',
        config: {
            iterations: 500, weeks: 52,
            basePrice: 99, cogs: 10, marketingBudgetWeekly: 8000,
            marketSize: 15000, competitorCount: 5,
            elasticity: -0.8, initialInventory: 999999,
            avgWeeklyDemand: 60, demandStdDev: 15,
        },
    },

    // ━━━ Fashion ━━━
    fashion_fast: {
        name: 'Fast Fashion',
        icon: '👗',
        vertical: 'fashion',
        description: 'Moda rápida con alta rotación y estacionalidad fuerte.',
        config: {
            iterations: 500, weeks: 26,
            basePrice: 35, cogs: 12, marketingBudgetWeekly: 3000,
            marketSize: 100000, competitorCount: 8,
            elasticity: -2.5, initialInventory: 10000,
            avgWeeklyDemand: 800, demandStdDev: 250,
        },
    },

    // ━━━ Food & Beverage ━━━
    food_delivery: {
        name: 'Delivery de Alimentos',
        icon: '🍕',
        vertical: 'food',
        description: 'Servicio de entrega con márgenes bajos y alta frecuencia.',
        config: {
            iterations: 500, weeks: 26,
            basePrice: 15, cogs: 10, marketingBudgetWeekly: 1500,
            marketSize: 200000, competitorCount: 6,
            elasticity: -3.0, initialInventory: 999999,
            avgWeeklyDemand: 2000, demandStdDev: 500,
        },
    },

    // ━━━ Health ━━━
    health_supplement: {
        name: 'Suplementos de Salud',
        icon: '💊',
        vertical: 'health',
        description: 'Marca de suplementos DTC con suscripción recurrente.',
        config: {
            iterations: 500, weeks: 52,
            basePrice: 55, cogs: 15, marketingBudgetWeekly: 4000,
            marketSize: 30000, competitorCount: 4,
            elasticity: -1.3, initialInventory: 8000,
            avgWeeklyDemand: 300, demandStdDev: 60,
        },
    },

    // ━━━ Stress Test ━━━
    stress_high_competition: {
        name: 'Estrés: Alta Competencia',
        icon: '⚔️',
        vertical: 'stress',
        description: 'Escenario extremo con 10+ competidores y guerra de precios.',
        config: {
            iterations: 1000, weeks: 52,
            basePrice: 30, cogs: 22, marketingBudgetWeekly: 10000,
            marketSize: 500000, competitorCount: 10,
            elasticity: -3.5, initialInventory: 20000,
            avgWeeklyDemand: 3000, demandStdDev: 1000,
        },
    },
    stress_low_margin: {
        name: 'Estrés: Margen Mínimo',
        icon: '📉',
        vertical: 'stress',
        description: 'Escenario con COGS casi igual al precio. ¿Puedes ser rentable?',
        config: {
            iterations: 500, weeks: 26,
            basePrice: 50, cogs: 45, marketingBudgetWeekly: 500,
            marketSize: 30000, competitorCount: 3,
            elasticity: -2.0, initialInventory: 3000,
            avgWeeklyDemand: 200, demandStdDev: 50,
        },
    },
};

/**
 * Get presets grouped by vertical.
 */
export function getPresetsByVertical() {
    const grouped = {};
    for (const [key, preset] of Object.entries(SCENARIO_PRESETS)) {
        const v = preset.vertical || 'other';
        if (!grouped[v]) grouped[v] = [];
        grouped[v].push({ key, ...preset });
    }
    return grouped;
}

/**
 * Get a specific preset by key.
 * @param {string} key
 * @returns {object|null}
 */
export function getPreset(key) {
    return SCENARIO_PRESETS[key] || null;
}

/**
 * Get all preset keys.
 */
export function listPresets() {
    return Object.entries(SCENARIO_PRESETS).map(([key, p]) => ({
        key, name: p.name, icon: p.icon, vertical: p.vertical, description: p.description,
    }));
}
