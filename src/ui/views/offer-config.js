/**
 * Prometheus UI – Offer Configuration View
 */
import { escapeHTML } from '../../utils/sanitize.js';
export class OfferConfigView {
  constructor(state) {
    this.state = state;
  }

  render(container) {
    const o = this.state.offer;
    const safeName = escapeHTML(o.name);
    container.innerHTML = `
      <div class="anim-fade-in-up">
        <div class="section-header">
          <div>
            <h1 class="section-header__title">📦 Configuración de Nueva Oferta</h1>
            <p class="section-header__subtitle">Define los parámetros del producto o servicio a lanzar en el mercado</p>
          </div>
          <button id="btn-load-ecosense" class="btn btn--secondary">
            🔥 Cargar Demo EcoSense
          </button>
        </div>

        <div class="glass-card glass-card--static" style="margin-bottom: var(--space-6);">
          <h3 style="font-size: var(--text-base); font-weight: var(--weight-semibold); margin-bottom: var(--space-5); color: var(--accent-cyan);">
            ℹ️ Datos del Producto
          </h3>
          <div class="form-grid">
            <div class="input-group">
              <label class="input-group__label">Nombre del Producto</label>
              <input id="offer-name" class="input" type="text" value="${safeName}" placeholder="Ej: EcoSense Sensor" />
            </div>
            <div class="input-group">
              <label class="input-group__label">Categoría</label>
              <select id="offer-vertical" class="select">
                <option value="electronics" ${o.vertical === 'electronics' ? 'selected' : ''}>Electrónica de Consumo</option>
                <option value="fashion" ${o.vertical === 'fashion' ? 'selected' : ''}>Moda y Accesorios</option>
                <option value="food" ${o.vertical === 'food' ? 'selected' : ''}>Alimentación y Bebidas</option>
              </select>
            </div>
          </div>
        </div>

        <div class="grid grid--2" style="margin-bottom: var(--space-6);">
          <div class="glass-card glass-card--static">
            <h3 style="font-size: var(--text-base); font-weight: var(--weight-semibold); margin-bottom: var(--space-5); color: var(--accent-emerald);">
              💰 Pricing & Costes
            </h3>
            <div class="form-grid">
              <div class="input-group">
                <label class="input-group__label">Precio Base (€)</label>
                <div class="input-unit">
                  <input id="offer-price" class="input" type="number" value="${o.basePrice}" min="1" step="0.01" />
                  <span class="input-unit__suffix">€</span>
                </div>
              </div>
              <div class="input-group">
                <label class="input-group__label">COGS por Unidad (€)</label>
                <div class="input-unit">
                  <input id="offer-cogs" class="input" type="number" value="${o.cogs}" min="0" step="0.01" />
                  <span class="input-unit__suffix">€</span>
                </div>
                <span class="input-group__hint">Margen bruto: ${((1 - o.cogs / o.basePrice) * 100).toFixed(1)}%</span>
              </div>
              <div class="input-group">
                <label class="input-group__label">Precio Suscripción (€/mes)</label>
                <div class="input-unit">
                  <input id="offer-sub-price" class="input" type="number" value="${o.subscriptionPrice ?? 0}" min="0" step="0.01" />
                  <span class="input-unit__suffix">€/m</span>
                </div>
              </div>
              <div class="input-group">
                <label class="input-group__label">Coste Suscripción (€/mes)</label>
                <div class="input-unit">
                  <input id="offer-sub-cost" class="input" type="number" value="${o.subscriptionCost ?? 0}" min="0" step="0.01" />
                  <span class="input-unit__suffix">€/m</span>
                </div>
              </div>
            </div>
          </div>

          <div class="glass-card glass-card--static">
            <h3 style="font-size: var(--text-base); font-weight: var(--weight-semibold); margin-bottom: var(--space-5); color: var(--accent-amber);">
              📢 Marketing & Distribución
            </h3>
            <div class="form-grid">
              <div class="input-group">
                <label class="input-group__label">Presupuesto Marketing (€)</label>
                <div class="input-unit">
                  <input id="offer-marketing" class="input" type="number" value="${o.marketingBudget}" min="0" step="1000" />
                  <span class="input-unit__suffix">€</span>
                </div>
                <span class="input-group__hint">Para el primer trimestre de lanzamiento</span>
              </div>
              <div class="input-group">
                <label class="input-group__label">Índice de Calidad (0-1)</label>
                <div style="display:flex; align-items:center; gap:var(--space-3);">
                  <input id="offer-quality" class="range-slider" type="range" min="0" max="1" step="0.05" value="${o.qualityIndex}" />
                  <span id="offer-quality-val" style="font-family: var(--font-mono); font-size: var(--text-sm); color: var(--accent-cyan); min-width: 36px;">${o.qualityIndex}</span>
                </div>
              </div>
              <div class="input-group" style="grid-column: 1 / -1;">
                <label class="input-group__label">Canales de Venta</label>
                <div class="flex gap-3" style="flex-wrap:wrap;">
                  ${['online', 'marketplace', 'retail'].map(ch => `
                    <label class="chip ${o.channels?.includes(ch) ? '' : 'chip--removable'}" style="cursor:pointer; ${o.channels?.includes(ch) ? 'border-color: var(--accent-cyan); color: var(--accent-cyan);' : ''}">
                      <input type="checkbox" class="sr-only channel-check" value="${ch}" ${o.channels?.includes(ch) ? 'checked' : ''} />
                      ${ch === 'online' ? '🌐' : ch === 'marketplace' ? '🏪' : '🏬'} ${ch.charAt(0).toUpperCase() + ch.slice(1)}
                    </label>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-card glass-card--static">
          <h3 style="font-size: var(--text-base); font-weight: var(--weight-semibold); margin-bottom: var(--space-5); color: var(--accent-violet);">
            🎯 Simulación
          </h3>
          <div class="form-grid">
            <div class="input-group">
              <label class="input-group__label">Inventario Inicial (unidades)</label>
              <div class="input-unit">
                <input id="offer-inventory" class="input" type="number" value="${this.state.simulation?.initialInventory ?? 45000}" min="100" step="100" />
                <span class="input-unit__suffix">uds</span>
              </div>
            </div>
            <div class="input-group">
              <label class="input-group__label">Iteraciones Monte Carlo</label>
              <div class="input-unit">
                <input id="offer-iterations" class="input" type="number" value="${this.state.simulation?.iterations ?? 500}" min="50" max="50000" step="50" />
                <span class="input-unit__suffix">runs</span>
              </div>
              <span class="input-group__hint">Más iteraciones = mayor precisión (recomendado: 500-1000)</span>
            </div>
            <div class="input-group">
              <label class="input-group__label">Horizonte Temporal (semanas)</label>
              <div class="input-unit">
                <input id="offer-horizon" class="input" type="number" value="${this.state.simulation?.timeHorizonWeeks ?? 26}" min="4" max="104" step="1" />
                <span class="input-unit__suffix">sem</span>
              </div>
            </div>
            <div class="input-group">
              <label class="input-group__label">Clientes en Población</label>
              <div class="input-unit">
                <input id="offer-customers" class="input" type="number" value="${this.state.population?.totalCustomers ?? 5000}" min="100" max="50000" step="100" />
                <span class="input-unit__suffix">agentes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this._bindEvents(container);
  }

