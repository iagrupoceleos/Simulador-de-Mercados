/**
 * Prometheus UI – Simulation History Timeline (UX-009)
 * Visual timeline with replay controls for past simulation runs.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  History Manager
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const HISTORY_KEY = 'prometheus_sim_history';
const MAX_ENTRIES = 50;

/**
 * @typedef {object} SimHistoryEntry
 * @property {string} id
 * @property {string} timestamp
 * @property {string} scenarioName
 * @property {number} iterations
 * @property {number} duration - ms
 * @property {object} kpis - { revenue, profit, marketShare }
 * @property {object} config - snapshot of config
 */

/**
 * Add a simulation run to history.
 * @param {SimHistoryEntry} entry
 */
export function addToHistory(entry) {
    const history = getHistory();
    history.unshift({
        id: entry.id || `sim_${Date.now()}`,
        timestamp: entry.timestamp || new Date().toISOString(),
        scenarioName: entry.scenarioName || 'Sin nombre',
        iterations: entry.iterations || 0,
        duration: entry.duration || 0,
        kpis: entry.kpis || {},
        config: entry.config || {},
    });

    if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
    saveHistory(history);
}

export function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch (_) { return []; }
}

function saveHistory(history) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (_) { /* quota */ }
}

export function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Timeline Renderer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Render simulation history as a visual timeline.
 * @param {HTMLElement} container
 * @param {object} [callbacks]
 * @param {Function} [callbacks.onReplay] - (entry) => void
 * @param {Function} [callbacks.onCompare] - (entry1, entry2) => void
 */
export function renderTimeline(container, callbacks = {}) {
    if (!container) return;

    const history = getHistory();
    if (history.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:var(--text-muted);">
                <p style="font-size:24px;">📭</p>
                <p>No hay simulaciones en el historial</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h3 style="margin:0; color:var(--text-primary);">📜 Historial de Simulaciones</h3>
            <button id="btn-clear-history" style="padding:4px 12px; border-radius:6px; background:transparent;
                border:1px solid #ef4444; color:#ef4444; cursor:pointer; font-size:12px;">Limpiar</button>
        </div>
        <div class="timeline-container" style="position:relative; padding-left:20px;">
            <div style="position:absolute; left:8px; top:0; bottom:0; width:2px; background:var(--border-subtle, #2a2a4a);"></div>
            ${history.map((entry, i) => renderTimelineEntry(entry, i)).join('')}
        </div>
    `;

    // Bind clear button
    container.querySelector('#btn-clear-history')?.addEventListener('click', () => {
        clearHistory();
        renderTimeline(container, callbacks);
    });

    // Bind replay buttons
    container.querySelectorAll('.btn-replay').forEach(btn => {
        btn.addEventListener('click', () => {
            const entry = history.find(h => h.id === btn.dataset.simId);
            if (entry && callbacks.onReplay) callbacks.onReplay(entry);
        });
    });
}

function renderTimelineEntry(entry, index) {
    const date = new Date(entry.timestamp);
    const timeStr = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const profit = entry.kpis?.profit;
    const profitColor = profit >= 0 ? '#10b981' : '#ef4444';

    return `
        <div class="timeline-entry" style="position:relative; margin-bottom:16px; padding-left:16px;">
            <div style="position:absolute; left:-7px; top:6px; width:12px; height:12px;
                border-radius:50%; background:var(--accent-cyan, #06b6d4); border:2px solid var(--bg-base, #0a0a1a);
                ${index === 0 ? 'box-shadow: 0 0 0 3px #06b6d444;' : ''}"></div>

            <div class="glass-card" style="padding:12px 16px; border-radius:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:600; color:var(--text-primary);">${entry.scenarioName}</span>
                    <span style="font-size:11px; color:var(--text-muted);">${dateStr} ${timeStr}</span>
                </div>
                <div style="display:flex; gap:12px; margin-top:8px; font-size:12px;">
                    <span style="color:var(--text-muted);">🎯 ${entry.iterations} iter</span>
                    <span style="color:var(--text-muted);">⏱ ${(entry.duration / 1000).toFixed(1)}s</span>
                    ${profit != null ? `<span style="color:${profitColor};">💰 $${formatNum(profit)}</span>` : ''}
                </div>
                <div style="margin-top:8px;">
                    <button class="btn-replay" data-sim-id="${entry.id}"
                        style="padding:4px 10px; border-radius:4px; background:var(--accent-cyan); color:#fff;
                        border:none; cursor:pointer; font-size:11px; font-weight:600;">▶ Repetir</button>
                </div>
            </div>
        </div>
    `;
}

function formatNum(n) {
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toFixed(0);
}
