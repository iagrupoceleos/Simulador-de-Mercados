/**
 * Prometheus UI – Theme Toggle (UX-006)
 * Dark/light theme with system preference detection and persistence.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Theme Definitions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const THEMES = {
    dark: {
        '--bg-app': '#0a0a1a',
        '--bg-sidebar': '#0f0f23',
        '--bg-card': '#1a1a2e',
        '--bg-elevated': '#1e1e3a',
        '--text-primary': '#e5e5f0',
        '--text-secondary': '#9ca3af',
        '--text-muted': '#6b7280',
        '--border-subtle': '#2a2a4a',
        '--border-muted': '#1f1f33',
    },
    light: {
        '--bg-app': '#f8f9fc',
        '--bg-sidebar': '#ffffff',
        '--bg-card': '#ffffff',
        '--bg-elevated': '#f1f5f9',
        '--text-primary': '#1a1a2e',
        '--text-secondary': '#475569',
        '--text-muted': '#94a3b8',
        '--border-subtle': '#e2e8f0',
        '--border-muted': '#f1f5f9',
    },
};

const STORAGE_KEY = 'prometheus-theme';

/**
 * Get current theme.
 * @returns {'dark'|'light'}
 */
export function getTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    // Fallback to system preference
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/**
 * Apply a theme to the document.
 * @param {'dark'|'light'} theme
 */
export function applyTheme(theme) {
    const vars = THEMES[theme] || THEMES.dark;
    const root = document.documentElement;

    for (const [prop, value] of Object.entries(vars)) {
        root.style.setProperty(prop, value);
    }

    root.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Toggle between dark and light theme.
 * @returns {'dark'|'light'} new theme
 */
export function toggleTheme() {
    const current = getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    return next;
}

/**
 * Initialize theme on page load.
 */
export function initTheme() {
    applyTheme(getTheme());

    // Listen for system preference changes
    window.matchMedia?.('(prefers-color-scheme: light)')
        .addEventListener('change', (e) => {
            if (!localStorage.getItem(STORAGE_KEY)) {
                applyTheme(e.matches ? 'light' : 'dark');
            }
        });
}

/**
 * Create a theme toggle button.
 * @returns {HTMLElement}
 */
export function createThemeToggle() {
    const btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.title = 'Cambiar tema';
    btn.style.cssText = `
        background: none; border: none; cursor: pointer;
        font-size: 20px; padding: 4px 8px;
        border-radius: var(--radius-md, 8px);
        transition: background 0.2s;
    `;
    btn.textContent = getTheme() === 'dark' ? '☀️' : '🌙';

    btn.addEventListener('click', () => {
        const newTheme = toggleTheme();
        btn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });

    btn.addEventListener('mouseenter', () => {
        btn.style.background = 'var(--bg-elevated)';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.background = 'none';
    });

    return btn;
}
