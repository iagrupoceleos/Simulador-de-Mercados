/**
 * Prometheus UI – Responsive Breakpoints (UX-001)
 * CSS-in-JS responsive utilities and media query helpers.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Breakpoint Definitions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const BREAKPOINTS = {
    xs: 320,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
};

const RESPONSIVE_CSS = `
/* ━━ Responsive Breakpoints (UX-001) ━━ */

/* Mobile first: stack sidebar below on small screens */
@media (max-width: 768px) {
    .app-layout {
        grid-template-columns: 1fr !important;
        grid-template-rows: auto 1fr auto !important;
    }

    .sidebar {
        position: fixed !important;
        bottom: 0; left: 0; right: 0;
        height: auto !important;
        width: 100% !important;
        z-index: 100;
        flex-direction: row !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        border-top: 1px solid var(--border-subtle) !important;
        border-right: none !important;
        padding: 8px !important;
    }

    .sidebar .nav-item {
        flex-direction: column;
        font-size: 10px;
        padding: 6px 10px !important;
        min-width: auto;
    }

    .sidebar .nav-item .nav-label {
        display: block;
        font-size: 9px;
        margin-top: 2px;
    }

    .main-content {
        padding: 12px !important;
        padding-bottom: 80px !important; /* space for bottom nav */
    }

    /* Stack KPI cards */
    .kpi-grid {
        grid-template-columns: 1fr 1fr !important;
        gap: 8px !important;
    }

    /* Stack charts vertically */
    .charts-grid {
        grid-template-columns: 1fr !important;
    }

    /* Adjustments for form inputs */
    .config-form .form-row {
        grid-template-columns: 1fr !important;
    }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
    .app-layout {
        grid-template-columns: 60px 1fr !important;
    }

    .sidebar .nav-label {
        display: none;
    }

    .sidebar .nav-item {
        justify-content: center;
        padding: 12px !important;
    }

    .kpi-grid {
        grid-template-columns: repeat(3, 1fr) !important;
    }
}

/* Large desktop */
@media (min-width: 1536px) {
    .main-content {
        max-width: 1400px;
        margin: 0 auto;
    }

    .kpi-grid {
        grid-template-columns: repeat(6, 1fr) !important;
    }
}

/* Print styles */
@media print {
    .sidebar, .sim-overlay, .toast-container, #cmd-palette, #cmd-backdrop,
    #shortcuts-help, #theme-toggle, button { display: none !important; }
    .main-content { padding: 0 !important; }
    .app-layout { display: block !important; }
    * { color: black !important; background: white !important; }
}
`;

let injected = false;

/**
 * Inject responsive CSS into the document.
 */
export function initResponsive() {
    if (injected) return;
    injected = true;

    const style = document.createElement('style');
    style.id = 'responsive-breakpoints';
    style.textContent = RESPONSIVE_CSS;
    document.head.appendChild(style);

    // Add viewport meta if missing
    if (!document.querySelector('meta[name="viewport"]')) {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0';
        document.head.appendChild(meta);
    }
}

/**
 * Check current breakpoint.
 * @returns {string} current breakpoint name
 */
export function getCurrentBreakpoint() {
    const w = window.innerWidth;
    if (w < BREAKPOINTS.sm) return 'xs';
    if (w < BREAKPOINTS.md) return 'sm';
    if (w < BREAKPOINTS.lg) return 'md';
    if (w < BREAKPOINTS.xl) return 'lg';
    if (w < BREAKPOINTS['2xl']) return 'xl';
    return '2xl';
}

/**
 * Listen for breakpoint changes.
 * @param {Function} callback - (breakpoint: string) => void
 * @returns {Function} cleanup
 */
export function onBreakpointChange(callback) {
    let current = getCurrentBreakpoint();
    const handler = () => {
        const next = getCurrentBreakpoint();
        if (next !== current) {
            current = next;
            callback(next);
        }
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
}
