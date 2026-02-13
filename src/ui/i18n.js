/**
 * Prometheus UI – i18n Internationalization (UX-011)
 * Simple i18n system with Spanish (default) and English translations.
 */

const TRANSLATIONS = {
    es: {
        // Navigation
        'nav.dashboard': 'Dashboard',
        'nav.simulation': 'Simulación',
        'nav.scenarios': 'Escenarios',
        'nav.settings': 'Configuración',
        'nav.reports': 'Reportes',

        // Simulation
        'sim.run': 'Ejecutar Simulación',
        'sim.stop': 'Detener',
        'sim.iterations': 'Iteraciones',
        'sim.weeks': 'Semanas',
        'sim.running': 'Simulando…',
        'sim.complete': 'Simulación completada',
        'sim.convergence': 'Convergencia',

        // KPIs
        'kpi.revenue': 'Ingresos',
        'kpi.profit': 'Beneficio',
        'kpi.marketShare': 'Cuota de Mercado',
        'kpi.customers': 'Clientes',
        'kpi.inventory': 'Inventario',
        'kpi.fillRate': 'Tasa de Servicio',
        'kpi.cac': 'Costo de Adquisición',
        'kpi.ltv': 'Valor de Vida del Cliente',

        // Actions
        'action.save': 'Guardar',
        'action.load': 'Cargar',
        'action.export': 'Exportar',
        'action.import': 'Importar',
        'action.reset': 'Reiniciar',
        'action.compare': 'Comparar',
        'action.delete': 'Eliminar',
        'action.cancel': 'Cancelar',
        'action.confirm': 'Confirmar',

        // Status
        'status.healthy': 'Saludable',
        'status.warning': 'Advertencia',
        'status.critical': 'Crítico',
        'status.unknown': 'Desconocido',

        // Charts
        'chart.revenue': 'Ingresos Semanales',
        'chart.profit': 'Beneficio Acumulado',
        'chart.share': 'Cuota de Mercado',
        'chart.histogram': 'Distribución de Resultados',
    },
    en: {
        'nav.dashboard': 'Dashboard',
        'nav.simulation': 'Simulation',
        'nav.scenarios': 'Scenarios',
        'nav.settings': 'Settings',
        'nav.reports': 'Reports',

        'sim.run': 'Run Simulation',
        'sim.stop': 'Stop',
        'sim.iterations': 'Iterations',
        'sim.weeks': 'Weeks',
        'sim.running': 'Simulating…',
        'sim.complete': 'Simulation complete',
        'sim.convergence': 'Convergence',

        'kpi.revenue': 'Revenue',
        'kpi.profit': 'Profit',
        'kpi.marketShare': 'Market Share',
        'kpi.customers': 'Customers',
        'kpi.inventory': 'Inventory',
        'kpi.fillRate': 'Fill Rate',
        'kpi.cac': 'Customer Acquisition Cost',
        'kpi.ltv': 'Customer Lifetime Value',

        'action.save': 'Save',
        'action.load': 'Load',
        'action.export': 'Export',
        'action.import': 'Import',
        'action.reset': 'Reset',
        'action.compare': 'Compare',
        'action.delete': 'Delete',
        'action.cancel': 'Cancel',
        'action.confirm': 'Confirm',

        'status.healthy': 'Healthy',
        'status.warning': 'Warning',
        'status.critical': 'Critical',
        'status.unknown': 'Unknown',

        'chart.revenue': 'Weekly Revenue',
        'chart.profit': 'Cumulative Profit',
        'chart.share': 'Market Share',
        'chart.histogram': 'Results Distribution',
    },
};

let currentLocale = 'es';

/**
 * Set current locale.
 * @param {string} locale - 'es' or 'en'
 */
export function setLocale(locale) {
    if (TRANSLATIONS[locale]) {
        currentLocale = locale;
        try { localStorage.setItem('prometheus_locale', locale); } catch (_) { }
    }
}

/**
 * Get current locale.
 */
export function getLocale() {
    try {
        const stored = localStorage.getItem('prometheus_locale');
        if (stored && TRANSLATIONS[stored]) currentLocale = stored;
    } catch (_) { }
    return currentLocale;
}

/**
 * Translate a key.
 * @param {string} key
 * @param {object} [params] - interpolation params { name: 'value' }
 * @returns {string}
 */
export function t(key, params = {}) {
    const locale = getLocale();
    let text = TRANSLATIONS[locale]?.[key] || TRANSLATIONS.es[key] || key;

    for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, v);
    }

    return text;
}

/**
 * Get all available locales.
 */
export function getAvailableLocales() {
    return Object.keys(TRANSLATIONS).map(key => ({
        code: key,
        name: key === 'es' ? 'Español' : 'English',
    }));
}

/**
 * Render locale switcher.
 * @param {HTMLElement} container
 * @param {Function} [onChange]
 */
export function renderLocaleSwitcher(container, onChange) {
    if (!container) return;

    const locales = getAvailableLocales();
    const current = getLocale();

    container.innerHTML = `
        <select id="locale-select" style="padding:4px 8px; border-radius:4px;
            background:var(--bg-surface, #131332); border:1px solid var(--border-subtle, #2a2a4a);
            color:var(--text-primary); font-size:12px; cursor:pointer;">
            ${locales.map(l => `<option value="${l.code}" ${l.code === current ? 'selected' : ''}>${l.name}</option>`).join('')}
        </select>
    `;

    container.querySelector('#locale-select')?.addEventListener('change', (e) => {
        setLocale(e.target.value);
        if (onChange) onChange(e.target.value);
    });
}
