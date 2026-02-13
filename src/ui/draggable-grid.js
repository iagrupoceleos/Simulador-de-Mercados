/**
 * Prometheus UI – Dashboard Customization (UX-008)
 * Draggable KPI cards with save/restore layout using localStorage.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Draggable Grid Manager
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STORAGE_KEY = 'prometheus_dashboard_layout';

/**
 * Initialize draggable KPI grid on a container.
 * @param {HTMLElement} container
 * @param {object[]} cards - { id, title, value, delta, icon }
 * @param {object} [options]
 */
export function initDraggableGrid(container, cards, options = {}) {
    if (!container) return;

    const { columns = 4, onReorder } = options;
    const savedOrder = loadLayout();
    const orderedCards = savedOrder && savedOrder.length === cards.length
        ? savedOrder.map(id => cards.find(c => c.id === id)).filter(Boolean)
        : cards;

    container.innerHTML = '';
    container.style.cssText = `
        display: grid;
        grid-template-columns: repeat(${columns}, 1fr);
        gap: 12px;
        min-height: 80px;
    `;

    let draggedEl = null;
    let draggedIndex = -1;

    orderedCards.forEach((card, i) => {
        const el = createCardElement(card);
        el.dataset.index = i;
        el.draggable = true;

        el.addEventListener('dragstart', (e) => {
            draggedEl = el;
            draggedIndex = parseInt(el.dataset.index);
            el.style.opacity = '0.4';
            e.dataTransfer.effectAllowed = 'move';
        });

        el.addEventListener('dragend', () => {
            draggedEl = null;
            el.style.opacity = '1';
            container.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('drag-over'));
        });

        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            el.classList.add('drag-over');
        });

        el.addEventListener('dragleave', () => {
            el.classList.remove('drag-over');
        });

        el.addEventListener('drop', (e) => {
            e.preventDefault();
            el.classList.remove('drag-over');
            const dropIndex = parseInt(el.dataset.index);

            if (draggedIndex !== dropIndex && draggedEl) {
                // Swap elements
                const parent = container;
                const children = [...parent.children];
                const temp = children[draggedIndex];
                children[draggedIndex] = children[dropIndex];
                children[dropIndex] = temp;

                parent.innerHTML = '';
                children.forEach((child, idx) => {
                    child.dataset.index = idx;
                    parent.appendChild(child);
                });

                // Save new order
                const newOrder = [...parent.children].map(c => c.dataset.cardId);
                saveLayout(newOrder);
                if (onReorder) onReorder(newOrder);
            }
        });

        container.appendChild(el);
    });

    // Inject drag-over styles
    injectDragStyles();
}

function createCardElement(card) {
    const el = document.createElement('div');
    el.className = 'kpi-card glass-card';
    el.dataset.cardId = card.id;
    el.style.cssText = `
        padding: 16px; border-radius: 10px; cursor: grab;
        transition: transform 0.2s, box-shadow 0.2s;
        user-select: none;
    `;

    const deltaColor = (card.delta || 0) >= 0 ? '#10b981' : '#ef4444';
    const deltaSymbol = (card.delta || 0) >= 0 ? '▲' : '▼';

    el.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:20px;">${card.icon || '📊'}</span>
            <span style="font-size:12px; color:${deltaColor}; font-weight:600;">
                ${deltaSymbol} ${Math.abs(card.delta || 0)}%
            </span>
        </div>
        <div style="font-size:22px; font-weight:700; color:var(--text-primary);">${card.value}</div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">${card.title}</div>
    `;

    return el;
}

function injectDragStyles() {
    if (document.getElementById('drag-styles')) return;
    const style = document.createElement('style');
    style.id = 'drag-styles';
    style.textContent = `
        .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .kpi-card:active { cursor: grabbing; }
        .kpi-card.drag-over { outline: 2px dashed var(--accent-cyan, #06b6d4); outline-offset: 2px; }
    `;
    document.head.appendChild(style);
}

function saveLayout(order) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)); } catch (_) { /* quota */ }
}

function loadLayout() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (_) { return null; }
}

/**
 * Reset dashboard layout to default.
 */
export function resetDashboardLayout() {
    localStorage.removeItem(STORAGE_KEY);
}
