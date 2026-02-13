/**
 * Prometheus UI – Market Configuration / NGC Expert Interface
 */
export class MarketConfigView {
    constructor(state) {
        this.state = state;
    }

    render(container) {
        const competitors = this.state.competitors || [];
        container.innerHTML = `
      <div class="anim-fade-in-up">
        <div class="section-header">
          <div>
            <h1 class="section-header__title">🎯 Configuración de Mercado & NGC</h1>
            <p class="section-header__subtitle">Define competidores, suposiciones de expertos y distribuciones de incertidumbre</p>
          </div>
          <button id="btn-add-competitor" class="btn btn--primary btn--sm">+ Añadir Competidor</button>
        </div>

        <!-- Competitor Cards -->
        <div id="competitors-list" class="flex flex--col gap-6" style="margin-bottom: var(--space-8);">
          ${competitors.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state__icon">⚔️</div>
              <div class="empty-state__title">Sin competidores configurados</div>
              <div class="empty-state__desc">Añade competidores para simular un mercado adversario realista</div>
            </div>
          ` : competitors.map((c, idx) => this._renderCompetitor(c, idx)).join('')}
        </div>

        <!-- Risk Events -->
        <div class="glass-card glass-card--static" style="margin-bottom: var(--space-6);">
          <h3 style="font-size: var(--text-base); font-weight: var(--weight-semibold); margin-bottom: var(--space-5); color: var(--accent-rose);">
            ⚠️ Eventos de Riesgo Global
          </h3>
          <div id="risk-events-list">
            ${(this.state.riskEvents || []).map((r, i) => `
              <div class="flex gap-4" style="align-items:center; margin-bottom: var(--space-3); padding: var(--space-3); background: var(--bg-elevated); border-radius: var(--radius-md);">
                <span style="font-size: var(--text-sm); flex:1; color: var(--text-primary);">${r.description}</span>
                <span class="badge badge--rose">${(r.probability * 100).toFixed(0)}%</span>
                <span class="badge badge--amber">${r.category}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Macro Assumptions -->
        <div class="glass-card glass-card--static">
          <h3 style="font-size: var(--text-base); font-weight: var(--weight-semibold); margin-bottom: var(--space-5); color: var(--accent-violet);">
            🌍 Supuestos Macroeconómicos
          </h3>
          <div class="grid grid--2 gap-4">
            <div class="dist-preview">
              <div class="dist-preview__header">
                <span class="dist-preview__name">Crecimiento PIB</span>
                <span class="dist-preview__type">Normal</span>
              </div>
              <div class="dist-preview__stats"><span>μ: 2%</span><span>σ: 1%</span></div>
            </div>
            <div class="dist-preview">
              <div class="dist-preview__header">
                <span class="dist-preview__name">Confianza del Consumidor</span>
                <span class="dist-preview__type">Beta</span>
              </div>
              <div class="dist-preview__stats"><span>α: 8</span><span>β: 3</span></div>
            </div>
            <div class="dist-preview">
              <div class="dist-preview__header">
                <span class="dist-preview__name">Cambio Precio Energía</span>
                <span class="dist-preview__type">Normal</span>
              </div>
              <div class="dist-preview__stats"><span>μ: +5%</span><span>σ: 10%</span></div>
            </div>
            <div class="dist-preview">
              <div class="dist-preview__header">
                <span class="dist-preview__name">Tasa de Inflación</span>
                <span class="dist-preview__type">Normal Trunc.</span>
              </div>
              <div class="dist-preview__stats"><span>μ: 3%</span><span>rango: 1-8%</span></div>
            </div>
          </div>
        </div>
      </div>
    `;

        this._bindEvents(container);
    }

    _renderCompetitor(c, idx) {
        const typeLabels = { rule_based: 'Basado en Reglas', ml: 'ML Predictivo', rl: 'RL Adversarial' };
        const typeColors = { rule_based: 'amber', ml: 'violet', rl: 'rose' };

        return `
      <div class="glass-card glass-card--static competitor-card" data-idx="${idx}">
        <div class="flex flex--between" style="align-items:center; margin-bottom: var(--space-4);">
          <div class="flex gap-3" style="align-items:center;">
            <span style="font-size: 1.5rem;">⚔️</span>
            <div>
              <h4 style="font-size: var(--text-base); font-weight: var(--weight-bold); color: var(--text-primary);">${c.name}</h4>
              <span class="badge badge--${typeColors[c.type]}">${typeLabels[c.type]}</span>
            </div>
          </div>
          <button class="btn btn--ghost btn--sm btn-remove-comp" data-idx="${idx}">✕ Eliminar</button>
        </div>

        <div class="form-grid" style="margin-bottom: var(--space-4);">
          <div class="input-group">
            <label class="input-group__label">Nombre</label>
            <input class="input comp-name" type="text" value="${c.name}" data-idx="${idx}" />
          </div>
          <div class="input-group">
            <label class="input-group__label">Tipo de Agente</label>
            <select class="select comp-type" data-idx="${idx}">
              <option value="rule_based" ${c.type === 'rule_based' ? 'selected' : ''}>Basado en Reglas</option>
              <option value="ml" ${c.type === 'ml' ? 'selected' : ''}>ML Predictivo</option>
              <option value="rl" ${c.type === 'rl' ? 'selected' : ''}>RL Adversarial</option>
            </select>
          </div>
          <div class="input-group">
            <label class="input-group__label">Agresividad</label>
            <div style="display:flex; align-items:center; gap:var(--space-3);">
              <input class="range-slider comp-aggr" type="range" min="0" max="1" step="0.05" value="${c.aggressiveness}" data-idx="${idx}" />
              <span style="font-family:var(--font-mono); font-size: var(--text-sm); color: var(--accent-cyan); min-width:36px;">${c.aggressiveness}</span>
            </div>
          </div>
          <div class="input-group">
            <label class="input-group__label">Cuota de Mercado</label>
            <div style="display:flex; align-items:center; gap:var(--space-3);">
              <input class="range-slider comp-share" type="range" min="0" max="0.5" step="0.01" value="${c.marketShare}" data-idx="${idx}" />
              <span style="font-family:var(--font-mono); font-size: var(--text-sm); color: var(--accent-cyan); min-width:36px;">${(c.marketShare * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div class="input-group">
            <label class="input-group__label">Salud Financiera</label>
            <div style="display:flex; align-items:center; gap:var(--space-3);">
              <input class="range-slider comp-health" type="range" min="0" max="1" step="0.05" value="${c.financialHealth}" data-idx="${idx}" />
              <span style="font-family:var(--font-mono); font-size: var(--text-sm); color: var(--accent-cyan); min-width:36px;">${c.financialHealth}</span>
            </div>
          </div>
          <div class="input-group">
            <label class="input-group__label">Aversión al Riesgo</label>
            <div style="display:flex; align-items:center; gap:var(--space-3);">
              <input class="range-slider comp-risk" type="range" min="0" max="1" step="0.05" value="${c.constraints?.riskAversion ?? 0.5}" data-idx="${idx}" />
              <span style="font-family:var(--font-mono); font-size: var(--text-sm); color: var(--accent-cyan); min-width:36px;">${c.constraints?.riskAversion ?? 0.5}</span>
            </div>
          </div>
        </div>

        ${c.beliefs && c.beliefs.length > 0 ? `
          <div style="margin-top: var(--space-3);">
            <h5 style="font-size: var(--text-xs); text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin-bottom: var(--space-2);">Creencias de Expertos</h5>
            ${c.beliefs.map(b => `
              <div style="padding: var(--space-2) var(--space-3); background: var(--bg-surface); border-radius: var(--radius-sm); margin-bottom: var(--space-2); font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.5;">
                <span class="badge badge--violet" style="margin-right: var(--space-2);">${(b.probability * 100).toFixed(0)}%</span>
                ${b.description}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
    }

    _bindEvents(container) {
        // Add competitor
        container.querySelector('#btn-add-competitor')?.addEventListener('click', () => {
            this.state.competitors.push({
                id: `comp_${Date.now()}`,
                name: 'Nuevo Competidor',
                type: 'rule_based',
                aggressiveness: 0.5,
                financialHealth: 0.5,
                marketShare: 0.1,
                constraints: { minMargin: 0.15, maxMarketingBudget: 200000, maxPriceReduction: 0.25, riskAversion: 0.5 },
                beliefs: [],
            });
            this.render(container);
        });

        // Remove competitor
        container.querySelectorAll('.btn-remove-comp').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                this.state.competitors.splice(idx, 1);
                this.render(container);
            });
        });

        // Slider updates with live value display
        const sliderBind = (selector, field, format = v => v) => {
            container.querySelectorAll(selector).forEach(el => {
                el.addEventListener('input', () => {
                    const idx = parseInt(el.dataset.idx);
                    const val = parseFloat(el.value);
                    if (field.includes('.')) {
                        const [obj, key] = field.split('.');
                        this.state.competitors[idx][obj] = this.state.competitors[idx][obj] || {};
                        this.state.competitors[idx][obj][key] = val;
                    } else {
                        this.state.competitors[idx][field] = val;
                    }
                    const display = el.nextElementSibling;
                    if (display) display.textContent = format(val);
                });
            });
        };

        sliderBind('.comp-aggr', 'aggressiveness');
        sliderBind('.comp-share', 'marketShare', v => `${(v * 100).toFixed(0)}%`);
        sliderBind('.comp-health', 'financialHealth');
        sliderBind('.comp-risk', 'constraints.riskAversion');

        // Text/select updates
        container.querySelectorAll('.comp-name').forEach(el => {
            el.addEventListener('input', () => {
                this.state.competitors[parseInt(el.dataset.idx)].name = el.value;
            });
        });
        container.querySelectorAll('.comp-type').forEach(el => {
            el.addEventListener('change', () => {
                this.state.competitors[parseInt(el.dataset.idx)].type = el.value;
                this.render(container);
            });
        });
    }
}
