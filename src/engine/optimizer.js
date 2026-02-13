/**
 * Prometheus Engine – Optimizer & Recommender
 * Generates safe stock recommendations, contingency playbooks, and inventory health KPIs.
 */
import { computeStats } from './distributions.js';
import { RiskEngine } from './risk.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Optimizer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class Optimizer {
    /**
     * Recommend optimal initial stock level.
     * Balances overstock cost vs lost-sales opportunity cost.
     */
    static recommendSafeStock(mcResults, offerCOGS, confidenceLevel = 0.99) {
        const results = mcResults.rawResults;
        if (!results || results.length === 0) return null;

        const unitsSoldAll = results.map(r => r.totalUnitsSold);
        const sorted = [...unitsSoldAll].sort((a, b) => a - b);

        // Percentile-based recommendation
        const p50 = sorted[Math.floor(sorted.length * 0.5)];
        const p75 = sorted[Math.floor(sorted.length * 0.75)];
        const p90 = sorted[Math.floor(sorted.length * 0.9)];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];

        // Optimal stock: at the confidence percentile of sales + safety buffer
        const salesAtConfidence = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * confidenceLevel) - 1)];
        const safetyBuffer = Math.ceil(salesAtConfidence * 0.05); // 5% buffer
        const recommendedStock = salesAtConfidence + safetyBuffer;

        // Cost analysis at different stock levels
        const stockScenarios = [
            { label: 'Conservador (P50)', stock: p50, confidence: 0.50 },
            { label: 'Moderado (P75)', stock: p75, confidence: 0.75 },
            { label: 'Seguro (P90)', stock: p90, confidence: 0.90 },
            { label: 'Muy Seguro (P95)', stock: p95, confidence: 0.95 },
            { label: 'Ultra Seguro (P99)', stock: p99, confidence: 0.99 },
            { label: `Recomendado (${Math.round(confidenceLevel * 100)}%)`, stock: recommendedStock, confidence: confidenceLevel },
        ];

        // Calculate expected overstock/understock for each scenario
        for (const sc of stockScenarios) {
            const overstock = unitsSoldAll.map(sold => Math.max(0, sc.stock - sold));
            const understock = unitsSoldAll.map(sold => Math.max(0, sold - sc.stock));
            sc.avgOverstock = overstock.reduce((s, v) => s + v, 0) / overstock.length;
            sc.avgUnderstock = understock.reduce((s, v) => s + v, 0) / understock.length;
            sc.overstockCost = sc.avgOverstock * offerCOGS;
            sc.lostSalesCost = sc.avgUnderstock * offerCOGS * 0.5; // opportunity cost
            sc.totalRisk = sc.overstockCost + sc.lostSalesCost;
        }

        return {
            recommended: recommendedStock,
            confidenceLevel,
            salesPercentiles: { p50, p75, p90, p95, p99 },
            scenarios: stockScenarios,
        };
    }

    /**
     * Generate contingency playbooks ("If X then Y").
     */
    static generateContingencyPlans(mcResults, offerConfig) {
        const results = mcResults.rawResults;
        if (!results || results.length === 0) return [];

        const salesStats = computeStats(results.map(r => r.totalUnitsSold));
        const marginStats = computeStats(results.map(r => r.marginPct));
        const price = offerConfig.basePrice ?? 149;

        const plans = [];

        // Plan A: Low demand
        plans.push({
            id: 'low_demand',
            severity: 'high',
            icon: '📉',
            condition: `La conversión cae por debajo de ${(salesStats.p10 / 26 / 5000 * 100).toFixed(1)}% y las ventas semanales < ${Math.round(salesStats.p10 / 26)} unidades en la semana 4`,
            actions: [
                `Activar bundle con producto complementario con 15% de descuento durante 2 semanas`,
                `Lanzar campaña de remarketing agresiva a no-conversores`,
                `Implementar mensaje de ahorro/beneficio garantizado en landing page`,
                `Explorar extensión de canales de distribución (nuevos marketplaces)`,
            ],
            expectedImpact: `Recuperación estimada: +${Math.round(salesStats.p10 * 0.3)} unidades vendidas, reducción de inventario muerto en ~30%`,
            trigger: { metric: 'weeklyConversion', operator: '<', threshold: 0.008 },
        });

        // Plan B: Aggressive competitor
        plans.push({
            id: 'aggressive_competitor',
            severity: 'high',
            icon: '⚔️',
            condition: `Un competidor principal lanza una promoción ≥20% de descuento o un producto similar en las primeras 8 semanas`,
            actions: [
                `Reducir precio de hardware a €${Math.round(price * 0.87)} inmediatamente`,
                `Ofrecer el primer mes de suscripción gratis (si aplica)`,
                `Lanzar campaña comparativa enfatizando diferenciadores únicos`,
                `Alertar al equipo de marketing para reposicionamiento urgente`,
            ],
            expectedImpact: `Mantener >70% de la cuota de mercado proyectada y limitar pérdida de margen a <5%`,
            trigger: { metric: 'competitorPriceReduction', operator: '>', threshold: 0.2 },
        });

        // Plan C: Supply chain disruption
        plans.push({
            id: 'supply_chain',
            severity: 'medium',
            icon: '🚚',
            condition: `El COGS aumenta >15% debido a problemas en la cadena de suministro o regulaciones`,
            actions: [
                `Activar comunicación de "Impacto Ecológico Mejorado" para justificar precio`,
                `Contactar proveedores alternativos pre-validados (A, B, C)`,
                `Evaluar reducción temporal de pedidos futuros en un 20%`,
                `Considerar precio premium justificado con mejoras de calidad percibida`,
            ],
            expectedImpact: `Mantener margen bruto por encima del ${Math.round(marginStats.p25)}% mediante control de costes y comunicación`,
            trigger: { metric: 'cogsIncrease', operator: '>', threshold: 0.15 },
        });

        // Plan D: Excess inventory at 50% timeline
        plans.push({
            id: 'excess_inventory_mid',
            severity: 'medium',
            icon: '📦',
            condition: `En la semana ${Math.round(26 / 2)}, el inventario restante supera el 60% del stock inicial`,
            actions: [
                `Implementar pricing dinámico con reducción gradual del 5% semanal`,
                `Crear bundles de liquidación con artículos de alta rotación`,
                `Activar campaña flash sale de 48h con 25% de descuento`,
                `Considerar venta B2B a distribuidores a margen reducido`,
            ],
            expectedImpact: `Liquidar ≥80% del inventario restante con margen bruto mínimo de 10%`,
            trigger: { metric: 'inventoryPctRemaining', operator: '>', threshold: 60 },
        });

        // Plan E: Unexpectedly high demand
        plans.push({
            id: 'high_demand',
            severity: 'low',
            icon: '🚀',
            condition: `Las ventas superan el P90 (${Math.round(salesStats.p90)} unidades) antes de la semana ${Math.round(26 * 0.6)}`,
            actions: [
                `Activar reorden de emergencia con proveedores primarios`,
                `Evaluar incremento de precio del 5-8% para optimizar margen`,
                `Asignar presupuesto extra de marketing para maximizar momentum`,
                `Considerar lanzamiento de versión premium a precio superior`,
            ],
            expectedImpact: `Capturar +${Math.round(salesStats.p90 * 0.2)} ventas adicionales optimizando la oportunidad de mercado`,
            trigger: { metric: 'cumulativeSales', operator: '>', threshold: salesStats.p90 },
        });

        return plans;
    }

    /**
     * Calculate Inventory Health KPIs.
     */
    static computeInventoryHealthKPIs(mcResults, offerCOGS, initialInventory) {
        const results = mcResults.rawResults;
        if (!results) return null;

        const stats = computeStats(results.map(r => r.totalUnitsSold));
        const invStats = computeStats(results.map(r => r.inventoryRemaining));

        // Inventory rotation (turns) = units sold / initial inventory
        const rotationOptimistic = stats.p90 / initialInventory;
        const rotationPessimistic = stats.p10 / initialInventory;
        const rotationAvg = stats.mean / initialInventory;

        // Days to sell out (assuming 7 days per week time step)
        const weeksToSellP50 = initialInventory / Math.max(1, stats.p50 / 26);
        const weeksToSellP10 = initialInventory / Math.max(1, stats.p10 / 26);
        const daysToSellP50 = weeksToSellP50 * 7;
        const daysToSellP10 = weeksToSellP10 * 7;

        // Capital immobilized
        const capitalImmobilized = initialInventory * offerCOGS;
        const avgCapitalRecovered = stats.mean * offerCOGS;
        const capitalAtRiskPct = Math.max(0, (1 - avgCapitalRecovered / capitalImmobilized) * 100);

        // Profitability per unit
        const profitPerUnit = results.map(r => r.totalUnitsSold > 0 ? r.netProfit / r.totalUnitsSold : 0);
        const profitPerUnitStats = computeStats(profitPerUnit);

        return {
            rotation: { optimistic: rotationOptimistic, pessimistic: rotationPessimistic, average: rotationAvg },
            daysToSellOut: { p50: daysToSellP50, p10: daysToSellP10 },
            capitalImmobilized,
            capitalAtRiskPct,
            profitPerUnit: profitPerUnitStats,
            avgUnsoldUnits: invStats.mean,
            maxUnsoldUnits: invStats.max,
            inventoryTurnoverRate: rotationAvg,
        };
    }
}