  _bindEvents(container) {
    const bind = (id, key, parse = parseFloat) => {
      const el = container.querySelector(`#${id}`);
      if (el) el.addEventListener('input', () => {
        const val = parse(el.value);
        if (!isNaN(val)) this.state.offer[key] = val;
        // Update margin hint
        if (key === 'basePrice' || key === 'cogs') {
          const hint = container.querySelector('#offer-cogs')?.closest('.input-group')?.querySelector('.input-group__hint');
          if (hint) hint.textContent = `Margen bruto: ${((1 - this.state.offer.cogs / this.state.offer.basePrice) * 100).toFixed(1)}%`;
        }
      });
    };

    bind('offer-name', 'name', v => v);
    bind('offer-price', 'basePrice');
    bind('offer-cogs', 'cogs');
    bind('offer-sub-price', 'subscriptionPrice');
    bind('offer-sub-cost', 'subscriptionCost');
    bind('offer-marketing', 'marketingBudget');

    // Quality slider
    const slider = container.querySelector('#offer-quality');
    const valDisplay = container.querySelector('#offer-quality-val');
    if (slider) slider.addEventListener('input', () => {
      this.state.offer.qualityIndex = parseFloat(slider.value);
      if (valDisplay) valDisplay.textContent = slider.value;
    });

    // Vertical
    const verticalSel = container.querySelector('#offer-vertical');
    if (verticalSel) verticalSel.addEventListener('change', () => {
      this.state.offer.vertical = verticalSel.value;
    });

    // Channels
    container.querySelectorAll('.channel-check').forEach(ch => {
      ch.addEventListener('change', () => {
        const checked = [...container.querySelectorAll('.channel-check:checked')].map(c => c.value);
        this.state.offer.channels = checked;
        this.render(container); // re-render to update visual
      });
    });

    // Simulation params
    const simBind = (id, key) => {
      const el = container.querySelector(`#${id}`);
      if (el) el.addEventListener('input', () => {
        this.state.simulation[key] = parseInt(el.value) || 0;
      });
    };
    simBind('offer-inventory', 'initialInventory');
    simBind('offer-iterations', 'iterations');
    simBind('offer-horizon', 'timeHorizonWeeks');
    simBind('offer-customers', 'totalCustomers');
    if (container.querySelector('#offer-customers')) {
      container.querySelector('#offer-customers').addEventListener('input', (e) => {
        this.state.population.totalCustomers = parseInt(e.target.value) || 5000;
      });
    }

    // Load EcoSense demo
    container.querySelector('#btn-load-ecosense')?.addEventListener('click', () => {
      this.state.loadEcoSense();
      this.render(container);
    });
  }
}
