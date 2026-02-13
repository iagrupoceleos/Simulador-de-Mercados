/**
 * Prometheus Tech Scout – Guided Product Tour (SCOUT-007)
 * Lightweight onboarding tour without external dependencies.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Product Tour
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TOUR_CSS = `
.tour-overlay {
    position: fixed; inset: 0; z-index: 9998;
    background: rgba(0, 0, 0, 0.6);
    transition: opacity 0.3s;
}
.tour-spotlight {
    position: absolute; z-index: 9999;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
    border-radius: 8px;
    transition: all 0.4s ease;
}
.tour-tooltip {
    position: absolute; z-index: 10000;
    background: var(--bg-elevated, #1e1e3a);
    border: 1px solid var(--accent-cyan, #06b6d4);
    border-radius: 12px;
    padding: 20px;
    max-width: 360px;
    color: var(--text-primary, #fff);
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    animation: tourFadeIn 0.3s ease;
}
.tour-tooltip h3 { margin: 0 0 8px; font-size: 16px; color: var(--accent-cyan, #06b6d4); }
.tour-tooltip p { margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: var(--text-secondary, #a0aec0); }
.tour-tooltip .tour-actions { display: flex; justify-content: space-between; align-items: center; }
.tour-tooltip button {
    padding: 6px 16px; border-radius: 6px;
    border: none; cursor: pointer; font-size: 13px;
    transition: all 0.2s;
}
.tour-tooltip .tour-next {
    background: var(--accent-cyan, #06b6d4); color: white; font-weight: 600;
}
.tour-tooltip .tour-skip {
    background: transparent; color: var(--text-muted, #666);
}
.tour-tooltip .tour-progress {
    font-size: 12px; color: var(--text-muted, #666);
}
@keyframes tourFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
`;

let tourStyleInjected = false;

/**
 * @typedef {object} TourStep
 * @property {string} target - CSS selector for the target element
 * @property {string} title - step title
 * @property {string} content - step description
 * @property {string} [position='bottom'] - tooltip position (top|bottom|left|right)
 */

/**
 * Product tour engine.
 */
export class ProductTour {
    /**
     * @param {TourStep[]} steps
     * @param {object} [options]
     */
    constructor(steps, options = {}) {
        this.steps = steps;
        this.currentStep = 0;
        this.options = {
            onComplete: options.onComplete || (() => { }),
            onSkip: options.onSkip || (() => { }),
            storageKey: options.storageKey || 'prometheus-tour-completed',
        };
        this.overlay = null;
        this.spotlight = null;
        this.tooltip = null;
    }

    /**
     * Start the tour (skips if already completed).
     * @param {boolean} [force=false]
     */
    start(force = false) {
        if (!force && localStorage.getItem(this.options.storageKey)) return;

        if (!tourStyleInjected) {
            const style = document.createElement('style');
            style.textContent = TOUR_CSS;
            document.head.appendChild(style);
            tourStyleInjected = true;
        }

        this.currentStep = 0;
        this._createOverlay();
        this._showStep();
    }

    _createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'tour-overlay';
        document.body.appendChild(this.overlay);

        this.spotlight = document.createElement('div');
        this.spotlight.className = 'tour-spotlight';
        document.body.appendChild(this.spotlight);

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tour-tooltip';
        document.body.appendChild(this.tooltip);
    }

    _showStep() {
        const step = this.steps[this.currentStep];
        if (!step) { this.complete(); return; }

        const target = document.querySelector(step.target);
        if (!target) { this.next(); return; } // skip if target not found

        // Position spotlight
        const rect = target.getBoundingClientRect();
        const pad = 8;
        this.spotlight.style.left = `${rect.left - pad}px`;
        this.spotlight.style.top = `${rect.top - pad}px`;
        this.spotlight.style.width = `${rect.width + pad * 2}px`;
        this.spotlight.style.height = `${rect.height + pad * 2}px`;

        // Tooltip content
        this.tooltip.innerHTML = `
            <h3>${step.title}</h3>
            <p>${step.content}</p>
            <div class="tour-actions">
                <button class="tour-skip" onclick="this.closest('.tour-tooltip').__tour.skip()">Omitir</button>
                <span class="tour-progress">${this.currentStep + 1} / ${this.steps.length}</span>
                <button class="tour-next" onclick="this.closest('.tour-tooltip').__tour.next()">
                    ${this.currentStep < this.steps.length - 1 ? 'Siguiente →' : '✓ Finalizar'}
                </button>
            </div>
        `;
        this.tooltip.__tour = this;

        // Position tooltip
        const pos = step.position || 'bottom';
        const tooltipRect = this.tooltip.getBoundingClientRect();
        if (pos === 'bottom') {
            this.tooltip.style.left = `${rect.left}px`;
            this.tooltip.style.top = `${rect.bottom + 12}px`;
        } else if (pos === 'top') {
            this.tooltip.style.left = `${rect.left}px`;
            this.tooltip.style.top = `${rect.top - tooltipRect.height - 12}px`;
        } else if (pos === 'right') {
            this.tooltip.style.left = `${rect.right + 12}px`;
            this.tooltip.style.top = `${rect.top}px`;
        } else {
            this.tooltip.style.left = `${rect.left - tooltipRect.width - 12}px`;
            this.tooltip.style.top = `${rect.top}px`;
        }

        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    next() {
        this.currentStep++;
        if (this.currentStep >= this.steps.length) {
            this.complete();
        } else {
            this._showStep();
        }
    }

    skip() {
        this._cleanup();
        this.options.onSkip();
    }

    complete() {
        localStorage.setItem(this.options.storageKey, 'true');
        this._cleanup();
        this.options.onComplete();
    }

    _cleanup() {
        this.overlay?.remove();
        this.spotlight?.remove();
        this.tooltip?.remove();
    }
}

/**
 * Default Prometheus onboarding tour steps.
 */
export const PROMETHEUS_TOUR = [
    { target: '.sidebar', title: '📍 Navegación', content: 'Usa la barra lateral para cambiar entre vistas: configuración, simulación, resultados y más.', position: 'right' },
    { target: '[data-view="config"]', title: '⚙️ Configuración', content: 'Configura los parámetros de tu producto, mercado y competencia aquí.', position: 'right' },
    { target: '#btnRunSim', title: '🚀 Simulación', content: 'Ejecuta la simulación Monte Carlo. Usa Ctrl+Enter como atajo rápido.', position: 'bottom' },
    { target: '[data-view="results"]', title: '📊 Resultados', content: 'Visualiza KPIs, gráficos y análisis de riesgo de tu simulación.', position: 'right' },
    { target: '[data-view="whatif"]', title: '🔮 What-If', content: 'Experimenta con escenarios alternativos para ver el impacto en tus métricas.', position: 'right' },
];
