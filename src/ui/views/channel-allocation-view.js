/**
 * Prometheus UI – Marketing Channel Allocation View (MKT-004)
 * Interactive UI for allocating budget across marketing channels.
 */

import { MARKETING_CHANNELS, simulateFunnel, recommendAllocation } from '../engine/marketing-funnel.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Channel Allocation View
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Render the marketing channel allocation view.
 * @param {HTMLElement} container
 * @param {object} [opts]
 */
export function renderChannelAllocation(container, opts = {}) {
    const {
        totalBudget = 50000,
        targetMarket = 100000,
        avgOrderValue = 150,
    } = opts;

    const channels = Object.entries(MARKETING_CHANNELS);
    const allocation = recommendAllocation('balanced');

    container.innerHTML = `
        <div class="channel-allocation" style="padding: var(--space-4, 16px);">
            <h2 style="color: var(--text-primary); margin-bottom: var(--space-3, 12px);">
                📢 Asignación de Canales de Marketing
            </h2>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-3, 12px); margin-bottom: var(--space-4, 16px);">
                <div class="input-group">
                    <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px;">Presupuesto Total</label>
                    <input id="mkt-budget" type="number" value="${totalBudget}" min="0" style="
                        width: 100%; padding: 8px; border-radius: var(--radius-md, 8px);
                        background: var(--bg-elevated); color: var(--text-primary);
                        border: 1px solid var(--border-subtle); font-size: 14px;"/>
                </div>
                <div class="input-group">
                    <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px;">Mercado Objetivo</label>
                    <input id="mkt-market" type="number" value="${targetMarket}" min="0" style="
                        width: 100%; padding: 8px; border-radius: var(--radius-md, 8px);
                        background: var(--bg-elevated); color: var(--text-primary);
                        border: 1px solid var(--border-subtle); font-size: 14px;"/>
                </div>
                <div class="input-group">
                    <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px;">Ticket Promedio</label>
                    <input id="mkt-aov" type="number" value="${avgOrderValue}" min="0" style="
                        width: 100%; padding: 8px; border-radius: var(--radius-md, 8px);
                        background: var(--bg-elevated); color: var(--text-primary);
                        border: 1px solid var(--border-subtle); font-size: 14px;"/>
                </div>
            </div>

            <div style="display: flex; gap: var(--space-2, 8px); margin-bottom: var(--space-4, 16px);">
                ${['awareness', 'conversion', 'balanced'].map(s => `
                    <button class="strategy-btn" data-strategy="${s}" style="
                        padding: 6px 16px; border-radius: var(--radius-md, 8px);
                        background: ${s === 'balanced' ? 'var(--accent-cyan, #06b6d4)' : 'var(--bg-elevated, #1e1e3a)'};
                        color: ${s === 'balanced' ? 'white' : 'var(--text-secondary)'};
                        border: 1px solid var(--border-subtle); cursor: pointer; font-size: 13px;
                        transition: all 0.2s;">
                        ${s === 'awareness' ? '📣 Awareness' : s === 'conversion' ? '🎯 Conversión' : '⚖️ Balanceado'}
                    </button>
                `).join('')}
            </div>

            <div id="channel-sliders" style="margin-bottom: var(--space-4, 16px);">
                ${channels.map(([key, ch]) => `
                    <div style="display: grid; grid-template-columns: 140px 1fr 60px; gap: 12px; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 13px; color: var(--text-primary);">${ch.label}</span>
                        <input type="range" class="channel-slider" data-channel="${key}"
                            min="0" max="100" value="${Math.round((allocation[key] || 0) * 100)}"
                            style="width: 100%; accent-color: var(--accent-cyan);" />
                        <span class="slider-value" style="font-size: 13px; color: var(--text-secondary); text-align: right;">
                            ${Math.round((allocation[key] || 0) * 100)}%
                        </span>
                    </div>
                `).join('')}
            </div>

            <button id="simulate-funnel-btn" style="
                padding: 10px 24px; border-radius: var(--radius-md, 8px);
                background: linear-gradient(135deg, var(--accent-emerald, #10b981), var(--accent-cyan, #06b6d4));
                color: white; border: none; cursor: pointer; font-weight: 600; font-size: 14px;
                transition: transform 0.2s; margin-bottom: var(--space-4, 16px);
            ">🚀 Simular Funnel</button>

            <div id="funnel-results"></div>
        </div>
    `;

    // Wire up strategy buttons
    container.querySelectorAll('.strategy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const strategy = btn.dataset.strategy;
            const alloc = recommendAllocation(strategy);

            // Update sliders
            container.querySelectorAll('.channel-slider').forEach(slider => {
                const pct = Math.round((alloc[slider.dataset.channel] || 0) * 100);
                slider.value = pct;
                slider.nextElementSibling.textContent = `${pct}%`;
            });

            // Update button styles
            container.querySelectorAll('.strategy-btn').forEach(b => {
                b.style.background = b === btn ? 'var(--accent-cyan)' : 'var(--bg-elevated)';
                b.style.color = b === btn ? 'white' : 'var(--text-secondary)';
            });
        });
    });

    // Wire up sliders
    container.querySelectorAll('.channel-slider').forEach(slider => {
        slider.addEventListener('input', () => {
            slider.nextElementSibling.textContent = `${slider.value}%`;
        });
    });

    // Wire up simulate button
    container.querySelector('#simulate-funnel-btn')?.addEventListener('click', () => {
        const budget = parseFloat(container.querySelector('#mkt-budget')?.value) || totalBudget;
        const market = parseFloat(container.querySelector('#mkt-market')?.value) || targetMarket;
        const aov = parseFloat(container.querySelector('#mkt-aov')?.value) || avgOrderValue;

        const alloc = {};
        let total = 0;
        container.querySelectorAll('.channel-slider').forEach(s => {
            alloc[s.dataset.channel] = parseInt(s.value);
            total += parseInt(s.value);
        });

        // Normalize to sum 1
        for (const k of Object.keys(alloc)) {
            alloc[k] = total > 0 ? alloc[k] / total : 0.2;
        }

        const results = simulateFunnel(budget, alloc, market, { avgOrderValue: aov });
        renderFunnelResults(container.querySelector('#funnel-results'), results);
    });
}

