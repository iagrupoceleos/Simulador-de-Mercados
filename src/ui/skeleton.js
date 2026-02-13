/**
 * Prometheus UI – Skeleton Loaders (UX-004)
 * Lightweight skeleton placeholders for the results dashboard.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Skeleton Components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SKELETON_STYLE = `
    @keyframes skeleton-shimmer {
        0% { background-position: -200px 0; }
        100% { background-position: calc(200px + 100%) 0; }
    }
    .skeleton {
        background: linear-gradient(90deg,
            var(--bg-elevated, #1e1e3a) 0%,
            var(--bg-card, #2a2a50) 40%,
            var(--bg-elevated, #1e1e3a) 80%
        );
        background-size: 200px 100%;
        animation: skeleton-shimmer 1.5s ease-in-out infinite;
        border-radius: var(--radius-md, 8px);
    }
    .skeleton-text {
        height: 14px;
        margin-bottom: 8px;
        border-radius: var(--radius-sm, 4px);
    }
    .skeleton-kpi {
        height: 48px;
        margin-bottom: 12px;
    }
    .skeleton-chart {
        height: 200px;
        margin-bottom: 16px;
    }
`;

let stylesInjected = false;

function injectSkeletonStyles() {
    if (stylesInjected) return;
    const style = document.createElement('style');
    style.id = 'skeleton-styles';
    style.textContent = SKELETON_STYLE;
    document.head.appendChild(style);
    stylesInjected = true;
}

/**
 * Generate a skeleton line (text placeholder).
 * @param {number} [width=100] - percentage width
 * @returns {string} HTML
 */
export function skeletonLine(width = 100) {
    injectSkeletonStyles();
    return `<div class="skeleton skeleton-text" style="width: ${width}%;"></div>`;
}

/**
 * Generate a skeleton KPI card.
 * @returns {string} HTML
 */
export function skeletonKPI() {
    injectSkeletonStyles();
    return `
        <div class="kpi-card" style="padding: var(--space-4, 16px);">
            ${skeletonLine(50)}
            <div class="skeleton skeleton-kpi"></div>
            ${skeletonLine(70)}
        </div>
    `;
}

/**
 * Generate a skeleton chart.
 * @returns {string} HTML
 */
export function skeletonChart() {
    injectSkeletonStyles();
    return `
        <div class="results-section" style="padding: var(--space-4, 16px);">
            ${skeletonLine(30)}
            <div class="skeleton skeleton-chart"></div>
        </div>
    `;
}

/**
 * Generate the full results dashboard skeleton.
 * @returns {string} HTML
 */
export function skeletonResultsDashboard() {
    injectSkeletonStyles();
    return `
        <div class="results-skeleton">
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-3, 12px); margin-bottom: var(--space-4, 16px);">
                ${skeletonKPI()}
                ${skeletonKPI()}
                ${skeletonKPI()}
                ${skeletonKPI()}
                ${skeletonKPI()}
                ${skeletonKPI()}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4, 16px);">
                ${skeletonChart()}
                ${skeletonChart()}
            </div>
            ${skeletonChart()}
        </div>
    `;
}
