/**
 * Prometheus Engine – SWOT Analysis Generator (STR-006)
 * Auto-generates SWOT from simulation results and market context.
 */

/**
 * Generate a SWOT analysis from simulation results.
 * @param {object} results - MC simulation results
 * @param {object} [context] - additional market context
 * @returns {object} SWOT analysis
 */
export function generateSWOT(results, context = {}) {
    const strengths = [];
    const weaknesses = [];
    const opportunities = [];
    const threats = [];

    const profit = results?.profit?.mean ?? results?.profit ?? 0;
    const revenue = results?.revenue?.mean ?? results?.revenue ?? 0;
    const share = results?.marketShare?.mean ?? results?.marketShare ?? 0;
    const fillRate = results?.fillRate ?? context.fillRate ?? 0.9;
    const cvProfit = results?.profit?.cv ?? 0;

    // ━━━ STRENGTHS ━━━
    if (profit > 0) strengths.push({ text: `Operación rentable ($${fmt(profit)} beneficio promedio)`, impact: 'alto' });
    if (share > 0.25) strengths.push({ text: `Cuota de mercado sólida (${(share * 100).toFixed(1)}%)`, impact: 'alto' });
    if (fillRate > 0.95) strengths.push({ text: `Excelente nivel de servicio (${(fillRate * 100).toFixed(1)}% fill rate)`, impact: 'medio' });
    if (cvProfit < 0.3) strengths.push({ text: `Baja variabilidad en beneficios (CV=${(cvProfit * 100).toFixed(0)}%)`, impact: 'medio' });
    if (revenue > 100000) strengths.push({ text: `Alto volumen de ingresos ($${fmt(revenue)})`, impact: 'alto' });
    if (context.brandStrength > 0.7) strengths.push({ text: `Marca con fuerte reconocimiento`, impact: 'alto' });

    // ━━━ WEAKNESSES ━━━
    if (profit < 0) weaknesses.push({ text: `Operación no rentable ($${fmt(profit)})`, impact: 'crítico' });
    if (share < 0.1) weaknesses.push({ text: `Baja cuota de mercado (${(share * 100).toFixed(1)}%)`, impact: 'alto' });
    if (fillRate < 0.85) weaknesses.push({ text: `Frecuentes roturas de stock (fill rate ${(fillRate * 100).toFixed(0)}%)`, impact: 'alto' });
    if (cvProfit > 0.6) weaknesses.push({ text: `Alta volatilidad en resultados (CV=${(cvProfit * 100).toFixed(0)}%)`, impact: 'medio' });
    if (context.dependencyRisk) weaknesses.push({ text: 'Alta dependencia de un proveedor único', impact: 'medio' });

    // ━━━ OPPORTUNITIES ━━━
    if (context.marketGrowth > 0.05) opportunities.push({ text: `Mercado en crecimiento (${(context.marketGrowth * 100).toFixed(0)}% anual)`, impact: 'alto' });
    if (context.newChannels) opportunities.push({ text: `Expansión a nuevos canales de venta`, impact: 'medio' });
    if (context.competitorWeakness) opportunities.push({ text: `Debilidad de competidores detectada`, impact: 'alto' });
    if (share < 0.4) opportunities.push({ text: `Espacio para crecimiento de cuota de mercado`, impact: 'medio' });
    if (context.technologyAdoption) opportunities.push({ text: `Adopción de nuevas tecnologías (IA, automatización)`, impact: 'medio' });
    opportunities.push({ text: 'Optimización de precios mediante modelos predictivos', impact: 'medio' });

    // ━━━ THREATS ━━━
    if (context.competitorCount > 5) threats.push({ text: `Alta competencia (${context.competitorCount}+ competidores)`, impact: 'alto' });
    if (context.regulatoryRisk) threats.push({ text: 'Riesgo de cambios regulatorios', impact: 'medio' });
    if (context.priceWarRisk) threats.push({ text: 'Posible guerra de precios en el sector', impact: 'alto' });
    threats.push({ text: 'Disrupciones en la cadena de suministro', impact: 'medio' });
    if (context.marketDecline) threats.push({ text: 'Contracción del mercado objetivo', impact: 'alto' });

    return {
        strengths,
        weaknesses,
        opportunities,
        threats,
        summary: {
            totalStrengths: strengths.length,
            totalWeaknesses: weaknesses.length,
            totalOpportunities: opportunities.length,
            totalThreats: threats.length,
            overallPosition: strengths.length > weaknesses.length ? 'favorable' : 'desafiante',
            strategicRecommendation: getRecommendation(strengths, weaknesses, opportunities, threats),
        },
    };
}

function getRecommendation(s, w, o, t) {
    const sCount = s.filter(x => x.impact === 'alto').length;
    const wCount = w.filter(x => x.impact === 'alto' || x.impact === 'crítico').length;
    const oCount = o.filter(x => x.impact === 'alto').length;

    if (sCount >= 2 && oCount >= 1) return 'Estrategia SO: Usar fortalezas para aprovechar oportunidades (crecimiento agresivo)';
    if (wCount >= 2 && oCount >= 1) return 'Estrategia WO: Superar debilidades aprovechando oportunidades (transformación)';
    if (sCount >= 2 && t.length >= 2) return 'Estrategia ST: Usar fortalezas para mitigar amenazas (defensiva activa)';
    return 'Estrategia WT: Minimizar debilidades y evitar amenazas (supervivencia/reestructuración)';
}

/**
 * Render SWOT as HTML.
 * @param {HTMLElement} container
 * @param {object} swot - from generateSWOT()
 */
export function renderSWOT(container, swot) {
    if (!container || !swot) return;

    const quadrant = (title, icon, items, bgColor) => `
        <div style="padding:16px; border-radius:10px; background:${bgColor};">
            <h4 style="margin:0 0 10px; color:#fff; font-size:14px;">${icon} ${title}</h4>
            ${items.length > 0
            ? `<ul style="margin:0; padding-left:16px; font-size:13px; color:#e0e0ff;">
                    ${items.map(i => `<li style="margin-bottom:4px;">${i.text} <span style="font-size:10px; opacity:0.7;">[${i.impact}]</span></li>`).join('')}
                  </ul>`
            : '<p style="font-size:13px; color:#aaa;">Sin elementos detectados</p>'}
        </div>
    `;

    container.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            ${quadrant('Fortalezas', '💪', swot.strengths, '#10b98122')}
            ${quadrant('Debilidades', '⚠️', swot.weaknesses, '#ef444422')}
            ${quadrant('Oportunidades', '🚀', swot.opportunities, '#06b6d422')}
            ${quadrant('Amenazas', '🛡️', swot.threats, '#f59e0b22')}
        </div>
        <div style="margin-top:12px; padding:12px; border-radius:8px; background:#1a1a2e; font-size:13px; color:var(--text-secondary);">
            <strong style="color:var(--text-primary);">Recomendación:</strong> ${swot.summary.strategicRecommendation}
        </div>
    `;
}

function fmt(n) {
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toFixed(0);
}
