/**
 * Prometheus UI – Results Dashboard with full financial KPIs, risk metrics, and contingency playbooks
 */
import {
    renderSalesProjection,
    renderHistogram,
    renderInventoryTimeline,
    renderRiskScatter,
    renderStockScenarios,
    destroyAllCharts,
} from '../charts.js';

export class ResultsView {
    constructor(state) {
        this.state = state;
    }

    render(container) {
        const r = this.state.simulationResults;
        if (!r) {
            container.innerHTML = `
        <div class="anim-fade-in-up">
          <div class="empty-state">
            <div class="empty-state__icon">📊</div>
            <div class="empty-state__title">Sin Resultados de Simulación</div>
            <div class="empty-state__desc">Ejecuta una simulación adversaria para ver las proyecciones financieras, métricas de riesgo VaR/CVaR, y planes de contingencia prescriptivos.</div>
          </div>
        </div>
      `;
            return;
        }

        const mc = r.monteCarlo;
        const risk = r.inventoryRisk;
        const profitRisk = r.profitabilityRisk;
        const safeStock = r.safeStock;
        const kpis = r.inventoryKPIs;
        const contingency = r.contingencyPlans;

        const fmt = (n, d = 0) => n != null ? Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
        const fmtPct = (n) => n != null ? `${n.toFixed(1)}%` : '—';
        const fmtCur = (n) => n != null ? `€${fmt(n)}` : '—';

        destroyAllCharts();

        container.innerHTML = `
      <div class="anim-fade-in-up">
        <div class="section-header" style="margin-bottom: var(--space-6);">
          <div>
            <h1 class="section-header__title">📊 Dashboard de Resultados – Inventario Cero</h1>
            <p class="section-header__subtitle">${fmt(mc.iterations)} simulaciones Monte Carlo ejecutadas | Horizonte: ${r.config?.timeHorizonWeeks ?? 26} semanas</p>
          </div>
          <div class="flex gap-3">
            <span class="badge badge--emerald">✓ Completado</span>
          </div>
        </div>

        <!-- ═══ KPI CARDS ═══ -->
        <div class="grid grid--4 stagger" style="margin-bottom: var(--space-8);">
          <div class="kpi-card anim-fade-in-up">
            <div class="kpi-card__label">Ventas Proyectadas (P50)</div>
            <div class="kpi-card__value">${fmt(mc.sales.p50)}</div>
            <div class="kpi-card__sub">P10: ${fmt(mc.sales.p10)} · P90: ${fmt(mc.sales.p90)} uds</div>
          </div>
          <div class="kpi-card anim-fade-in-up">
            <div class="kpi-card__label">Ingreso Total (P50)</div>
            <div class="kpi-card__value">${fmtCur(mc.revenue.p50)}</div>
            <div class="kpi-card__sub">P10: ${fmtCur(mc.revenue.p10)} · P90: ${fmtCur(mc.revenue.p90)}</div>
          </div>
          <div class="kpi-card anim-fade-in-up">
            <div class="kpi-card__label">ROI Medio</div>
            <div class="kpi-card__value" style="color: ${mc.roi.mean > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">${fmtPct(mc.roi.mean)}</div>
            <div class="kpi-card__sub">VaR 95%: ${fmtPct(profitRisk?.roiVaR95)}</div>
          </div>
          <div class="kpi-card anim-fade-in-up">
            <div class="kpi-card__label">Margen Bruto Medio</div>
            <div class="kpi-card__value" style="color: ${mc.margin.mean > 20 ? 'var(--accent-emerald)' : 'var(--accent-amber)'};">${fmtPct(mc.margin.mean)}</div>
            <div class="kpi-card__sub">VaR: ${fmtPct(risk?.marginVaR95)} · Mín: ${fmtPct(risk?.marginMin)}</div>
          </div>
        </div>

        <!-- ═══ RISK METRICS ═══ -->
        <div class="section-header" style="margin-bottom: var(--space-4);">
          <h2 class="section-header__title" style="font-size: var(--text-lg);">🛡️ Cuantificación de Riesgo VaR/CVaR</h2>
        </div>
        <div class="grid grid--4 stagger" style="margin-bottom: var(--space-8);">
          <div class="kpi-card anim-fade-in-up" style="border-left: 3px solid var(--accent-rose);">
            <div class="kpi-card__label">VaR Inventario (95%)</div>
            <div class="kpi-card__value" style="color:var(--accent-rose);">${fmtCur(risk?.inventoryVaR95)}</div>
            <div class="kpi-card__sub">Pérdida máxima al 95% de confianza</div>
          </div>
          <div class="kpi-card anim-fade-in-up" style="border-left: 3px solid var(--accent-rose);">
            <div class="kpi-card__label">CVaR Inventario (99%)</div>
            <div class="kpi-card__value" style="color:var(--accent-rose);">${fmtCur(risk?.inventoryCVaR99)}</div>
            <div class="kpi-card__sub">Pérdida esperada en el peor 1%</div>
          </div>
          <div class="kpi-card anim-fade-in-up" style="border-left: 3px solid var(--accent-amber);">
            <div class="kpi-card__label">P(Inventario >10% sin vender)</div>
            <div class="kpi-card__value" style="color:var(--accent-amber);">${fmtPct((risk?.probInventoryExcess10pct ?? 0) * 100)}</div>
            <div class="kpi-card__sub">Probabilidad de exceso significativo</div>
          </div>
          <div class="kpi-card anim-fade-in-up" style="border-left: 3px solid var(--accent-emerald);">
            <div class="kpi-card__label">P(Beneficio Neto > 0)</div>
            <div class="kpi-card__value" style="color:var(--accent-emerald);">${fmtPct((1 - (profitRisk?.probROIBelow0 ?? 0)) * 100)}</div>
            <div class="kpi-card__sub">Confianza en rentabilidad</div>
          </div>
        </div>

        <!-- ═══ CHARTS ROW 1 ═══ -->
        <div class="grid grid--2" style="margin-bottom: var(--space-8);">
          <div class="chart-container">
            <div class="chart-container__header">
              <div>
                <div class="chart-container__title">Proyección de Ventas Acumuladas</div>
                <div class="chart-container__subtitle">P10 / P50 / P90 por semana</div>
              </div>
            </div>
            <div class="chart-canvas-wrap"><canvas id="chart-sales-projection"></canvas></div>
          </div>
          <div class="chart-container">
            <div class="chart-container__header">
              <div>
                <div class="chart-container__title">Inventario & Ventas Semanales</div>
                <div class="chart-container__subtitle">Evolución del stock y velocidad de venta</div>
              </div>
            </div>
            <div class="chart-canvas-wrap"><canvas id="chart-inventory-timeline"></canvas></div>
          </div>
        </div>

        <!-- ═══ CHARTS ROW 2 ═══ -->
        <div class="grid grid--2" style="margin-bottom: var(--space-8);">
          <div class="chart-container">
            <div class="chart-container__header">
              <div>
                <div class="chart-container__title">Distribución de Unidades Vendidas</div>
                <div class="chart-container__subtitle">Histograma de N=${fmt(mc.iterations)} simulaciones</div>
              </div>
            </div>
            <div class="chart-canvas-wrap"><canvas id="chart-sales-hist"></canvas></div>
          </div>
          <div class="chart-container">
            <div class="chart-container__header">
              <div>
                <div class="chart-container__title">Mapa de Riesgo: Margen vs Inv. No Vendido</div>
                <div class="chart-container__subtitle">Cada punto = un escenario simulado</div>
              </div>
            </div>
            <div class="chart-canvas-wrap"><canvas id="chart-risk-scatter"></canvas></div>
          </div>
        </div>

        <!-- ═══ SAFE STOCK RECOMMENDATION ═══ -->
        <div class="section-header" style="margin-bottom: var(--space-4);">
          <h2 class="section-header__title" style="font-size: var(--text-lg);">📦 Recomendación de Stock Seguro</h2>
        </div>
        ${safeStock ? `
          <div class="grid grid--2" style="margin-bottom: var(--space-8);">
            <div class="glass-card anim-pulse-glow" style="text-align:center;">
              <div class="kpi-card__label">Stock Inicial Recomendado</div>
              <div class="kpi-card__value" style="font-size:var(--text-3xl); color:var(--accent-cyan);">${fmt(safeStock.recommended)}</div>
              <div class="kpi-card__sub" style="margin-top:var(--space-2);">
                ${fmtPct(safeStock.confidenceLevel * 100)} de confianza de no tener inventario invendible significativo
              </div>
              <div style="margin-top:var(--space-4); display:flex; gap:var(--space-3); justify-content:center; flex-wrap:wrap;">
                <span class="badge badge--cyan">P50: ${fmt(safeStock.salesPercentiles.p50)}</span>
                <span class="badge badge--violet">P75: ${fmt(safeStock.salesPercentiles.p75)}</span>
                <span class="badge badge--amber">P90: ${fmt(safeStock.salesPercentiles.p90)}</span>
                <span class="badge badge--rose">P99: ${fmt(safeStock.salesPercentiles.p99)}</span>
              </div>
            </div>
            <div class="chart-container">
              <div class="chart-container__header">
                <div>
                  <div class="chart-container__title">Coste por Escenario de Stock</div>
                  <div class="chart-container__subtitle">Sobrestock vs Ventas Perdidas</div>
                </div>
              </div>
              <div class="chart-canvas-wrap"><canvas id="chart-stock-scenarios"></canvas></div>
            </div>
          </div>
        ` : ''}

        <!-- ═══ INVENTORY HEALTH KPIs ═══ -->
        ${kpis ? `
          <div class="section-header" style="margin-bottom: var(--space-4);">
            <h2 class="section-header__title" style="font-size: var(--text-lg);">❤️ KPIs de Inventario Saludable</h2>
          </div>
          <div class="grid grid--4 stagger" style="margin-bottom: var(--space-8);">
            <div class="kpi-card anim-fade-in-up">
              <div class="kpi-card__label">Rotación de Inventario</div>
              <div class="kpi-card__value">${kpis.rotation.average.toFixed(2)}x</div>
              <div class="kpi-card__sub">Pesimista: ${kpis.rotation.pessimistic.toFixed(2)}x · Optimista: ${kpis.rotation.optimistic.toFixed(2)}x</div>
            </div>
            <div class="kpi-card anim-fade-in-up">
              <div class="kpi-card__label">Días para Agotar (P50)</div>
              <div class="kpi-card__value">${fmt(kpis.daysToSellOut.p50)}</div>
              <div class="kpi-card__sub">Bajo estrés: ${fmt(kpis.daysToSellOut.p10)} días</div>
            </div>
            <div class="kpi-card anim-fade-in-up">
              <div class="kpi-card__label">Capital Inmovilizado</div>
              <div class="kpi-card__value">${fmtCur(kpis.capitalImmobilized)}</div>
              <div class="kpi-card__sub">Riesgo: ${fmtPct(kpis.capitalAtRiskPct)}</div>
            </div>
            <div class="kpi-card anim-fade-in-up">
              <div class="kpi-card__label">Beneficio/Unidad (Media)</div>
              <div class="kpi-card__value" style="color: ${kpis.profitPerUnit.mean > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">${fmtCur(kpis.profitPerUnit.mean)}</div>
              <div class="kpi-card__sub">VaR: ${fmtCur(kpis.profitPerUnit.p5)}</div>
            </div>
          </div>
        ` : ''}

        <!-- ═══ CONTINGENCY PLAYBOOKS ═══ -->
        ${contingency && contingency.length > 0 ? `
          <div class="section-header" style="margin-bottom: var(--space-4);">
            <h2 class="section-header__title" style="font-size: var(--text-lg);">🎯 Planes de Contingencia Prescriptivos</h2>
            <span class="badge badge--amber">${contingency.length} playbooks</span>
          </div>
          <div class="grid grid--1 stagger" style="gap: var(--space-4); margin-bottom: var(--space-8);">
            ${contingency.map((plan, idx) => `
              <div class="contingency-card anim-fade-in-up" style="animation-delay:${idx * 80}ms;">
                <div class="flex gap-3" style="align-items:flex-start; margin-bottom: var(--space-3);">
                  <span style="font-size:1.5rem;">${plan.icon}</span>
                  <div style="flex:1;">
                    <div class="contingency-card__label contingency-card__label--if">📌 SI (Condición)</div>
                    <div class="contingency-card__condition" style="color:var(--text-primary); font-weight:var(--weight-medium);">${plan.condition}</div>
                  </div>
                  <span class="badge badge--${plan.severity === 'high' ? 'rose' : plan.severity === 'medium' ? 'amber' : 'emerald'}">${plan.severity.toUpperCase()}</span>
                </div>
                <div style="margin-left: 44px;">
                  <div class="contingency-card__label contingency-card__label--then" style="margin-bottom: var(--space-2);">✅ ENTONCES (Acciones)</div>
                  <ul style="list-style:none; padding:0; display:flex; flex-direction:column; gap: var(--space-2);">
                    ${plan.actions.map(a => `
                      <li style="font-size:var(--text-sm); color:var(--text-primary); padding-left:var(--space-4); position:relative;">
                        <span style="position:absolute;left:0;color:var(--accent-cyan);">→</span> ${a}
                      </li>
                    `).join('')}
                  </ul>
                  <div style="margin-top: var(--space-3); padding: var(--space-3); background:var(--accent-emerald-dim); border-radius:var(--radius-sm); font-size:var(--text-xs); color:var(--accent-emerald);">
                    💡 Impacto Esperado: ${plan.expectedImpact}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- ═══ BREAK-EVEN & ADDITIONAL ═══ -->
        <div class="grid grid--3 stagger" style="margin-bottom: var(--space-8);">
          <div class="kpi-card anim-fade-in-up">
            <div class="kpi-card__label">Break-Even (P50)</div>
            <div class="kpi-card__value">${profitRisk?.breakEvenStats ? `Semana ${fmt(profitRisk.breakEvenStats.p50)}` : 'N/A'}</div>
            <div class="kpi-card__sub">P(No break-even): ${fmtPct((profitRisk?.probNoBreakEven ?? 0) * 100)}</div>
          </div>
          <div class="kpi-card anim-fade-in-up">
            <div class="kpi-card__label">P(ROI > 100%)</div>
            <div class="kpi-card__value" style="color:var(--accent-emerald);">${fmtPct((profitRisk?.probROIAbove100 ?? 0) * 100)}</div>
            <div class="kpi-card__sub">Probabilidad de duplicar la inversión</div>
          </div>
          <div class="kpi-card anim-fade-in-up">
            <div class="kpi-card__label">Beneficio Neto Medio</div>
            <div class="kpi-card__value" style="color: ${mc.netProfit.mean > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">${fmtCur(mc.netProfit.mean)}</div>
            <div class="kpi-card__sub">P10: ${fmtCur(mc.netProfit.p10)} · P90: ${fmtCur(mc.netProfit.p90)}</div>
          </div>
        </div>
      </div>
    `;

        // Render charts after DOM is ready
        requestAnimationFrame(() => {
            if (mc.weeklyAvg) {
                renderSalesProjection('chart-sales-projection', mc.weeklyAvg, mc);
                renderInventoryTimeline('chart-inventory-timeline', mc.weeklyAvg);
            }
            if (mc.distributions?.unitsSold) {
                renderHistogram('chart-sales-hist', mc.distributions.unitsSold, { title: 'Unidades Vendidas', color: '#00e5ff' });
            }
            if (mc.rawResults) {
                renderRiskScatter('chart-risk-scatter', mc);
            }
            if (safeStock?.scenarios) {
                renderStockScenarios('chart-stock-scenarios', safeStock.scenarios);
            }
        });
    }
}
