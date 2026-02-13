/**
 * Prometheus UI – Scenario Comparison View (STR-001)
 * Side-by-side comparison UI for saved simulation scenarios.
 */

import { compareSnapshots, createSnapshot } from '../engine/scenario-compare.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Scenario Comparison View
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Render the scenario comparison view.
 * @param {HTMLElement} container
 * @param {Array} savedScenarios - array of saved scenario objects with { label, config, results }
 */
export function renderScenarioComparison(container, savedScenarios = []) {
    container.innerHTML = `
        <div class="comparison-view" style="padding: var(--space-4, 16px);">
            <h2 style="color: var(--text-primary); margin-bottom: var(--space-4, 16px);">
                📊 Comparación de Escenarios
            </h2>

            <div id="comparison-selectors" style="
                display: grid; grid-template-columns: 1fr auto 1fr;
                gap: var(--space-3, 12px); align-items: end;
                margin-bottom: var(--space-4, 16px);
            ">
                <div>
                    <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px;">Escenario A</label>
                    <select id="scenario-a" style="
                        width: 100%; padding: 8px 12px; border-radius: var(--radius-md, 8px);
                        background: var(--bg-elevated, #1e1e3a); color: var(--text-primary);
                        border: 1px solid var(--border-subtle, #2a2a4a); font-size: 14px;">
                        <option value="">Seleccionar...</option>
                        ${savedScenarios.map((s, i) => `<option value="${i}">${s.label || `Escenario ${i + 1}`}</option>`).join('')}
                    </select>
                </div>
                <div style="text-align: center; padding-bottom: 8px; font-size: 20px;">⚡ vs</div>
                <div>
                    <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px;">Escenario B</label>
                    <select id="scenario-b" style="
                        width: 100%; padding: 8px 12px; border-radius: var(--radius-md, 8px);
                        background: var(--bg-elevated, #1e1e3a); color: var(--text-primary);
                        border: 1px solid var(--border-subtle, #2a2a4a); font-size: 14px;">
                        <option value="">Seleccionar...</option>
                        ${savedScenarios.map((s, i) => `<option value="${i}">${s.label || `Escenario ${i + 1}`}</option>`).join('')}
                    </select>
                </div>
            </div>

            <button id="compare-btn" style="
                padding: 10px 24px; border-radius: var(--radius-md, 8px);
                background: linear-gradient(135deg, var(--accent-cyan, #06b6d4), var(--accent-indigo, #6366f1));
                color: white; border: none; cursor: pointer; font-weight: 600;
                margin-bottom: var(--space-4, 16px); transition: transform 0.2s;
            " onmouseenter="this.style.transform='scale(1.03)'"
               onmouseleave="this.style.transform='scale(1)'">
                Comparar Escenarios
            </button>

            <div id="comparison-results"></div>
        </div>
    `;

    // Wire up compare button
    const btn = container.querySelector('#compare-btn');
    btn?.addEventListener('click', () => {
        const aIdx = container.querySelector('#scenario-a')?.value;
        const bIdx = container.querySelector('#scenario-b')?.value;

        if (aIdx === '' || bIdx === '' || aIdx === bIdx) {
            container.querySelector('#comparison-results').innerHTML = `
                <div style="padding: 16px; text-align: center; color: var(--text-muted);">
                    Selecciona dos escenarios diferentes para comparar.
                </div>`;
            return;
        }

        const scenA = savedScenarios[parseInt(aIdx)];
        const scenB = savedScenarios[parseInt(bIdx)];

        const snapA = createSnapshot(scenA.label || `Escenario ${parseInt(aIdx) + 1}`, scenA.config || {}, scenA.results || {});
        const snapB = createSnapshot(scenB.label || `Escenario ${parseInt(bIdx) + 1}`, scenB.config || {}, scenB.results || {});

        const comparison = compareSnapshots(snapA, snapB);
        renderComparisonResults(container.querySelector('#comparison-results'), comparison);
    });
}

function renderComparisonResults(container, comparison) {
    if (!comparison) {
        container.innerHTML = `<div style="padding: 16px; color: var(--text-muted);">No hay datos para comparar.</div>`;
        return;
    }

    const kpiLabels = {
        salesMean: 'Ventas (media)',
        revenueMean: 'Ingresos (media)',
        netProfitMean: 'Beneficio Neto (media)',
        netProfitP5: 'Beneficio Neto (P5 - peor caso)',
        netProfitP95: 'Beneficio Neto (P95 - mejor caso)',
        roiMean: 'ROI (media)',
        marginMean: 'Margen (media)',
        unsoldPctMean: '% Sin Vender (media)',
    };

    const rows = Object.entries(comparison.kpiDiff)
        .filter(([key]) => kpiLabels[key])
        .map(([key, diff]) => {
            const color = diff.delta > 0 ? 'var(--accent-emerald, #10b981)' : diff.delta < 0 ? 'var(--accent-rose, #f43f5e)' : 'var(--text-secondary)';
            const arrow = diff.delta > 0 ? '▲' : diff.delta < 0 ? '▼' : '—';
            const isUnsold = key === 'unsoldPctMean';
            const goodColor = isUnsold ? (diff.delta < 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)') : color;

            return `<tr>
                <td style="padding: 8px 12px; font-weight: 500;">${kpiLabels[key]}</td>
                <td style="padding: 8px 12px; text-align: right;">${fmt(diff.a)}</td>
                <td style="padding: 8px 12px; text-align: right;">${fmt(diff.b)}</td>
                <td style="padding: 8px 12px; text-align: right; color: ${goodColor}; font-weight: 600;">
                    ${arrow} ${diff.pctChange != null ? diff.pctChange.toFixed(1) + '%' : '—'}
                </td>
                <td style="padding: 8px 12px; text-align: center; font-size: 12px;">${comparison.winners[key] || '—'}</td>
            </tr>`;
        }).join('');

    container.innerHTML = `
        <div style="
            background: var(--bg-card, #1a1a2e); border-radius: var(--radius-lg, 12px);
            border: 1px solid var(--border-subtle, #2a2a4a); overflow: hidden;
        ">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: var(--text-primary);">
                <thead>
                    <tr style="background: var(--bg-elevated, #1e1e3a); font-size: 12px; text-transform: uppercase; color: var(--text-muted);">
                        <th style="padding: 10px 12px; text-align: left;">KPI</th>
                        <th style="padding: 10px 12px; text-align: right;">${comparison.labelA}</th>
                        <th style="padding: 10px 12px; text-align: right;">${comparison.labelB}</th>
                        <th style="padding: 10px 12px; text-align: right;">Δ Cambio</th>
                        <th style="padding: 10px 12px; text-align: center;">Ganador</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>

        <div style="
            margin-top: var(--space-4, 16px); padding: 16px;
            background: var(--bg-elevated, #1e1e3a);
            border-radius: var(--radius-md, 8px); border-left: 4px solid var(--accent-cyan, #06b6d4);
            color: var(--text-secondary); font-size: 14px; line-height: 1.6;
        ">
            <strong style="color: var(--text-primary);">💡 Recomendación:</strong><br/>
            ${comparison.recommendation || 'Revise los datos para una recomendación más precisa.'}
        </div>
    `;
}

function fmt(value) {
    if (value == null) return '—';
    if (Math.abs(value) >= 1000) return value.toLocaleString('es-MX', { maximumFractionDigits: 0 });
    if (Math.abs(value) >= 1) return value.toFixed(1);
    return value.toFixed(2);
}
