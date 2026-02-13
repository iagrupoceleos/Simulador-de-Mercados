/**
 * Prometheus Engine – Toast Notification System (UX-002)
 * Non-blocking, auto-dismissing notifications for the UI.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Toast Types & Config
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TOAST_CONFIG = {
    success: { icon: '✅', color: 'var(--accent-emerald)', duration: 3000 },
    error: { icon: '❌', color: 'var(--accent-rose)', duration: 5000 },
    warning: { icon: '⚠️', color: 'var(--accent-amber)', duration: 4000 },
    info: { icon: 'ℹ️', color: 'var(--accent-cyan)', duration: 3000 },
    scout: { icon: '🔬', color: 'var(--accent-violet)', duration: 6000 },
};

let container = null;
let toastId = 0;

function ensureContainer() {
    if (container && document.body.contains(container)) return container;
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
        position: fixed;
        top: var(--space-4, 16px);
        right: var(--space-4, 16px);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: var(--space-2, 8px);
        pointer-events: none;
        max-width: 420px;
    `;
    document.body.appendChild(container);
    return container;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Toast API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Show a toast notification.
 * @param {string} message - The text to display
 * @param {'success'|'error'|'warning'|'info'|'scout'} [type='info'] - toast type
 * @param {object} [options]
 * @param {number} [options.duration] - auto-dismiss ms (0 = manual dismiss only)
 * @param {string} [options.action] - optional action button label
 * @param {Function} [options.onAction] - action button callback
 * @returns {number} toast id (for manual dismiss)
 */
export function toast(message, type = 'info', options = {}) {
    const cfg = TOAST_CONFIG[type] || TOAST_CONFIG.info;
    const duration = options.duration ?? cfg.duration;
    const id = ++toastId;

    ensureContainer();

    const el = document.createElement('div');
    el.dataset.toastId = String(id);
    el.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: var(--space-2, 8px);
        padding: var(--space-3, 12px) var(--space-4, 16px);
        background: var(--bg-card, #1a1a2e);
        border: 1px solid ${cfg.color};
        border-left: 4px solid ${cfg.color};
        border-radius: var(--radius-md, 8px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        font-size: var(--text-sm, 13px);
        color: var(--text-primary, #e5e5f0);
        pointer-events: auto;
        animation: toast-slide-in 0.3s ease-out;
        transition: opacity 0.3s, transform 0.3s;
        max-width: 100%;
    `;

    el.innerHTML = `
        <span style="font-size: 1.1rem; flex-shrink: 0; margin-top: 1px;">${cfg.icon}</span>
        <div style="flex: 1; line-height: 1.5;">
            <div>${message}</div>
            ${options.action ? `<button class="toast-action" style="
                margin-top: var(--space-1, 4px);
                padding: 2px 8px;
                font-size: var(--text-xs, 11px);
                border: 1px solid ${cfg.color};
                border-radius: var(--radius-sm, 4px);
                background: transparent;
                color: ${cfg.color};
                cursor: pointer;
                font-weight: var(--weight-semibold, 600);
            ">${options.action}</button>` : ''}
        </div>
        <button class="toast-close" style="
            background: none; border: none; color: var(--text-muted, #6b7280);
            cursor: pointer; font-size: 16px; padding: 0; line-height: 1; flex-shrink: 0;
        ">&times;</button>
    `;

    // Close button
    el.querySelector('.toast-close')?.addEventListener('click', () => dismissToast(id));

    // Action button
    if (options.action && options.onAction) {
        el.querySelector('.toast-action')?.addEventListener('click', () => {
            options.onAction();
            dismissToast(id);
        });
    }

    container.appendChild(el);

    // Auto-dismiss
    if (duration > 0) {
        setTimeout(() => dismissToast(id), duration);
    }

    // Inject animation keyframes once
    if (!document.getElementById('toast-keyframes')) {
        const style = document.createElement('style');
        style.id = 'toast-keyframes';
        style.textContent = `
            @keyframes toast-slide-in {
                from { transform: translateX(100%); opacity: 0; }
                to   { transform: translateX(0);    opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    return id;
}

/**
 * Dismiss a toast by id.
 * @param {number} id
 */
export function dismissToast(id) {
    const el = container?.querySelector(`[data-toast-id="${id}"]`);
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateX(100%)';
    setTimeout(() => el.remove(), 300);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Convenience Methods
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** @param {string} msg */ export const toastSuccess = (msg, opts) => toast(msg, 'success', opts);
/** @param {string} msg */ export const toastError = (msg, opts) => toast(msg, 'error', opts);
/** @param {string} msg */ export const toastWarning = (msg, opts) => toast(msg, 'warning', opts);
/** @param {string} msg */ export const toastInfo = (msg, opts) => toast(msg, 'info', opts);
/** @param {string} msg */ export const toastScout = (msg, opts) => toast(msg, 'scout', opts);
