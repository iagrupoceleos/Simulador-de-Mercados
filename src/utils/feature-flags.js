/**
 * Prometheus – Feature Flags (PROD-003)
 * Runtime feature toggle system for safe rollouts.
 */

const STORAGE_KEY = 'prometheus_feature_flags';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Default Flags
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DEFAULT_FLAGS = {
    // Simulation features
    multiPeriodPlanning: { enabled: true, label: 'Planificación Multi-Periodo', category: 'simulation' },
    supplyChainSim: { enabled: true, label: 'Simulación Cadena de Suministro', category: 'simulation' },
    marketShocks: { enabled: true, label: 'Eventos de Shock de Mercado', category: 'simulation' },
    multiPlayerMode: { enabled: false, label: 'Modo Multi-Jugador', category: 'simulation' },
    ecosystemModel: { enabled: false, label: 'Modelo de Ecosistema', category: 'simulation' },

    // AI/ML features
    banditPricing: { enabled: true, label: 'Thompson Sampling (Precios)', category: 'ai' },
    geneticOptimizer: { enabled: false, label: 'Optimizador Genético', category: 'ai' },
    bayesianUpdating: { enabled: true, label: 'Actualización Bayesiana', category: 'ai' },

    // Forecasting
    holtWinters: { enabled: true, label: 'Holt-Winters Forecast', category: 'forecasting' },
    demandPlanning: { enabled: true, label: 'Planificación de Demanda', category: 'forecasting' },

    // UX features
    draggableDashboard: { enabled: true, label: 'Dashboard Configurable', category: 'ux' },
    simulationHistory: { enabled: true, label: 'Historial de Simulaciones', category: 'ux' },
    scenarioFilter: { enabled: true, label: 'Filtro de Escenarios', category: 'ux' },
    convergenceAnimation: { enabled: true, label: 'Animación de Convergencia', category: 'ux' },
    pdfExport: { enabled: true, label: 'Exportar PDF', category: 'ux' },
    excelExport: { enabled: true, label: 'Exportar Excel', category: 'ux' },

    // Production
    healthMonitor: { enabled: true, label: 'Monitor de Salud', category: 'production' },
    sentryMonitoring: { enabled: false, label: 'Sentry Error Monitoring', category: 'production' },
    cloudSync: { enabled: false, label: 'Sincronización en la Nube', category: 'production' },
    debugMode: { enabled: false, label: 'Modo Debug', category: 'production' },

    // Visualizations
    d3Visualizations: { enabled: true, label: 'Visualizaciones D3.js', category: 'visualization' },
};

let flags = null;

function loadFlags() {
    if (flags) return flags;
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        flags = {};
        for (const [key, def] of Object.entries(DEFAULT_FLAGS)) {
            flags[key] = { ...def, enabled: key in stored ? stored[key] : def.enabled };
        }
    } catch (_) {
        flags = { ...DEFAULT_FLAGS };
    }
    return flags;
}

function saveFlags() {
    const toStore = {};
    for (const [key, f] of Object.entries(flags || {})) {
        toStore[key] = f.enabled;
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore)); } catch (_) { /* quota */ }
}

/**
 * Check if a feature flag is enabled.
 * @param {string} flagKey
 * @returns {boolean}
 */
export function isEnabled(flagKey) {
    const f = loadFlags();
    return f[flagKey]?.enabled ?? false;
}

/**
 * Toggle a feature flag.
 * @param {string} flagKey
 * @param {boolean} [value]
 */
export function toggleFlag(flagKey, value) {
    const f = loadFlags();
    if (f[flagKey]) {
        f[flagKey].enabled = value !== undefined ? value : !f[flagKey].enabled;
        saveFlags();
    }
}

/**
 * Get all flags grouped by category.
 */
export function getAllFlags() {
    const f = loadFlags();
    const grouped = {};
    for (const [key, flag] of Object.entries(f)) {
        const cat = flag.category || 'other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({ key, ...flag });
    }
    return grouped;
}

/**
 * Reset all flags to defaults.
 */
export function resetFlags() {
    flags = null;
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Render feature flags panel.
 * @param {HTMLElement} container
 */
export function renderFlagsPanel(container) {
    if (!container) return;

    const grouped = getAllFlags();
    const categoryLabels = {
        simulation: '🎲 Simulación',
        ai: '🤖 IA / ML',
        forecasting: '📈 Pronóstico',
        ux: '🎨 Interfaz',
        production: '🔧 Producción',
    };

    container.innerHTML = `
        <div style="padding:16px;">
            <h3 style="margin:0 0 16px; color:var(--text-primary);">⚙️ Feature Flags</h3>
            ${Object.entries(grouped).map(([cat, items]) => `
                <div style="margin-bottom:16px;">
                    <h4 style="margin:0 0 8px; color:var(--text-secondary); font-size:13px;">
                        ${categoryLabels[cat] || cat}
                    </h4>
                    ${items.map(flag => `
                        <label style="display:flex; align-items:center; gap:8px; padding:6px 0; cursor:pointer; font-size:13px;">
                            <input type="checkbox" data-flag="${flag.key}" ${flag.enabled ? 'checked' : ''}
                                style="accent-color:var(--accent-cyan);" />
                            <span style="color:var(--text-primary);">${flag.label}</span>
                        </label>
                    `).join('')}
                </div>
            `).join('')}
            <button id="reset-flags" style="padding:6px 16px; border-radius:6px; background:transparent;
                border:1px solid #666; color:#aaa; cursor:pointer; font-size:12px;">Restaurar defaults</button>
        </div>
    `;

    container.querySelectorAll('input[data-flag]').forEach(input => {
        input.addEventListener('change', () => toggleFlag(input.dataset.flag, input.checked));
    });

    container.querySelector('#reset-flags')?.addEventListener('click', () => {
        resetFlags();
        renderFlagsPanel(container);
    });
}
