/**
 * Prometheus UI – Sidebar Navigation
 */
export class Sidebar {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.activeView = 'offer-config';
  }

  render(container) {
    container.innerHTML = `
      <div class="sidebar__brand">
        <div class="sidebar__logo">🔥</div>
        <div>
          <div class="sidebar__name">PROMETHEUS</div>
          <div class="sidebar__version">v1.0.0 – Engine</div>
        </div>
      </div>
      <nav class="sidebar__nav">
        <div class="sidebar__section-label">Configuración</div>
        <div class="nav-item ${this.activeView === 'offer-config' ? 'nav-item--active' : ''}" data-view="offer-config">
          <span class="nav-item__icon">📦</span>
          <span>Nueva Oferta</span>
        </div>
        <div class="nav-item ${this.activeView === 'market-config' ? 'nav-item--active' : ''}" data-view="market-config">
          <span class="nav-item__icon">🎯</span>
          <span>Mercado & NGC</span>
        </div>
        <div class="nav-item ${this.activeView === 'vertical-packs' ? 'nav-item--active' : ''}" data-view="vertical-packs">
          <span class="nav-item__icon">🏭</span>
          <span>Vertical Packs</span>
        </div>

        <div class="sidebar__section-label">Simulación</div>
        <div class="nav-item ${this.activeView === 'simulation' ? 'nav-item--active' : ''}" data-view="simulation">
          <span class="nav-item__icon">⚡</span>
          <span>Wargaming</span>
        </div>

        <div class="sidebar__section-label">Resultados</div>
        <div class="nav-item ${this.activeView === 'results' ? 'nav-item--active' : ''}" data-view="results">
          <span class="nav-item__icon">📊</span>
          <span>Dashboard</span>
          ${this.hasResults ? '<span class="nav-item__badge">NEW</span>' : ''}
        </div>
        <div class="nav-item ${this.activeView === 'scenarios' ? 'nav-item--active' : ''}" data-view="scenarios">
          <span class="nav-item__icon">💾</span>
          <span>Historial</span>
        </div>
      </nav>
      <div class="sidebar__footer">
        <div style="font-size: var(--text-xs); color: var(--text-muted); line-height: 1.6;">
          <div>Motor de Simulación Adversaria</div>
          <div>Inventario Cero – E-commerce</div>
          <div style="margin-top: var(--space-2); color: var(--accent-cyan);">⚡ Powered by AI</div>
        </div>
      </div>
    `;

    container.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        if (view) {
          this.activeView = view;
          this.render(container);
          this.onNavigate(view);
        }
      });
    });
  }

  setHasResults(val) {
    this.hasResults = val;
  }
}
