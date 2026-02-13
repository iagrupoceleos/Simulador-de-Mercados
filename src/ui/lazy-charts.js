/**
 * Prometheus UI – Lazy Chart Rendering (PERF-004)
 * Only render charts when they become visible in the viewport.
 * Uses IntersectionObserver for efficient lazy loading.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Lazy Chart Manager
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const pendingCharts = new Map();
let observer = null;

/**
 * Initialize the lazy chart observer.
 * @param {object} [options]
 */
export function initLazyCharts(options = {}) {
    if (observer) return;

    const { rootMargin = '200px', threshold = 0.1 } = options;

    observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                const id = entry.target.dataset.lazyChartId;
                const pending = pendingCharts.get(id);
                if (pending) {
                    pending.render(entry.target);
                    pendingCharts.delete(id);
                    observer.unobserve(entry.target);
                }
            }
        }
    }, { rootMargin, threshold });
}

/**
 * Register a chart for lazy rendering.
 * @param {HTMLElement} container - the chart container element
 * @param {Function} renderFn - (container) => void, called when visible
 * @param {string} [id] - unique chart ID
 */
export function registerLazyChart(container, renderFn, id) {
    if (!observer) initLazyCharts();

    const chartId = id || `chart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    container.dataset.lazyChartId = chartId;

    // Add a placeholder
    container.innerHTML = `
        <div style="
            display: flex; align-items: center; justify-content: center;
            height: 100%; min-height: 200px;
            color: var(--text-muted, #666); font-size: 13px;
        ">
            <span>📊 Cargando gráfico...</span>
        </div>
    `;

    pendingCharts.set(chartId, { render: renderFn });
    observer.observe(container);
}

/**
 * Force render all pending charts (e.g., for PDF export).
 */
export function renderAllPending() {
    for (const [id, pending] of pendingCharts) {
        const el = document.querySelector(`[data-lazy-chart-id="${id}"]`);
        if (el) {
            pending.render(el);
        }
    }
    pendingCharts.clear();
}

/**
 * Destroy the observer and clear state.
 */
export function destroyLazyCharts() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
    pendingCharts.clear();
}

/**
 * Get lazy chart stats.
 */
export function getLazyChartStats() {
    return {
        pending: pendingCharts.size,
        observerActive: observer !== null,
    };
}
