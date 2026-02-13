/**
 * Prometheus UI – Simulation Control View
 */
export class SimulationView {
    constructor(state, onRunSimulation) {
        this.state = state;
        this.onRunSimulation = onRunSimulation;
    }

    render(container) {
        const s = this.state.simulation;
        const o = this.state.offer;
        const comps = this.state.competitors || [];
        const hasConfig = o.name && o.basePrice > 0;

        container.innerHTML = `
      <div class="anim-fade-in-up">
        <div class="section-header">
          <div>
            <h1 class="section-header__title">⚡ Motor de Wargaming</h1>
            <p class="section-header__subtitle">Ejecuta simulaciones Monte Carlo con agentes adversarios para cuantificar el riesgo de inventario</p>
          </div>
        </div>

        <!-- Pre-sim Summary -->
        <div class="grid grid--3" style="margin-bottom: var(--space-8);">
          <div class="kpi-card">
            <div class="kpi-card__label">Producto</div>
            <div class="kpi-card__value" style="font-size:var(--text-lg);">${o.name || '—'}</div>
            <div class="kpi-card__sub">Precio: €${o.basePrice} | COGS: €${o.cogs}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__label">Competidores</div>
            <div class="kpi-card__value">${comps.length}</div>
            <div class="kpi-card__sub">${comps.map(c => c.name).join(', ') || 'Ninguno'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__label">Configuración</div>
            <div class="kpi-card__value" style="font-size:var(--text-lg);">${s.iterations} iter.</div>
            <div class="kpi-card__sub">${s.timeHorizonWeeks} semanas | ${this.state.population?.totalCustomers ?? 5000} agentes</div>
          </div>
        </div>

        <!-- Simulation Parameters Summary -->
        <div class="glass-card glass-card--static" style="margin-bottom: var(--space-6);">
          <h3 style="font-size: var(--text-base); font-weight: var(--weight-semibold); margin-bottom: var(--space-5); color: var(--accent-cyan);">
            📋 Resumen de Configuración
          </h3>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Parámetro</th>
                  <th>Valor</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Inventario Inicial</td>
                  <td style="font-family:var(--font-mono); color:var(--accent-cyan);">${(s.initialInventory ?? 45000).toLocaleString()} uds</td>
                  <td>Unidades en stock para el lanzamiento</td>
                </tr>
                <tr>
                  <td>Iteraciones Monte Carlo</td>
                  <td style="font-family:var(--font-mono); color:var(--accent-cyan);">${(s.iterations ?? 500).toLocaleString()}</td>
                  <td>Escenarios de simulación en paralelo</td>
                </tr>
                <tr>
                  <td>Horizonte Temporal</td>
                  <td style="font-family:var(--font-mono); color:var(--accent-cyan);">${s.timeHorizonWeeks ?? 26} semanas</td>
                  <td>Período de proyección simulado</td>
                </tr>
                <tr>
                  <td>Población de Agentes</td>
                  <td style="font-family:var(--font-mono); color:var(--accent-cyan);">${(this.state.population?.totalCustomers ?? 5000).toLocaleString()}</td>
                  <td>Clientes heterogéneos simulados (ABM)</td>
                </tr>
                <tr>
                  <td>Agentes Adversarios</td>
                  <td style="font-family:var(--font-mono); color:var(--accent-cyan);">${comps.length}</td>
                  <td>Competidores con IA (Reglas / ML / RL)</td>
                </tr>
                <tr>
                  <td>Margen Bruto Base</td>
                  <td style="font-family:var(--font-mono); color:var(--accent-emerald);">${((1 - o.cogs / o.basePrice) * 100).toFixed(1)}%</td>
                  <td>Antes de marketing y gastos operativos</td>
                </tr>
                <tr>
                  <td>Inversión Total Estimada</td>
                  <td style="font-family:var(--font-mono); color:var(--accent-amber);">€${((s.initialInventory ?? 45000) * o.cogs + o.marketingBudget).toLocaleString()}</td>
                  <td>Inventario (COGS) + Marketing</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Danger Zone: Warnings -->
        ${!hasConfig ? `
          <div style="padding: var(--space-5); background: var(--accent-rose-dim); border: 1px solid rgba(255,83,112,0.3); border-radius: var(--radius-md); margin-bottom: var(--space-6);">
            <div style="font-weight: var(--weight-semibold); color: var(--accent-rose); margin-bottom: var(--space-2);">⚠️ Configuración Incompleta</div>
            <div style="font-size: var(--text-sm); color: var(--text-secondary);">Configura el producto y al menos los parámetros básicos antes de ejecutar la simulación.</div>
          </div>
        ` : ''}

        <!-- Run Button -->
        <div style="text-align: center; padding: var(--space-8) 0;">
          <button id="btn-run-simulation" class="btn btn--primary btn--lg" ${!hasConfig ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
            🚀 Ejecutar Simulación Adversaria
          </button>
          <p style="font-size: var(--text-sm); color: var(--text-muted); margin-top: var(--space-3);">
            Se ejecutarán ${(s.iterations ?? 500).toLocaleString()} simulaciones Monte Carlo con ${comps.length} agentes adversarios
          </p>
        </div>
      </div>
    `;

        container.querySelector('#btn-run-simulation')?.addEventListener('click', () => {
            if (hasConfig) this.onRunSimulation();
        });
    }
}
