/**
 * Prometheus UI – Keyboard Navigation (UX-003)
 * Global keyboard shortcuts for the application.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Keyboard Shortcuts Registry
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const shortcuts = [];
let isInitialized = false;

/**
 * Register a keyboard shortcut.
 * @param {object} opts
 * @param {string} opts.key - key to match (e.g. 'k', 'Escape')
 * @param {boolean} [opts.ctrl=false]
 * @param {boolean} [opts.shift=false]
 * @param {boolean} [opts.alt=false]
 * @param {string} opts.description - human-readable description
 * @param {Function} opts.handler - callback
 */
export function registerShortcut(opts) {
    shortcuts.push({
        key: opts.key.toLowerCase(),
        ctrl: opts.ctrl || false,
        shift: opts.shift || false,
        alt: opts.alt || false,
        description: opts.description,
        handler: opts.handler,
    });
}

/**
 * Initialize the keyboard listener.
 * Call once at app startup.
 */
export function initKeyboardNav() {
    if (isInitialized) return;
    isInitialized = true;

    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in inputs
        const tag = e.target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        for (const s of shortcuts) {
            if (e.key.toLowerCase() === s.key &&
                e.ctrlKey === s.ctrl &&
                e.shiftKey === s.shift &&
                e.altKey === s.alt) {
                e.preventDefault();
                s.handler(e);
                return;
            }
        }
    });
}

/**
 * Setup default Prometheus shortcuts.
 * @param {Function} navigate - navigation callback (viewName) => void
 * @param {Function} [onRunSim] - run simulation callback
 */
export function setupDefaultShortcuts(navigate, onRunSim) {
    // Alt+1-6 for view navigation
    const views = [
        { key: '1', view: 'offer-config', desc: 'Configuración de Oferta' },
        { key: '2', view: 'market-config', desc: 'Configuración de Mercado' },
        { key: '3', view: 'vertical-packs', desc: 'Packs Verticales' },
        { key: '4', view: 'simulation', desc: 'Simulación' },
        { key: '5', view: 'results', desc: 'Resultados' },
        { key: '6', view: 'scenarios', desc: 'Historial' },
    ];

    for (const v of views) {
        registerShortcut({
            key: v.key, alt: true,
            description: `Ir a ${v.desc}`,
            handler: () => navigate(v.view),
        });
    }

    // Ctrl+Enter to run simulation
    if (onRunSim) {
        registerShortcut({
            key: 'Enter', ctrl: true,
            description: 'Ejecutar simulación',
            handler: onRunSim,
        });
    }

    // Escape to close modals/overlays
    registerShortcut({
        key: 'Escape',
        description: 'Cerrar overlay/modal',
        handler: () => {
            const overlay = document.querySelector('.sim-overlay');
            if (overlay) overlay.style.display = 'none';
        },
    });

    // ? to show shortcuts help
    registerShortcut({
        key: '?', shift: true,
        description: 'Mostrar atajos de teclado',
        handler: () => showShortcutsHelp(),
    });
}

/**
 * Show a floating shortcuts help panel.
 */
function showShortcutsHelp() {
    const existing = document.getElementById('shortcuts-help');
    if (existing) { existing.remove(); return; }

    const el = document.createElement('div');
    el.id = 'shortcuts-help';
    el.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: var(--bg-card, #1a1a2e); border: 1px solid var(--border-subtle, #333);
        border-radius: var(--radius-lg, 12px); padding: 24px;
        z-index: 10001; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    `;

    el.innerHTML = `
        <h3 style="margin: 0 0 12px; color: var(--text-primary); font-size: 16px;">⌨️ Atajos de Teclado</h3>
        <div style="font-size: 13px; color: var(--text-secondary);">
            ${shortcuts.map(s => {
        const keys = [s.ctrl && 'Ctrl', s.alt && 'Alt', s.shift && 'Shift', s.key.toUpperCase()].filter(Boolean).join(' + ');
        return `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border-muted, #222);">
                    <span>${s.description}</span>
                    <kbd style="background: var(--bg-elevated); padding: 2px 8px; border-radius: 4px; font-size: 11px;">${keys}</kbd>
                </div>`;
    }).join('')}
        </div>
        <button onclick="this.parentElement.remove()" style="margin-top: 12px; padding: 6px 16px; background: var(--accent-cyan); color: white; border: none; border-radius: 6px; cursor: pointer;">Cerrar</button>
    `;

    document.body.appendChild(el);
}

/**
 * Get all registered shortcuts.
 * @returns {Array}
 */
export function getShortcuts() {
    return [...shortcuts];
}