function renderFunnelResults(container, results) {
    if (!results) return;

    const channelRows = Object.entries(results.channelResults).map(([, ch]) => `
        <tr>
            <td style="padding: 6px 12px;">${ch.label}</td>
            <td style="padding: 6px 12px; text-align: right;">$${ch.budget.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</td>
            <td style="padding: 6px 12px; text-align: right;">${ch.funnel?.purchase?.toLocaleString() || 0}</td>
            <td style="padding: 6px 12px; text-align: right;">$${ch.costPerPurchase === Infinity ? '∞' : ch.costPerPurchase.toFixed(0)}</td>
            <td style="padding: 6px 12px; text-align: right;">${ch.roas.toFixed(2)}x</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3, 12px); margin-bottom: var(--space-4, 16px);">
            <div style="background: var(--bg-elevated); border-radius: var(--radius-md, 8px); padding: 16px; text-align: center;">
                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Compras Totales</div>
                <div style="font-size: 28px; font-weight: 700; color: var(--accent-emerald, #10b981);">${results.totalPurchases.toLocaleString()}</div>
            </div>
            <div style="background: var(--bg-elevated); border-radius: var(--radius-md, 8px); padding: 16px; text-align: center;">
                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">CPA Promedio</div>
                <div style="font-size: 28px; font-weight: 700; color: var(--accent-amber, #f59e0b);">$${results.costPerAcquisition === Infinity ? '∞' : results.costPerAcquisition.toFixed(0)}</div>
            </div>
            <div style="background: var(--bg-elevated); border-radius: var(--radius-md, 8px); padding: 16px; text-align: center;">
                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">ROAS General</div>
                <div style="font-size: 28px; font-weight: 700; color: var(--accent-cyan, #06b6d4);">${results.overallROAS.toFixed(2)}x</div>
            </div>
        </div>

        <div style="background: var(--bg-card); border-radius: var(--radius-lg, 12px); border: 1px solid var(--border-subtle); overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: var(--text-primary);">
                <thead>
                    <tr style="background: var(--bg-elevated); font-size: 11px; text-transform: uppercase; color: var(--text-muted);">
                        <th style="padding: 8px 12px; text-align: left;">Canal</th>
                        <th style="padding: 8px 12px; text-align: right;">Presupuesto</th>
                        <th style="padding: 8px 12px; text-align: right;">Compras</th>
                        <th style="padding: 8px 12px; text-align: right;">CPA</th>
                        <th style="padding: 8px 12px; text-align: right;">ROAS</th>
                    </tr>
                </thead>
                <tbody>${channelRows}</tbody>
            </table>
        </div>
    `;
}
