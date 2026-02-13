/**
 * Prometheus Engine – Executive Summary Auto-Generation (STR-002)
 * Generates a narrative executive summary from simulation results.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Summary Generator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Generate a structured executive summary from Monte Carlo results.
 * @param {object} mcResults - aggregated MC results
 * @param {object} config - simulation config
 * @param {object} [riskResults] - risk analysis results
 * @returns {object} structured summary
 */
export function generateExecutiveSummary(mcResults, config, riskResults = null) {
    if (!mcResults) return null;

    const profitability = assessProfitability(mcResults);
    const risk = assessRisk(mcResults, riskResults);
    const inventory = assessInventory(mcResults);
    const recommendation = generateRecommendation(profitability, risk, inventory);

    return {
        title: `Resumen Ejecutivo – ${config.offerConfig?.vertical || 'Producto'}`,
        date: new Date().toLocaleDateString('es-MX'),
        iterations: mcResults.iterations,
        horizon: `${config.timeHorizonWeeks || 26} semanas`,
        sections: [
            profitability,
            risk,
            inventory,
            recommendation,
        ],
        narrative: buildNarrative(profitability, risk, inventory, config),
    };
}

function assessProfitability(mc) {
    const profit = mc.netProfit?.mean ?? 0;
    const roi = mc.roi?.mean ?? 0;
    const margin = mc.margin?.mean ?? 0;
    const revenue = mc.revenue?.mean ?? 0;

    let verdict;
    if (roi > 50 && margin > 20) verdict = 'excelente';
    else if (roi > 20 && margin > 10) verdict = 'buena';
    else if (roi > 0) verdict = 'moderada';
    else verdict = 'negativa';

    return {
        title: '💰 Rentabilidad',
        verdict,
        metrics: { profit, roi, margin, revenue },
        insight: roi > 20
            ? `ROI de ${roi.toFixed(1)}% con margen de ${margin.toFixed(1)}% indica viabilidad comercial sólida.`
            : `ROI de ${roi.toFixed(1)}% sugiere ${roi > 0 ? 'rentabilidad marginal — optimizar costos' : 'pérdidas — revisar modelo de negocio'}.`,
    };
}

function assessRisk(mc, riskResults) {
    const unsoldPct = mc.unsoldPct?.mean ?? 0;
    const profitP5 = mc.netProfit?.p5 ?? 0;
    const probLoss = riskResults?.probROIBelow0 ?? (mc.roi?.p5 < 0 ? 0.3 : 0.05);

    let level;
    if (probLoss > 0.3 || unsoldPct > 40) level = 'alto';
    else if (probLoss > 0.1 || unsoldPct > 20) level = 'medio';
    else level = 'bajo';

    return {
        title: '⚠️ Riesgo',
        level,
        metrics: { unsoldPct, profitP5, probLoss },
        insight: level === 'bajo'
            ? `Perfil de riesgo controlado. Probabilidad de pérdida: ${(probLoss * 100).toFixed(0)}%.`
            : `Riesgo ${level}: ${(probLoss * 100).toFixed(0)}% probabilidad de pérdida. Inventario sin vender: ${unsoldPct.toFixed(0)}%.`,
    };
}

function assessInventory(mc) {
    const unsold = mc.unsoldPct?.mean ?? 0;
    const remaining = mc.inventoryRemaining?.mean ?? 0;
    const sales = mc.sales?.mean ?? 0;

    let status;
    if (unsold < 10) status = 'óptimo';
    else if (unsold < 25) status = 'aceptable';
    else if (unsold < 50) status = 'exceso';
    else status = 'crítico';

    return {
        title: '📦 Inventario',
        status,
        metrics: { unsold, remaining, sales },
        insight: status === 'óptimo'
            ? `Gestión de inventario eficiente: solo ${unsold.toFixed(0)}% sin vender.`
            : `${unsold.toFixed(0)}% inventario sin vender. ${status === 'crítico' ? 'Considerar reducir pedido inicial.' : 'Evaluar promociones para liquidar.'}`,
    };
}

function generateRecommendation(profitability, risk, inventory) {
    const actions = [];

    if (profitability.verdict === 'negativa') {
        actions.push('🔴 Reconsiderar precio base o estructura de costos');
    }
    if (risk.level === 'alto') {
        actions.push('🔴 Reducir exposición: menor inventario inicial o diversificar canales');
    }
    if (inventory.status === 'exceso' || inventory.status === 'crítico') {
        actions.push('🟡 Implementar estrategia de markdown progresivo');
    }
    if (profitability.verdict === 'excelente' && risk.level === 'bajo') {
        actions.push('🟢 Escenario viable — considerar escalar producción');
    }
    if (risk.level === 'medio') {
        actions.push('🟡 Implementar cobertura de riesgo (seguros, contratos flexibles)');
    }

    if (actions.length === 0) {
        actions.push('🟢 Métricas dentro de rangos aceptables. Proceder con monitoreo continuo.');
    }

    return {
        title: '🎯 Recomendaciones',
        actions,
    };
}

function buildNarrative(profitability, risk, inventory, config) {
    const p = profitability.metrics;
    const vertical = config.offerConfig?.vertical || 'el producto';

    return `Para ${vertical}, la simulación Monte Carlo de ${config.iterations || 1000} iteraciones ` +
        `proyecta un beneficio neto medio de $${p.profit.toLocaleString('es-MX', { maximumFractionDigits: 0 })} ` +
        `con ROI de ${p.roi.toFixed(1)}% y margen de ${p.margin.toFixed(1)}%. ` +
        `El nivel de riesgo es ${risk.level} con ${(risk.metrics.probLoss * 100).toFixed(0)}% probabilidad de pérdida. ` +
        `La gestión de inventario muestra estado ${inventory.status} con ${inventory.metrics.unsold.toFixed(0)}% sin vender.`;
}
