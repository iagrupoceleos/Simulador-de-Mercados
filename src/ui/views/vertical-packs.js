/**
 * Prometheus UI – Vertical Packs Selector View
 */
import { VERTICALS } from '../../engine/verticals.js';

export class VerticalPacksView {
    constructor(state) {
        this.state = state;
    }

    render(container) {
        const activeVertical = this.state.offer?.vertical || 'electronics';

        container.innerHTML = `
      <div class="anim-fade-in-up">
        <div class="section-header">
          <div>
            <h1 class="section-header__title">🏭 Vertical Packs</h1>
            <p class="section-header__subtitle">Selecciona la vertical de la industria para ajustar modelos de demanda, comportamiento de agentes y factores de riesgo</p>
          </div>
        </div>

        <div class="grid grid--3 stagger">
          ${Object.values(VERTICALS).map(v => `
            <div class="glass-card anim-fade-in-up vertical-card ${activeVertical === v.id ? 'vertical-card--active' : ''}" data-vertical="${v.id}" style="cursor:pointer; ${activeVertical === v.id ? `border-color: ${v.color}; box-shadow: 0 0 20px ${v.color}22;` : ''}">
              <div style="text-align:center; margin-bottom: var(--space-4);">
                <span style="font-size: 3rem; display:block; margin-bottom: var(--space-3);">${v.icon}</span>
                <h3 style="font-size: var(--text-lg); font-weight: var(--weight-bold); color: ${activeVertical === v.id ? v.color : 'var(--text-primary)'};">${v.name}</h3>
                <p style="font-size: var(--text-sm); color: var(--text-secondary); margin-top: var(--space-2);">${v.description}</p>
              </div>

              ${activeVertical === v.id ? '<span class="badge badge--cyan" style="position:absolute; top:var(--space-3); right:var(--space-3);">ACTIVO</span>' : ''}

              <hr class="divider" />

              <div style="font-size: var(--text-xs); color: var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom: var(--space-3);">Segmentos de Clientes</div>
              <div class="flex flex--col gap-2">
                ${v.segments.map(s => `
                  <div class="flex flex--between" style="font-size: var(--text-sm); padding: var(--space-1) 0;">
                    <span style="color: var(--text-secondary);">${s.name.replace(/_/g, ' ')}</span>
                    <span style="font-family:var(--font-mono); color:${v.color};">${(s.weight * 100).toFixed(0)}%</span>
                  </div>
                `).join('')}
              </div>

              <hr class="divider" />

              <div style="font-size: var(--text-xs); color: var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom: var(--space-3);">Modelo de Demanda</div>
              <div class="grid grid--2 gap-2" style="font-size: var(--text-xs);">
                <div>
                  <span style="color:var(--text-muted);">Estacionalidad</span>
                  <div style="font-family:var(--font-mono); color:var(--text-primary);">${(v.demandModel.seasonalityAmplitude * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <span style="color:var(--text-muted);">Ciclo de Vida</span>
                  <div style="font-family:var(--font-mono); color:var(--text-primary);">${v.demandModel.productLifecycleWeeks} sem</div>
                </div>
                <div>
                  <span style="color:var(--text-muted);">Obsolescencia</span>
                  <div style="font-family:var(--font-mono); color:var(--text-primary);">${(v.demandModel.obsolescenceRate * 100).toFixed(1)}%/sem</div>
                </div>
                <div>
                  <span style="color:var(--text-muted);">Viralidad</span>
                  <div style="font-family:var(--font-mono); color:var(--text-primary);">${(v.demandModel.viralCoefficient * 100).toFixed(0)}%</div>
                </div>
              </div>

              <hr class="divider" />

              <div style="font-size: var(--text-xs); color: var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom: var(--space-3);">Factores de Riesgo</div>
              <div class="flex flex--col gap-2">
                ${Object.entries(v.riskFactors).map(([k, prob]) => `
                  <div class="flex flex--between" style="font-size: var(--text-sm);">
                    <span style="color: var(--text-secondary);">${k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</span>
                    <span class="badge badge--${prob > 0.1 ? 'rose' : 'amber'}">${(prob * 100).toFixed(0)}%</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

        // Bind click events
        container.querySelectorAll('.vertical-card').forEach(card => {
            card.addEventListener('click', () => {
                const verticalId = card.dataset.vertical;
                this.state.offer.vertical = verticalId;
                this.render(container);
            });
        });
    }
}
