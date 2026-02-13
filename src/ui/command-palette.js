/**
 * Prometheus UI – Command Palette (UX-007)
 * Ctrl+K quick command launcher.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Command Registry
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const commands = [];

/**
 * Register a command for the palette.
 * @param {object} cmd
 * @param {string} cmd.id
 * @param {string} cmd.label - display label
 * @param {string} [cmd.icon='⚡']
 * @param {string} [cmd.category='General']
 * @param {Function} cmd.action - what to do when selected
 * @param {string[]} [cmd.keywords=[]] - search keywords
 */
export function registerCommand(cmd) {
    commands.push({
        id: cmd.id,
        label: cmd.label,
        icon: cmd.icon || '⚡',
        category: cmd.category || 'General',
        action: cmd.action,
        keywords: cmd.keywords || [],
    });
}

/**
 * Register default navigation and action commands.
 * @param {Function} navigate
 * @param {Function} [runSim]
 */
export function registerDefaultCommands(navigate, runSim) {
    const navCommands = [
        { id: 'go-offer', label: 'Ir a Configuración de Oferta', icon: '🏷️', view: 'offer-config' },
        { id: 'go-market', label: 'Ir a Configuración de Mercado', icon: '🏪', view: 'market-config' },
        { id: 'go-verticals', label: 'Ir a Packs Verticales', icon: '📦', view: 'vertical-packs' },
        { id: 'go-sim', label: 'Ir a Simulación', icon: '🎲', view: 'simulation' },
        { id: 'go-results', label: 'Ir a Resultados', icon: '📊', view: 'results' },
        { id: 'go-history', label: 'Ir a Historial', icon: '💾', view: 'scenarios' },
    ];

    for (const nav of navCommands) {
        registerCommand({
            id: nav.id,
            label: nav.label,
            icon: nav.icon,
            category: 'Navegación',
            action: () => navigate(nav.view),
            keywords: [nav.view],
        });
    }

    if (runSim) {
        registerCommand({
            id: 'run-simulation',
            label: 'Ejecutar Simulación Monte Carlo',
            icon: '🚀',
            category: 'Acciones',
            action: runSim,
            keywords: ['ejecutar', 'correr', 'monte carlo', 'simular'],
        });
    }

    registerCommand({
        id: 'toggle-theme',
        label: 'Cambiar Tema (Dark/Light)',
        icon: '🌓',
        category: 'Preferencias',
        action: () => {
            import('./theme.js').then(m => m.toggleTheme());
        },
        keywords: ['tema', 'oscuro', 'claro', 'dark', 'light'],
    });

    registerCommand({
        id: 'show-shortcuts',
        label: 'Mostrar Atajos de Teclado',
        icon: '⌨️',
        category: 'Ayuda',
        action: () => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', shiftKey: true }));
        },
        keywords: ['atajos', 'keyboard', 'shortcuts'],
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Palette UI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let paletteEl = null;

/**
 * Initialize the command palette (Ctrl+K listener).
 */
export function initCommandPalette() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            togglePalette();
        }
    });
}

function togglePalette() {
    if (paletteEl && document.body.contains(paletteEl)) {
        closePalette();
    } else {
        openPalette();
    }
}

function openPalette() {
    closePalette();

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'cmd-backdrop';
    backdrop.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.5);
        z-index: 10001; backdrop-filter: blur(4px);
    `;
    backdrop.addEventListener('click', closePalette);

    // Palette container
    paletteEl = document.createElement('div');
    paletteEl.id = 'cmd-palette';
    paletteEl.style.cssText = `
        position: fixed; top: 20%; left: 50%; transform: translateX(-50%);
        width: 90%; max-width: 520px;
        background: var(--bg-card, #1a1a2e);
        border: 1px solid var(--border-subtle, #2a2a4a);
        border-radius: var(--radius-lg, 12px);
        box-shadow: 0 20px 60px rgba(0,0,0,0.6);
        z-index: 10002; overflow: hidden;
    `;

    paletteEl.innerHTML = `
        <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-subtle);">
            <input id="cmd-input" type="text" placeholder="Buscar comando..."
                style="width: 100%; background: transparent; border: none; outline: none;
                       color: var(--text-primary); font-size: 16px; padding: 4px 0;" />
        </div>
        <div id="cmd-results" style="max-height: 360px; overflow-y: auto;"></div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(paletteEl);

    const input = paletteEl.querySelector('#cmd-input');
    const resultsEl = paletteEl.querySelector('#cmd-results');

    // Render initial commands
    renderResults(commands, resultsEl);

    // Filter on input
    input.addEventListener('input', () => {
        const query = input.value.toLowerCase();
        const filtered = commands.filter(c =>
            c.label.toLowerCase().includes(query) ||
            c.keywords.some(k => k.includes(query)) ||
            c.category.toLowerCase().includes(query),
        );
        renderResults(filtered, resultsEl);
    });

    // Escape to close
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePalette();
        if (e.key === 'Enter') {
            const first = resultsEl.querySelector('.cmd-item');
            if (first) first.click();
        }
    });

    input.focus();
}

function renderResults(items, container) {
    if (items.length === 0) {
        container.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted);">No se encontraron comandos</div>';
        return;
    }

    // Group by category
    const groups = {};
    for (const item of items) {
        if (!groups[item.category]) groups[item.category] = [];
        groups[item.category].push(item);
    }

    container.innerHTML = Object.entries(groups).map(([category, cmds]) => `
        <div style="padding: 4px 16px;">
            <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin: 8px 0 4px;">${category}</div>
            ${cmds.map(c => `
                <div class="cmd-item" data-cmd-id="${c.id}" style="
                    display: flex; align-items: center; gap: 12px; padding: 8px 12px;
                    border-radius: var(--radius-md, 8px); cursor: pointer;
                    transition: background 0.15s;
                " onmouseenter="this.style.background='var(--bg-elevated)'"
                   onmouseleave="this.style.background='transparent'">
                    <span style="font-size: 18px;">${c.icon}</span>
                    <span style="color: var(--text-primary); font-size: 14px;">${c.label}</span>
                </div>
            `).join('')}
        </div>
    `).join('');

    // Attach click handlers
    container.querySelectorAll('.cmd-item').forEach(el => {
        el.addEventListener('click', () => {
            const cmd = commands.find(c => c.id === el.dataset.cmdId);
            if (cmd) {
                closePalette();
                cmd.action();
            }
        });
    });
}

function closePalette() {
    document.getElementById('cmd-backdrop')?.remove();
    document.getElementById('cmd-palette')?.remove();
    paletteEl = null;
}
