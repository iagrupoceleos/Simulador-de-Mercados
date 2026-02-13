/**
 * Prometheus UI – Advanced Scenario Filter/Sort (UX-010)
 * Provides filtering and sorting capabilities for the scenario library.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Filter Engine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * @typedef {object} FilterCriteria
 * @property {string} [searchText] - free text search on name/description
 * @property {string} [vertical] - filter by vertical (eco, tech, fashion, etc.)
 * @property {string} [dateRange] - 'today'|'week'|'month'|'all'
 * @property {[number, number]} [profitRange] - [min, max] profit
 * @property {[number, number]} [iterationRange] - [min, max] iterations
 * @property {string} [sortBy] - property to sort by
 * @property {string} [sortDir] - 'asc' | 'desc'
 */

/**
 * Filter and sort scenarios.
 * @param {object[]} scenarios - list of saved scenarios
 * @param {FilterCriteria} criteria
 * @returns {object[]} filtered + sorted scenarios
 */
export function filterScenarios(scenarios, criteria = {}) {
    let result = [...scenarios];

    // Text search
    if (criteria.searchText) {
        const q = criteria.searchText.toLowerCase();
        result = result.filter(s =>
            (s.name || '').toLowerCase().includes(q) ||
            (s.description || '').toLowerCase().includes(q) ||
            (s.vertical || '').toLowerCase().includes(q)
        );
    }

    // Vertical filter
    if (criteria.vertical && criteria.vertical !== 'all') {
        result = result.filter(s => (s.vertical || '').toLowerCase() === criteria.vertical.toLowerCase());
    }

    // Date range
    if (criteria.dateRange && criteria.dateRange !== 'all') {
        const now = Date.now();
        const ranges = {
            today: 24 * 60 * 60 * 1000,
            week: 7 * 24 * 60 * 60 * 1000,
            month: 30 * 24 * 60 * 60 * 1000,
        };
        const maxAge = ranges[criteria.dateRange] || Infinity;
        result = result.filter(s => now - new Date(s.timestamp || 0).getTime() <= maxAge);
    }

    // Profit range
    if (criteria.profitRange) {
        const [min, max] = criteria.profitRange;
        result = result.filter(s => {
            const p = s.results?.profit?.mean ?? s.profit ?? 0;
            return p >= min && p <= max;
        });
    }

    // Iteration range
    if (criteria.iterationRange) {
        const [min, max] = criteria.iterationRange;
        result = result.filter(s => {
            const it = s.config?.iterations ?? s.iterations ?? 0;
            return it >= min && it <= max;
        });
    }

    // Sort
    const sortBy = criteria.sortBy || 'timestamp';
    const sortDir = criteria.sortDir === 'asc' ? 1 : -1;

    result.sort((a, b) => {
        let va = getSortValue(a, sortBy);
        let vb = getSortValue(b, sortBy);
        if (typeof va === 'string') return va.localeCompare(vb) * sortDir;
        return ((va || 0) - (vb || 0)) * sortDir;
    });

    return result;
}

function getSortValue(scenario, key) {
    switch (key) {
        case 'name': return scenario.name || '';
        case 'timestamp': return new Date(scenario.timestamp || 0).getTime();
        case 'profit': return scenario.results?.profit?.mean ?? scenario.profit ?? 0;
        case 'revenue': return scenario.results?.revenue?.mean ?? scenario.revenue ?? 0;
        case 'iterations': return scenario.config?.iterations ?? scenario.iterations ?? 0;
        case 'vertical': return scenario.vertical || '';
        default: return scenario[key] ?? 0;
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Filter UI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Render filter bar for scenario library.
 * @param {HTMLElement} container
 * @param {Function} onChange - (criteria: FilterCriteria) => void
 */
export function renderFilterBar(container, onChange) {
    if (!container) return;

    container.innerHTML = `
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:16px;">
            <input id="filter-search" type="text" placeholder="🔍 Buscar escenario…"
                style="flex:1; min-width:200px; padding:8px 12px; border-radius:6px; background:var(--bg-surface, #131332);
                border:1px solid var(--border-subtle, #2a2a4a); color:var(--text-primary); font-size:13px;" />

            <select id="filter-vertical" style="padding:8px 12px; border-radius:6px; background:var(--bg-surface, #131332);
                border:1px solid var(--border-subtle, #2a2a4a); color:var(--text-primary); font-size:13px;">
                <option value="all">Todos los verticales</option>
                <option value="eco">🌿 EcoSense</option>
                <option value="tech">💻 Tech</option>
                <option value="fashion">👗 Fashion</option>
                <option value="food">🍕 Food</option>
                <option value="health">💊 Health</option>
            </select>

            <select id="filter-date" style="padding:8px 12px; border-radius:6px; background:var(--bg-surface, #131332);
                border:1px solid var(--border-subtle, #2a2a4a); color:var(--text-primary); font-size:13px;">
                <option value="all">Todo el tiempo</option>
                <option value="today">Hoy</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mes</option>
            </select>

            <select id="filter-sort" style="padding:8px 12px; border-radius:6px; background:var(--bg-surface, #131332);
                border:1px solid var(--border-subtle, #2a2a4a); color:var(--text-primary); font-size:13px;">
                <option value="timestamp:desc">Más recientes</option>
                <option value="timestamp:asc">Más antiguos</option>
                <option value="profit:desc">Mayor beneficio</option>
                <option value="revenue:desc">Mayor ingreso</option>
                <option value="name:asc">Nombre A-Z</option>
            </select>
        </div>
    `;

    const emit = () => {
        const sortVal = container.querySelector('#filter-sort').value.split(':');
        onChange({
            searchText: container.querySelector('#filter-search').value,
            vertical: container.querySelector('#filter-vertical').value,
            dateRange: container.querySelector('#filter-date').value,
            sortBy: sortVal[0],
            sortDir: sortVal[1],
        });
    };

    container.querySelector('#filter-search').addEventListener('input', debounce(emit, 300));
    container.querySelector('#filter-vertical').addEventListener('change', emit);
    container.querySelector('#filter-date').addEventListener('change', emit);
    container.querySelector('#filter-sort').addEventListener('change', emit);
}

function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}
