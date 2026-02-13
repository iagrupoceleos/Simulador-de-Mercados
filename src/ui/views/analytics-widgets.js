/**
 * Prometheus UI – Risk-Adjusted & Nash Dashboard Widgets (INT-002)
 * Renders risk-adjusted metrics and Nash equilibrium analysis in the results view.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Risk-Adjusted Metrics Widget
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Render risk-adjusted metrics card.
 * @param {HTMLElement} container
 * @param {object} report - from generateRiskAdjustedReport()
 */
export function renderRiskAdjustedWidget(container, report) {
    if (!container || !report) return;

    const gradeColors = {
        'A+': '#10b981', 'A': '#10b981', 'B': '#f59e0b', 'C': '#f97316', 'D': '#ef4444',
    };
    const color = gradeColors[report.grade] || '#a0aec0';

    container.innerHTML = `
        <div class="widget-card glass-card" style="padding: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="margin:0; color: var(--text-primary);">📊 Rendimiento Ajustado al Riesgo</h3>
                <span style="font-size: 28px; font-weight: 800; color: ${color}; padding: 4px 16px;
                    border-radius: 8px; background: ${color}22;">${report.grade}</span>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:12px;">
                ${metricChip('Sharpe', report.sharpe?.toFixed(2) || '—', report.sharpe > 1 ? '#10b981' : '#f59e0b')}
                ${metricChip('Sortino', report.sortino === Infinity ? '∞' : report.sortino?.toFixed(2) || '—', '#06b6d4')}
                ${metricChip('Max DD', report.maxDrawdown?.drawdownPct + '%' || '—', '#ef4444')}
                ${metricChip('Calmar', report.calmar?.toFixed(2) || '—', '#8b5cf6')}
            </div>

            <p style="margin:12px 0 0; font-size:13px; color:var(--text-secondary);">
                ${report.interpretation || ''}
            </p>
        </div>
    `;
}

function metricChip(label, value, color) {
    return `
        <div style="text-align:center; padding:12px; border-radius:8px; background:var(--bg-surface, #131332);">
            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">${label}</div>
            <div style="font-size:20px; font-weight:700; color:${color};">${value}</div>
        </div>
    `;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Nash Equilibrium Widget
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Render Nash equilibrium analysis widget.
 * @param {HTMLElement} container
 * @param {object} analysis - from analyzePricingEquilibrium()
 */
export function renderNashWidget(container, analysis) {
    if (!container || !analysis) return;

    const eqRows = analysis.equilibria.length > 0
        ? analysis.equilibria.map(eq => `
            <tr>
                <td style="padding:8px; color:#10b981;">$${eq.playerPrice}</td>
                <td style="padding:8px; color:#f59e0b;">$${eq.opponentPrice}</td>
                <td style="padding:8px; color:var(--text-secondary);">$${Math.round(eq.payoffs.player)}</td>
                <td style="padding:8px; color:var(--text-secondary);">$${Math.round(eq.payoffs.opponent)}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="4" style="padding:8px; color:var(--text-muted); text-align:center;">Sin equilibrios puros encontrados</td></tr>';

    const dominant = analysis.dominantStrategies || {};

    container.innerHTML = `
        <div class="widget-card glass-card" style="padding: 20px;">
            <h3 style="margin:0 0 16px; color: var(--text-primary);">🎯 Análisis de Equilibrio Nash</h3>

            <table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead>
                    <tr style="border-bottom:1px solid var(--border-subtle, #2a2a4a);">
                        <th style="padding:8px; text-align:left; color:var(--text-muted);">Tu Precio</th>
                        <th style="padding:8px; text-align:left; color:var(--text-muted);">Precio Rival</th>
                        <th style="padding:8px; text-align:left; color:var(--text-muted);">Tu Gcia</th>
                        <th style="padding:8px; text-align:left; color:var(--text-muted);">Gcia Rival</th>
                    </tr>
                </thead>
                <tbody>${eqRows}</tbody>
            </table>

            ${dominant.playerDominant ? `
                <div style="margin-top:12px; padding:8px 12px; background:#10b98122; border-radius:6px; font-size:13px;">
                    <strong style="color:#10b981;">✓ Estrategia dominante:</strong>
                    <span style="color:var(--text-secondary);">Precio $${dominant.playerDominant.price}</span>
                </div>
            ` : ''}

            <p style="margin:12px 0 0; font-size:13px; color:var(--accent-cyan);">
                ${analysis.recommendation || ''}
            </p>
        </div>
    `;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Bayesian Belief Panel (INT-003)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Render Bayesian belief panel for parameter estimation.
 * @param {HTMLElement} container
 * @param {object} beliefSummary - from BeliefManager.getSummary()
 */
export function renderBayesianPanel(container, beliefSummary) {
    if (!container || !beliefSummary) return;

    const rows = Object.entries(beliefSummary).map(([name, belief]) => {
        const ci = belief.ci || [];
        const widthPct = belief.std && belief.mean ? Math.min(50, (belief.std / Math.abs(belief.mean || 1)) * 100) : 10;

        return `
            <div style="padding:12px; border-radius:8px; background:var(--bg-surface, #131332); margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="font-weight:600; color:var(--text-primary); text-transform:capitalize;">${name}</span>
                    <span style="color:var(--accent-cyan); font-weight:700;">${belief.mean?.toFixed(2) || '—'}</span>
                </div>
                <div style="display:flex; gap:12px; font-size:12px; color:var(--text-muted);">
                    <span>σ: ${belief.std?.toFixed(2) || '—'}</span>
                    <span>CI: [${ci[0]?.toFixed(1) || '—'}, ${ci[1]?.toFixed(1) || '—'}]</span>
                    <span>Actualizaciones: ${belief.updates || 0}</span>
                </div>
                <div style="margin-top:6px; height:4px; background:#1a1a2e; border-radius:2px; position:relative;">
                    <div style="position:absolute; height:100%; width:${100 - widthPct}%;
                        left:${widthPct / 2}%; background:linear-gradient(90deg, #06b6d4, #10b981);
                        border-radius:2px;"></div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="widget-card glass-card" style="padding: 20px;">
            <h3 style="margin:0 0 16px; color: var(--text-primary);">🧠 Creencias Bayesianas</h3>
            ${rows || '<p style="color:var(--text-muted);">Sin creencias registradas</p>'}
            <p style="margin:12px 0 0; font-size:12px; color:var(--text-muted);">
                Las barras muestran la certidumbre relativa. Más datos = barra más estrecha.
            </p>
        </div>
    `;
}
